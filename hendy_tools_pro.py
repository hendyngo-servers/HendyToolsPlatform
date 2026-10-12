from __future__ import annotations

import getpass
import hashlib
import json
import os
import platform
import queue
import re
import shutil
import socket
import string
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import threading
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable
from tkinter import filedialog, messagebox

import customtkinter as ctk

try:
    import psutil
except ImportError:
    psutil = None

try:
    from send2trash import send2trash
except ImportError:
    send2trash = None

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False


APP_NAME = "Hendy Tools Pro"
APP_VERSION = "3.1.1"
APP_BUILD = 30101
# Replace with the actual Worker URL before publishing a production build.
UPDATE_SERVER_BASE_URL = os.environ.get("HENDY_UPDATE_BASE_URL", "https://hendy-update.example.workers.dev").rstrip("/")
SCOPES = ["https://www.googleapis.com/auth/drive.file"]
IS_WINDOWS = platform.system() == "Windows"
ARCHITECTURE = platform.machine() or "Unknown"
IS_64_BIT = "64" in ARCHITECTURE

# Premium dark palette. Layout is deliberately built from standard CustomTkinter widgets.
C = {
    "bg": "#0B1120",
    "sidebar": "#10192B",
    "panel": "#141F33",
    "panel_2": "#192740",
    "border": "#2A3954",
    "text": "#F0F5FF",
    "muted": "#9AAAC4",
    "primary": "#4F8CFF",
    "primary_hover": "#3676EF",
    "cyan": "#43D9D5",
    "green": "#35C98A",
    "orange": "#FFB454",
    "red": "#FF647C",
}

APP_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
USER_DATA_DIR = Path(os.environ.get("APPDATA", Path.home())) / "HendyToolsPro"
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
TOKEN_PATH = USER_DATA_DIR / "token.json"

# Map display names to WinGet package IDs. A few legacy names are intentionally mapped
# to current practical equivalents. Items without a reliable desktop package are explained.
WINGET_IDS = {
    "Chrome": "Google.Chrome",
    "Firefox": "Mozilla.Firefox",
    "Opera": "Opera.Opera",
    "Cốc Cốc": "CocCoc.CocCoc",
    "Java Runtime (Temurin 8)": "EclipseAdoptium.Temurin.8.JRE",
    "Java JDK 21": "Oracle.JDK.21",
    "Bitvise SSH": "Bitvise.SSHClient",
    "PuTTY": "PuTTY.PuTTY",
    "VC++ Runtime": "Microsoft.VCRedist.2015+.x64",
    "Proton VPN": "Proton.ProtonVPN",
    "VNC Viewer": "RealVNC.VNCViewer",
    "UniKey": "PhamKimLong.UniKey",
    "Notepad++": "Notepad++.Notepad++",
    "BlueStacks": "BlueStack.BlueStacks",
    "UltraViewer": "DucFabulous.UltraViewer",
    "XAMPP": "ApacheFriends.Xampp.8.2",
    "WinRAR": "RARLab.WinRAR",
}

PROTECTED_PROCESS_NAMES = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "services.exe", "lsass.exe", "svchost.exe", "winlogon.exe",
    "explorer.exe", "dwm.exe", "fontdrvhost.exe", "sihost.exe", "taskhostw.exe",
    "runtimebroker.exe", "securityhealthservice.exe", "msmpeng.exe",
}


class HendyToolsApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.title(f"{APP_NAME} · Windows Edition")
        self.geometry("1320x900")
        self.minsize(1080, 720)
        self.configure(fg_color=C["bg"])

        self.events: queue.Queue = queue.Queue()
        self.frames: dict[str, ctk.CTkFrame] = {}
        self.nav_buttons: dict[str, ctk.CTkButton] = {}
        self.folder_items: dict[str, ctk.BooleanVar] = {}
        self.opt_vars: dict[str, ctk.BooleanVar] = {}
        self.app_vars: dict[str, ctk.BooleanVar] = {}
        self.is_cloud_logged_in = False
        self.gdrive_service = None
        self.credentials_path_var = ctk.StringVar(value=str(APP_DIR / "credentials.json"))
        self.path_classify_var = ctk.StringVar(value="")
        self.selected_drive = ctk.StringVar(value="")
        self.drive_list = self.get_available_drives()
        if self.drive_list:
            self.selected_drive.set(self.drive_list[0])
        self._job_lock = threading.Lock()
        self._active_jobs = 0

        self._build_shell()
        self._build_dashboard()
        self._build_disk_page()
        self._build_cloud_page()
        self._build_about_page()
        self._build_maintenance_page()
        self.switch_page("dashboard")

        if not IS_WINDOWS:
            self.log("⚠️ Bạn đang chạy ngoài Windows: các tính năng chỉnh hệ thống Windows sẽ không khả dụng.")
        if not self.is_admin() and IS_WINDOWS:
            self.log("ℹ️ Đang chạy với quyền người dùng thường. Chỉ các thao tác cần thiết mới yêu cầu Administrator.")
        if psutil is None:
            self.log("ℹ️ Chưa cài psutil: số liệu CPU/RAM và trình quản lý tiến trình bị giới hạn.")
        if send2trash is None:
            self.log("ℹ️ Chưa cài send2trash: chức năng đưa mục đã chọn vào Thùng rác đang tắt để tránh xóa vĩnh viễn.")
        self.log(f"✅ {APP_NAME} {APP_VERSION} đã khởi động.")
        self.after(100, self._pump_events)
        self.after(500, self.refresh_metrics)
        self.after(3000, self._metric_tick)
        self.after(1000, self._tick_clock)
        self.after(4000, self._auto_check_for_app_updates)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ---------- Application shell / navigation ----------
    def _build_shell(self) -> None:
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.sidebar = ctk.CTkFrame(self, width=228, corner_radius=0, fg_color=C["sidebar"])
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)

        brand = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        brand.pack(fill="x", padx=20, pady=(24, 26))
        ctk.CTkLabel(brand, text="HENDY", font=ctk.CTkFont(size=25, weight="bold"), text_color=C["text"]).pack(anchor="w")
        ctk.CTkLabel(brand, text="TOOLS  /  PRO", font=ctk.CTkFont(size=11, weight="bold"), text_color=C["cyan"]).pack(anchor="w", pady=(1, 0))
        ctk.CTkLabel(brand, text=f"VERSION {APP_VERSION}", font=ctk.CTkFont(size=10), text_color=C["muted"]).pack(anchor="w", pady=(8, 0))

        ctk.CTkLabel(self.sidebar, text="WORKSPACE", font=ctk.CTkFont(size=10, weight="bold"), text_color=C["muted"]).pack(anchor="w", padx=20, pady=(0, 8))
        nav_items = [
            ("dashboard", "⌂", "Tổng quan"),
            ("disk", "▤", "Quản lý ổ đĩa"),
            ("cloud", "☁", "Backup & Cloud"),
            ("maintenance", "✦", "Chẩn đoán nâng cao"),
            ("about", "ⓘ", "Thông tin"),
        ]
        for page_id, glyph, title in nav_items:
            btn = ctk.CTkButton(
                self.sidebar,
                text=f"{glyph}     {title}",
                anchor="w",
                height=44,
                corner_radius=10,
                fg_color="transparent",
                hover_color=C["panel_2"],
                text_color=C["muted"],
                font=ctk.CTkFont(size=14, weight="bold"),
                command=lambda pid=page_id: self.switch_page(pid),
            )
            btn.pack(fill="x", padx=12, pady=4)
            self.nav_buttons[page_id] = btn

        spacer = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        spacer.pack(fill="both", expand=True)
        ctk.CTkFrame(self.sidebar, height=1, fg_color=C["border"]).pack(fill="x", padx=18, pady=(0, 12))
        ctk.CTkLabel(self.sidebar, text=f"{platform.system()} · {ARCHITECTURE}", text_color=C["muted"], font=ctk.CTkFont(size=11)).pack(anchor="w", padx=20)
        ctk.CTkLabel(self.sidebar, text="Made for local maintenance", text_color=C["muted"], font=ctk.CTkFont(size=10)).pack(anchor="w", padx=20, pady=(4, 18))

        self.right_area = ctk.CTkFrame(self, fg_color=C["bg"], corner_radius=0)
        self.right_area.grid(row=0, column=1, sticky="nsew")
        self.right_area.grid_rowconfigure(1, weight=1)
        self.right_area.grid_columnconfigure(0, weight=1)

        self.header = ctk.CTkFrame(self.right_area, fg_color=C["bg"], corner_radius=0)
        self.header.grid(row=0, column=0, sticky="ew", padx=28, pady=(20, 12))
        self.header.grid_columnconfigure(0, weight=1)
        self.page_title = ctk.CTkLabel(self.header, text="Tổng quan hệ thống", font=ctk.CTkFont(size=25, weight="bold"), text_color=C["text"])
        self.page_title.grid(row=0, column=0, sticky="w")
        self.page_subtitle = ctk.CTkLabel(self.header, text="Theo dõi tài nguyên và chạy tác vụ bảo trì có kiểm soát.", font=ctk.CTkFont(size=12), text_color=C["muted"])
        self.page_subtitle.grid(row=1, column=0, sticky="w", pady=(5, 0))
        self.lbl_time = ctk.CTkLabel(self.header, text="--:--:--", font=ctk.CTkFont(size=14, weight="bold"), text_color=C["cyan"])
        self.lbl_time.grid(row=0, column=1, rowspan=2, sticky="e", padx=(18, 0))

        self.content_container = ctk.CTkFrame(self.right_area, fg_color="transparent")
        self.content_container.grid(row=1, column=0, sticky="nsew", padx=28, pady=(0, 12))
        self.content_container.grid_rowconfigure(0, weight=1)
        self.content_container.grid_columnconfigure(0, weight=1)

        log_wrap = ctk.CTkFrame(self.right_area, fg_color=C["panel"], corner_radius=12, border_width=1, border_color=C["border"])
        log_wrap.grid(row=2, column=0, sticky="ew", padx=28, pady=(0, 18))
        log_head = ctk.CTkFrame(log_wrap, fg_color="transparent")
        log_head.pack(fill="x", padx=14, pady=(8, 0))
        ctk.CTkLabel(log_head, text="NHẬT KÝ TÁC VỤ", text_color=C["muted"], font=ctk.CTkFont(size=10, weight="bold")).pack(side="left")
        ctk.CTkButton(log_head, text="Xóa log", width=72, height=25, fg_color=C["panel_2"], hover_color=C["border"], command=self.clear_log).pack(side="right")
        self.textbox_log = ctk.CTkTextbox(log_wrap, height=105, fg_color="transparent", text_color=C["text"], font=ctk.CTkFont(family="Consolas", size=11), wrap="word")
        self.textbox_log.pack(fill="x", padx=10, pady=(4, 10))

    def switch_page(self, page_id: str) -> None:
        titles = {
            "dashboard": ("Tổng quan hệ thống", "Theo dõi tài nguyên và chạy tác vụ bảo trì có kiểm soát."),
            "disk": ("Quản lý ổ đĩa", "Quét dung lượng, tìm tệp lớn và đưa mục đã chọn vào Thùng rác."),
            "cloud": ("Backup & Cloud", "Phân loại tệp, tạo ZIP và sao lưu Google Drive qua OAuth."),
            "maintenance": ("Chẩn đoán nâng cao", "Kiểm tra tình trạng Windows, ứng dụng khởi động, nguồn điện và kết nối mạng."),
            "about": ("Thông tin & hỗ trợ", "Thông tin môi trường, phụ thuộc và giới hạn thao tác hệ thống."),
        }
        self.page_title.configure(text=titles[page_id][0])
        self.page_subtitle.configure(text=titles[page_id][1])
        for key, btn in self.nav_buttons.items():
            active = key == page_id
            btn.configure(fg_color=C["panel_2"] if active else "transparent", text_color=C["text"] if active else C["muted"])
        for frame in self.frames.values():
            frame.grid_forget()
        self.frames[page_id].grid(row=0, column=0, sticky="nsew")

    def _card(self, parent, title: str, subtitle: str | None = None) -> ctk.CTkFrame:
        card = ctk.CTkFrame(parent, fg_color=C["panel"], corner_radius=14, border_width=1, border_color=C["border"])
        header = ctk.CTkFrame(card, fg_color="transparent")
        header.pack(fill="x", padx=17, pady=(15, 5))
        ctk.CTkLabel(header, text=title, font=ctk.CTkFont(size=15, weight="bold"), text_color=C["text"]).pack(anchor="w")
        if subtitle:
            ctk.CTkLabel(card, text=subtitle, font=ctk.CTkFont(size=11), text_color=C["muted"], wraplength=900, justify="left").pack(anchor="w", padx=17, pady=(0, 8))
        return card

    def _button(self, parent, text: str, command: Callable, kind: str = "primary", width: int | None = None, height: int = 36) -> ctk.CTkButton:
        color = {"primary": C["primary"], "green": C["green"], "red": C["red"], "orange": C["orange"], "neutral": C["panel_2"]}.get(kind, C["primary"])
        fg_text = "#08111F" if kind in {"green", "orange"} else "#FFFFFF"
        return ctk.CTkButton(parent, text=text, command=command, width=width or 150, height=height, corner_radius=9,
                             fg_color=color, hover_color=C["primary_hover"] if kind == "primary" else color,
                             text_color=fg_text, font=ctk.CTkFont(size=12, weight="bold"))

    def _build_dashboard(self) -> None:
        page = ctk.CTkScrollableFrame(self.content_container, fg_color="transparent", corner_radius=0)
        self.frames["dashboard"] = page
        hero = ctk.CTkFrame(page, fg_color=C["panel_2"], corner_radius=16, border_width=1, border_color=C["border"])
        hero.pack(fill="x", pady=(0, 14))
        hero.grid_columnconfigure(0, weight=1)
        hero.grid_columnconfigure(1, weight=0)
        hero_left = ctk.CTkFrame(hero, fg_color="transparent")
        hero_left.grid(row=0, column=0, sticky="ew", padx=22, pady=20)
        ctk.CTkLabel(hero_left, text="PC CARE CENTER", font=ctk.CTkFont(size=10, weight="bold"), text_color=C["cyan"]).pack(anchor="w")
        ctk.CTkLabel(hero_left, text="Bảo trì thông minh. Kiểm soát rõ ràng.", font=ctk.CTkFont(size=22, weight="bold"), text_color=C["text"]).pack(anchor="w", pady=(7, 4))
        ctk.CTkLabel(hero_left, text="Các thao tác thay đổi hệ thống sẽ yêu cầu xác nhận hoặc quyền Administrator khi cần.", font=ctk.CTkFont(size=12), text_color=C["muted"], wraplength=620, justify="left").pack(anchor="w")
        self._button(hero, "↻  Làm mới số liệu", self.refresh_metrics, kind="primary", width=165).grid(row=0, column=1, padx=22, pady=20, sticky="e")

        update_card = self._card(page, "Cập nhật Hendy Tools", "Kiểm tra bản phát hành từ Hendy Update Server. Bộ cài chỉ được mở sau khi bạn xác nhận.")
        update_card.pack(fill="x", pady=(0, 14))
        update_row = ctk.CTkFrame(update_card, fg_color="transparent")
        update_row.pack(fill="x", padx=17, pady=(4, 15))
        self.lbl_update_status = ctk.CTkLabel(update_row, text=f"Đang sử dụng phiên bản {APP_VERSION} (build {APP_BUILD})", text_color=C["muted"], font=ctk.CTkFont(size=12))
        self.lbl_update_status.pack(side="left", fill="x", expand=True, padx=(0, 12))
        self._button(update_row, "Kiểm tra cập nhật", self.check_for_app_updates, kind="primary", width=165).pack(side="right")

        metric_row = ctk.CTkFrame(page, fg_color="transparent")
        metric_row.pack(fill="x", pady=(0, 14))
        for col in range(3):
            metric_row.grid_columnconfigure(col, weight=1, uniform="metrics")
        self.metric_labels: dict[str, ctk.CTkLabel] = {}
        self.metric_bars: dict[str, ctk.CTkProgressBar] = {}
        metric_specs = [
            ("cpu", "CPU LOAD", "Đang đo…", C["primary"]),
            ("ram", "MEMORY USAGE", "Đang đo…", C["cyan"]),
            ("disk", "SYSTEM DRIVE", "Đang đo…", C["green"]),
        ]
        for col, (key, label, value, bar_color) in enumerate(metric_specs):
            box = ctk.CTkFrame(metric_row, fg_color=C["panel"], corner_radius=14, border_width=1, border_color=C["border"])
            box.grid(row=0, column=col, sticky="nsew", padx=(0 if col == 0 else 7, 7 if col < 2 else 0))
            ctk.CTkLabel(box, text=label, font=ctk.CTkFont(size=10, weight="bold"), text_color=C["muted"]).pack(anchor="w", padx=16, pady=(14, 4))
            self.metric_labels[key] = ctk.CTkLabel(box, text=value, font=ctk.CTkFont(size=22, weight="bold"), text_color=C["text"])
            self.metric_labels[key].pack(anchor="w", padx=16, pady=(0, 10))
            self.metric_bars[key] = ctk.CTkProgressBar(box, progress_color=bar_color, fg_color=C["border"], height=7)
            self.metric_bars[key].pack(fill="x", padx=16, pady=(0, 15))
            self.metric_bars[key].set(0)

        action_card = self._card(page, "Thao tác nhanh", "Tiện ích chỉ chạy khi bạn bấm nút; không có tối ưu nền tự động.")
        action_card.pack(fill="x", pady=(0, 14))
        action_row = ctk.CTkFrame(action_card, fg_color="transparent")
        action_row.pack(fill="x", padx=17, pady=(5, 16))
        self._button(action_row, "Quản lý tiến trình", self.open_process_manager, kind="red", width=165).pack(side="left", padx=(0, 8), pady=3)
        self._button(action_row, "Task Manager", self.open_task_manager, kind="neutral", width=130).pack(side="left", padx=8, pady=3)
        self._button(action_row, "Đồng bộ giờ NTP", self.sync_time_with_ntp, kind="primary", width=150).pack(side="left", padx=8, pady=3)
        self._button(action_row, "Cài tiếng Việt", self.install_vi_language, kind="neutral", width=135).pack(side="left", padx=8, pady=3)
        self._button(action_row, "Disk Management", self.extend_drive_c, kind="neutral", width=150).pack(side="left", padx=8, pady=3)
        self._button(action_row, "Restart PC", self.restart_pc, kind="red", width=110).pack(side="left", padx=8, pady=3)

        settings_card = self._card(page, "Bảo trì Windows", "Chọn tùy chỉnh rồi bấm Áp dụng. Một số tùy chọn có thể cần khởi động lại; hãy đọc xác nhận trước khi chạy.")
        settings_card.pack(fill="x", pady=(0, 14))
        opts_frame = ctk.CTkFrame(settings_card, fg_color="transparent")
        opts_frame.pack(fill="x", padx=17, pady=(4, 8))
        opt_specs = [
            ("temp", "Dọn thư mục %TEMP%", "Xóa mục tạm có thể xóa được; bỏ qua mục đang dùng."),
            ("sleep", "Tắt chế độ ngủ", "Đặt thời gian ngủ về Never cho nguồn AC/DC."),
            ("hiber", "Tắt ngủ đông", "Tắt hibernation; tính năng Fast Startup có thể bị ảnh hưởng."),
            ("update", "Tạm dừng Windows Update", "Giảm khả năng nhận bản vá bảo mật; không khuyến nghị."),
            ("rec", "Tắt Windows Recovery Environment", "Có thể làm khó việc khôi phục hệ thống."),
            ("taskbar", "Taskbar nhỏ (Windows cũ)", "Không được mọi bản Windows 11 hỗ trợ."),
            ("tray", "Hiện tất cả icon khay hệ thống", "Thay đổi tùy chọn Explorer của tài khoản hiện tại."),
        ]
        for col in range(2):
            opts_frame.grid_columnconfigure(col, weight=1, uniform="opts")
        for idx, (key, label, help_text) in enumerate(opt_specs):
            row, col = divmod(idx, 2)
            item = ctk.CTkFrame(opts_frame, fg_color=C["panel_2"], corner_radius=10)
            item.grid(row=row, column=col, sticky="ew", padx=(0, 6) if col == 0 else (6, 0), pady=5)
            var = ctk.BooleanVar(value=False)
            self.opt_vars[key] = var
            ctk.CTkCheckBox(item, text=label, variable=var, text_color=C["text"], font=ctk.CTkFont(size=12, weight="bold"), checkbox_width=18, checkbox_height=18).pack(anchor="w", padx=12, pady=(10, 2))
            ctk.CTkLabel(item, text=help_text, text_color=C["muted"], font=ctk.CTkFont(size=10), wraplength=430, justify="left").pack(anchor="w", padx=37, pady=(0, 10))
        settings_bottom = ctk.CTkFrame(settings_card, fg_color="transparent")
        settings_bottom.pack(fill="x", padx=17, pady=(5, 16))
        self._button(settings_bottom, "⚡ Áp dụng tùy chỉnh đã chọn", self.apply_window_optimizations, kind="green", width=230).pack(side="left")
        self._button(settings_bottom, "Khôi phục Update / RE / Hibernate", self.restore_windows_features, kind="orange", width=245).pack(side="left", padx=8)
        self._button(settings_bottom, "Mở cài đặt Recovery", lambda: self.open_windows_settings("ms-settings:recovery"), kind="neutral", width=165).pack(side="left", padx=8)
        self._button(settings_bottom, "Cài đặt Remote Desktop", lambda: self.open_windows_settings("ms-settings:remotedesktop"), kind="neutral", width=180).pack(side="left", padx=8)

        app_card = self._card(page, "Cài đặt phần mềm qua WinGet", "Chọn các ứng dụng cần cài. WinGet tải gói từ nguồn đã cấu hình trên máy; một số mục cũ không phải ứng dụng desktop nên sẽ được báo rõ.")
        app_card.pack(fill="x", pady=(0, 14))
        apps_frame = ctk.CTkFrame(app_card, fg_color="transparent")
        apps_frame.pack(fill="x", padx=17, pady=(4, 8))
        app_names = [
            "Chrome", "Firefox", "Opera", "Cốc Cốc", "Java Runtime (Temurin 8)", "Java JDK 21",
            "Bitvise SSH", "PuTTY", "VC++ Runtime", "Proton VPN", "VNC Viewer", "UniKey",
            "Notepad++", "BlueStacks", "UltraViewer", "XAMPP", "WinRAR", "Net Framework 3.5",
            "WordPress (CMS)",
        ]
        for col in range(3):
            apps_frame.grid_columnconfigure(col, weight=1, uniform="apps")
        for idx, name in enumerate(app_names):
            row, col = divmod(idx, 3)
            var = ctk.BooleanVar(value=False)
            self.app_vars[name] = var
            ctk.CTkCheckBox(apps_frame, text=name, variable=var, text_color=C["text"], font=ctk.CTkFont(size=11), checkbox_width=17, checkbox_height=17).grid(row=row, column=col, sticky="w", padx=(0, 8), pady=6)
        app_foot = ctk.CTkFrame(app_card, fg_color="transparent")
        app_foot.pack(fill="x", padx=17, pady=(5, 16))
        self.var_chrome_default = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(app_foot, text="Mở phần cài đặt để tôi đặt Chrome làm trình duyệt mặc định sau khi cài", variable=self.var_chrome_default, text_color=C["muted"], font=ctk.CTkFont(size=11)).pack(side="left", padx=(0, 12))
        self._button(app_foot, "Tải & cài phần mềm đã chọn", self.download_selected_apps, kind="green", width=220).pack(side="right")

        security_card = self._card(page, "Cài đặt bảo mật & tính năng nâng cao", "Một số thay đổi như UAC, driver signature và IE Enhanced Security phụ thuộc phiên bản Windows và làm giảm bảo vệ nếu tắt. Ứng dụng mở công cụ chính thức để bạn tự quyết định, không tự tắt các lớp bảo vệ này.")
        security_card.pack(fill="x", pady=(0, 14))
        security_row = ctk.CTkFrame(security_card, fg_color="transparent")
        security_row.pack(fill="x", padx=17, pady=(5, 16))
        self._button(security_row, "UAC Settings", self.open_uac_settings, kind="neutral", width=135).pack(side="left", padx=(0, 8))
        self._button(security_row, "Windows Security", self.open_windows_security, kind="neutral", width=150).pack(side="left", padx=8)
        self._button(security_row, "IE ESC (Windows Server)", self.open_server_manager, kind="neutral", width=185).pack(side="left", padx=8)
        self._button(security_row, "Startup options / Driver", lambda: self.open_windows_settings("ms-settings:recovery"), kind="neutral", width=190).pack(side="left", padx=8)

        admin_card = self._card(page, "Quản trị nâng cao", "Các thao tác thay đổi tài khoản, RDP hoặc firewall sẽ hỏi xác nhận và cần quyền Administrator.")
        admin_card.pack(fill="x", pady=(0, 10))
        fields = ctk.CTkFrame(admin_card, fg_color="transparent")
        fields.pack(fill="x", padx=17, pady=(5, 16))
        fields.grid_columnconfigure(1, weight=1)
        fields.grid_columnconfigure(4, weight=1)
        self.entry_admin = self._labeled_entry(fields, "Tên tài khoản mới", 0, 0, "Ví dụ: AdminPC")
        self._button(fields, "Đổi tên", self.change_admin, kind="neutral", width=95).grid(row=0, column=2, padx=(8, 18), pady=5)
        self.entry_rdp = self._labeled_entry(fields, "Port RDP mới", 0, 3, "Ví dụ: 3390")
        self._button(fields, "Đổi port", self.change_rdp_port, kind="orange", width=105).grid(row=0, column=5, padx=(8, 0), pady=5)
        self.entry_fw = self._labeled_entry(fields, "Mở TCP port", 1, 0, "1–65535")
        self._button(fields, "Thêm firewall rule", self.open_firewall_port, kind="neutral", width=145).grid(row=1, column=2, padx=(8, 18), pady=5)
        self.entry_pass = self._labeled_entry(fields, "Mật khẩu tài khoản hiện tại", 1, 3, "Nhập mật khẩu mới", show="*")
        self._button(fields, "Đổi mật khẩu", self.change_password, kind="red", width=120).grid(row=1, column=5, padx=(8, 0), pady=5)

    def _labeled_entry(self, parent, label: str, row: int, col: int, placeholder: str, show: str | None = None) -> ctk.CTkEntry:
        wrap = ctk.CTkFrame(parent, fg_color="transparent")
        wrap.grid(row=row, column=col, columnspan=2, sticky="ew", padx=(0, 5), pady=5)
        ctk.CTkLabel(wrap, text=label, text_color=C["muted"], font=ctk.CTkFont(size=10, weight="bold")).pack(anchor="w", pady=(0, 3))
        entry = ctk.CTkEntry(wrap, placeholder_text=placeholder, show=show, height=34, fg_color=C["panel_2"], border_color=C["border"])
        entry.pack(fill="x")
        return entry

    # ---------- Disk page ----------
    def _build_disk_page(self) -> None:
        page = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.frames["disk"] = page
        info = self._card(page, "Dung lượng ổ đĩa")
        info.pack(fill="x", pady=(0, 12))
        self.lbl_disk_info = ctk.CTkLabel(info, text="Chọn ổ đĩa để xem thông tin.", text_color=C["text"], font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_disk_info.pack(anchor="w", padx=17, pady=(4, 15))

        toolbar = ctk.CTkFrame(page, fg_color=C["panel"], corner_radius=12, border_width=1, border_color=C["border"])
        toolbar.pack(fill="x", pady=(0, 12))
        ctk.CTkLabel(toolbar, text="Ổ đĩa", text_color=C["muted"], font=ctk.CTkFont(size=11, weight="bold")).pack(side="left", padx=(14, 6), pady=12)
        self.drive_combo = ctk.CTkComboBox(toolbar, values=self.drive_list or ["/"], variable=self.selected_drive, width=105, command=self.on_drive_change)
        self.drive_combo.pack(side="left", padx=5, pady=10)
        self._button(toolbar, "Quét thư mục", lambda: self.start_action("scan"), kind="primary", width=125).pack(side="left", padx=5, pady=8)
        self._button(toolbar, "Tìm file > 50 MB", lambda: self.start_action("scan_large"), kind="neutral", width=145).pack(side="left", padx=5, pady=8)
        self._button(toolbar, "Optimize drive", lambda: self.start_action("defrag"), kind="orange", width=125).pack(side="left", padx=5, pady=8)
        self._button(toolbar, "Đưa mục chọn vào Thùng rác", lambda: self.start_action("clean"), kind="red", width=200).pack(side="right", padx=12, pady=8)

        result_card = self._card(page, "Kết quả quét", "Các thư mục hệ thống được khóa khỏi thao tác xóa. Quét file lớn giới hạn 500 kết quả để tránh làm giao diện quá tải.")
        result_card.pack(fill="both", expand=True)
        self.result_count_label = ctk.CTkLabel(result_card, text="Chưa có kết quả", text_color=C["muted"], font=ctk.CTkFont(size=11))
        self.result_count_label.pack(anchor="w", padx=17, pady=(0, 6))
        self.scroll_clean = ctk.CTkScrollableFrame(result_card, fg_color=C["panel_2"], corner_radius=10)
        self.scroll_clean.pack(fill="both", expand=True, padx=14, pady=(0, 14))
        self._show_disk_placeholder("Chọn Quét thư mục hoặc Tìm file > 50 MB để bắt đầu.")
        self.on_drive_change(self.selected_drive.get())

    def _build_cloud_page(self) -> None:
        page = ctk.CTkScrollableFrame(self.content_container, fg_color="transparent", corner_radius=0)
        self.frames["cloud"] = page
        src_card = self._card(page, "Nguồn dữ liệu", "Chọn thư mục để phân loại tệp, tạo bản ZIP hoặc tải bản ZIP lên Google Drive.")
        src_card.pack(fill="x", pady=(0, 13))
        src_row = ctk.CTkFrame(src_card, fg_color="transparent")
        src_row.pack(fill="x", padx=17, pady=(4, 14))
        ctk.CTkEntry(src_row, textvariable=self.path_classify_var, placeholder_text="Đường dẫn thư mục cần xử lý…", height=38).pack(side="left", fill="x", expand=True, padx=(0, 8))
        self._button(src_row, "Chọn thư mục", self.browse_source_folder, kind="neutral", width=120).pack(side="left")
        action_row = ctk.CTkFrame(src_card, fg_color="transparent")
        action_row.pack(fill="x", padx=17, pady=(0, 15))
        self._button(action_row, "Phân loại tệp", lambda: self.start_action("classify"), kind="primary", width=135).pack(side="left", padx=(0, 8))
        self._button(action_row, "Tạo bản ZIP", lambda: self.start_action("archive"), kind="orange", width=125).pack(side="left", padx=8)

        cloud_card = self._card(page, "Google Drive · OAuth 2.0", "Đăng nhập qua trình duyệt. Mã thông báo được lưu trong thư mục dữ liệu người dùng, không nằm trong thư mục mã nguồn.")
        cloud_card.pack(fill="x", pady=(0, 13))
        cred_row = ctk.CTkFrame(cloud_card, fg_color="transparent")
        cred_row.pack(fill="x", padx=17, pady=(4, 8))
        ctk.CTkLabel(cred_row, text="OAuth client JSON", text_color=C["muted"], font=ctk.CTkFont(size=11, weight="bold")).pack(anchor="w", pady=(0, 5))
        cred_line = ctk.CTkFrame(cred_row, fg_color="transparent")
        cred_line.pack(fill="x")
        ctk.CTkEntry(cred_line, textvariable=self.credentials_path_var, height=35).pack(side="left", fill="x", expand=True, padx=(0, 8))
        self._button(cred_line, "Browse", self.browse_credentials, kind="neutral", width=90).pack(side="left")
        cloud_actions = ctk.CTkFrame(cloud_card, fg_color="transparent")
        cloud_actions.pack(fill="x", padx=17, pady=(5, 10))
        self.lbl_cloud_status = ctk.CTkLabel(cloud_actions, text="● Chưa kết nối Google Drive", text_color=C["orange"], font=ctk.CTkFont(size=12, weight="bold"))
        self.lbl_cloud_status.pack(side="left")
        self.btn_login = self._button(cloud_actions, "Cấp quyền / Đăng nhập", self.open_login_dialog, kind="primary", width=185)
        self.btn_login.pack(side="right", padx=(8, 0))
        self.btn_upload = self._button(cloud_actions, "Nén ZIP & Upload", lambda: self.start_action("cloud_backup"), kind="green", width=165)
        self.btn_upload.pack(side="right", padx=8)
        self.btn_upload.configure(state="disabled")

        output_card = self._card(page, "Kết quả & báo cáo")
        output_card.pack(fill="both", expand=True, pady=(0, 5))
        self.textbox_classify = ctk.CTkTextbox(output_card, height=250, fg_color=C["panel_2"], text_color=C["text"], border_width=1, border_color=C["border"], font=ctk.CTkFont(family="Consolas", size=11), wrap="word")
        self.textbox_classify.pack(fill="both", expand=True, padx=14, pady=(4, 14))
        self._cloud_write("Chưa có tác vụ. Báo cáo phân loại, đường dẫn ZIP và kết quả upload sẽ xuất hiện tại đây.\n")

    # ---------- Hendy Update Server / Windows installer updater ----------
    def _configured_update_server(self) -> str | None:
        base = UPDATE_SERVER_BASE_URL.strip().rstrip("/")
        parsed = urllib.parse.urlparse(base)
        if parsed.scheme != "https" or not parsed.netloc or "example.workers.dev" in parsed.netloc:
            return None
        return base

    def _auto_check_for_app_updates(self) -> None:
        base = self._configured_update_server()
        if base:
            self._start_worker("Kiểm tra cập nhật khi khởi động", self._check_for_app_updates_worker, base, False)

    def check_for_app_updates(self) -> None:
        base = self._configured_update_server()
        if not base:
            messagebox.showwarning(
                "Chưa cấu hình Update Server",
                "Hãy thay UPDATE_SERVER_BASE_URL bằng URL Worker thật trước khi phát hành bản cài.\n\n"
                "Ví dụ: https://hendy-update-server.ten-tai-khoan.workers.dev",
                parent=self,
            )
            return
        self._start_worker("Kiểm tra cập nhật Hendy Tools", self._check_for_app_updates_worker, base, True)

    def _check_for_app_updates_worker(self, base: str, show_no_update: bool = True) -> None:
        params = urllib.parse.urlencode({
            "platform": "windows",
            "channel": "stable",
            "current": APP_VERSION,
            "build": str(APP_BUILD),
        })
        endpoint = f"{base}/api/v1/releases/latest?{params}"
        request = urllib.request.Request(endpoint, headers={"User-Agent": f"HendyToolsPro/{APP_VERSION}", "Cache-Control": "no-cache"})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f"Update Server trả HTTP {response.status}")
                release = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                raise RuntimeError("Chưa có manifest Windows được phát hành lên R2.") from exc
            raise RuntimeError(f"HTTP {exc.code} khi kiểm tra cập nhật.") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Không kết nối được Update Server: {exc.reason}") from exc

        if release.get("platform") != "windows" or not isinstance(release.get("version"), str):
            raise RuntimeError("Server trả về manifest không đúng nền tảng Windows.")
        if release.get("updateAvailable") is True:
            artifact = release.get("artifact")
            download_url = release.get("downloadUrl")
            if not isinstance(artifact, dict) or not isinstance(download_url, str):
                raise RuntimeError("Manifest mới thiếu bộ cài hoặc downloadUrl.")
            download_parsed = urllib.parse.urlparse(download_url)
            base_parsed = urllib.parse.urlparse(base)
            if download_parsed.scheme != "https" or download_parsed.netloc != base_parsed.netloc or download_parsed.path != "/api/v1/releases/download":
                raise RuntimeError("URL tải không thuộc Update Server đã cấu hình; đã chặn tải xuống.")
            if not isinstance(artifact.get("sha256"), str) or not re.fullmatch(r"[a-fA-F0-9]{64}", artifact["sha256"]):
                raise RuntimeError("Manifest có SHA-256 không hợp lệ.")
            if not isinstance(artifact.get("size"), int) or artifact["size"] <= 0:
                raise RuntimeError("Manifest có kích thước bộ cài không hợp lệ.")
        self._post(self._present_update_result, release, show_no_update)

    def _present_update_result(self, release: dict, show_no_update: bool = True) -> None:
        version = release.get("version", "không rõ")
        if not release.get("updateAvailable"):
            self.lbl_update_status.configure(text=f"Bạn đang dùng bản mới nhất · {APP_VERSION}", text_color=C["green"])
            if show_no_update:
                messagebox.showinfo("Hendy Tools đã cập nhật", f"Phiên bản hiện tại ({APP_VERSION}, build {APP_BUILD}) là bản mới nhất.", parent=self)
            return

        artifact = release.get("artifact") or {}
        notes_raw = release.get("releaseNotes") or []
        notes = "\n".join(f"• {line}" for line in notes_raw if isinstance(line, str)) or "• Có bản phát hành mới."
        mandatory = bool(release.get("mandatory"))
        self.lbl_update_status.configure(text=f"Có bản mới {version}" + (" · Cập nhật bắt buộc" if mandatory else ""), text_color=C["orange"])
        confirm = messagebox.askyesno(
            "Có bản cập nhật Hendy Tools",
            f"Phiên bản mới: {version}\nBản hiện tại: {APP_VERSION}\n\n{notes}\n\n"
            f"Bộ cài: {artifact.get('fileName', 'Windows installer')}\n"
            + ("Bản này được đánh dấu bắt buộc khi phiên bản hiện tại quá cũ. " if mandatory else "")
            + "\nTải xuống và kiểm tra SHA-256 ngay bây giờ?",
            parent=self,
        )
        if confirm:
            self._start_worker("Tải và kiểm tra bộ cài cập nhật", self._download_update_worker, release)

    def _download_update_worker(self, release: dict) -> None:
        artifact = release["artifact"]
        url = release["downloadUrl"]
        expected_size = int(artifact["size"])
        expected_sha = str(artifact["sha256"]).lower()
        file_name = str(artifact.get("fileName", "HendyToolsPro-Update.exe"))
        if not re.fullmatch(r"[A-Za-z0-9._-]+", file_name) or not file_name.lower().endswith((".exe", ".msi")):
            raise RuntimeError("Tên bộ cài không hợp lệ; đã chặn lưu file.")
        if expected_size > 2 * 1024 * 1024 * 1024:
            raise RuntimeError("Bộ cài vượt giới hạn tải 2 GB.")

        update_dir = USER_DATA_DIR / "updates"
        update_dir.mkdir(parents=True, exist_ok=True)
        destination = update_dir / file_name
        partial = destination.with_suffix(destination.suffix + ".part")
        request = urllib.request.Request(url, headers={"User-Agent": f"HendyToolsPro/{APP_VERSION}"})
        digest = hashlib.sha256()
        written = 0
        try:
            with urllib.request.urlopen(request, timeout=60) as response, partial.open("wb") as output:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > expected_size:
                        raise RuntimeError("Kích thước tải vượt manifest; đã hủy tải.")
                    digest.update(chunk)
                    output.write(chunk)
            if written != expected_size:
                raise RuntimeError(f"Kích thước tải không khớp manifest (nhận {written}, cần {expected_size} byte).")
            actual_sha = digest.hexdigest().lower()
            if actual_sha != expected_sha:
                raise RuntimeError("SHA-256 không khớp manifest. Bộ cài bị xóa và sẽ không được mở.")
            partial.replace(destination)
        except Exception:
            try:
                partial.unlink(missing_ok=True)
            except OSError:
                pass
            raise

        signer = artifact.get("signerThumbprint")
        signature_ok = None
        if signer:
            if not re.fullmatch(r"[A-Fa-f0-9]{40,64}", str(signer)):
                destination.unlink(missing_ok=True)
                raise RuntimeError("Thumbprint ký số trong manifest không hợp lệ.")
            signature_ok = self._verify_windows_signature(destination, str(signer).replace(" ", ""))
            if not signature_ok:
                destination.unlink(missing_ok=True)
                raise RuntimeError("Chữ ký Authenticode không hợp lệ hoặc không đúng nhà phát hành đã cấu hình. Bộ cài đã bị xóa.")
        self.log(f"✅ Đã tải bộ cài {file_name}; SHA-256 khớp.")
        self._post(self._offer_update_installer, str(destination), release, signature_ok)

    def _verify_windows_signature(self, path: Path, thumbprint: str) -> bool:
        if platform.system() != "Windows":
            return False
        safe_path = str(path.resolve()).replace("'", "''")
        safe_thumbprint = thumbprint.upper()
        ps = (
            f"$s=Get-AuthenticodeSignature -LiteralPath '{safe_path}'; "
            f"if ($s.Status -eq 'Valid' -and $s.SignerCertificate.Thumbprint -eq '{safe_thumbprint}') "
            "{ exit 0 } else { exit 9 }"
        )
        try:
            result = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps], capture_output=True, text=True, timeout=30, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            return result.returncode == 0
        except Exception as exc:
            self.log(f"⚠️ Không kiểm tra được chữ ký Authenticode: {exc}")
            return False

    def _offer_update_installer(self, path_text: str, release: dict, signature_ok: bool | None) -> None:
        path = Path(path_text)
        security_note = (
            "Chữ ký Authenticode đã hợp lệ và đúng thumbprint cấu hình."
            if signature_ok is True
            else "Không có thumbprint chữ ký nhà phát hành trong manifest. SHA-256 khớp, nhưng điều này không thay thế chữ ký số. Chỉ chạy nếu bạn đã xác minh nguồn phát hành."
        )
        self.lbl_update_status.configure(text=f"Đã tải {release.get('version')} · SHA-256 hợp lệ", text_color=C["green"])
        if messagebox.askyesno(
            "Bộ cài đã tải và kiểm tra",
            f"Tệp: {path}\n\n{security_note}\n\nMở trình cài đặt ngay? Hãy lưu công việc trước; trình cài đặt có thể yêu cầu đóng ứng dụng.",
            parent=self,
        ):
            try:
                if platform.system() == "Windows":
                    os.startfile(str(path))  # noqa: S606 - explicit user confirmation above
                else:
                    messagebox.showinfo("Bộ cài đã tải", f"Bộ cài được lưu tại:\n{path}", parent=self)
                self.log(f"▶ Đã yêu cầu mở bộ cài cập nhật: {path}")
            except Exception as exc:
                messagebox.showerror("Không mở được bộ cài", f"{exc}\n\nTệp đã tải tại:\n{path}", parent=self)
        else:
            messagebox.showinfo("Bộ cài đã sẵn sàng", f"Bạn có thể mở bộ cài sau tại:\n{path}", parent=self)

    def _build_about_page(self) -> None:
        page = ctk.CTkScrollableFrame(self.content_container, fg_color="transparent", corner_radius=0)
        self.frames["about"] = page
        about = self._card(page, "Hendy Tools Pro", "Bản viết lại tập trung vào giao diện thống nhất, log trung thực, worker nền và xác nhận các thao tác tác động đến hệ thống.")
        about.pack(fill="x", pady=(0, 13))
        details = [
            ("Phiên bản", f"{APP_VERSION} (build {APP_BUILD})"),
            ("Update Server", UPDATE_SERVER_BASE_URL),
            ("Hệ điều hành", f"{platform.system()} {platform.release()}"),
            ("Kiến trúc", ARCHITECTURE),
            ("Quyền Administrator", "Có" if self.is_admin() else "Chưa có"),
            ("psutil", "Đã cài" if psutil else "Chưa cài · CPU/RAM/tiến trình bị giới hạn"),
            ("send2trash", "Đã cài" if send2trash else "Chưa cài · xóa mục chọn đang tắt"),
            ("Google Drive API", "Sẵn sàng" if GOOGLE_API_AVAILABLE else "Chưa cài · xem requirements.txt"),
            ("Chẩn đoán nâng cao", "Startup · SFC/DISM · Defender · pin · báo cáo · WinGet"),
            ("Ứng dụng điện thoại", "Flutter Android/iOS scaffold đi kèm thư mục mobile_app"),
            ("Thư mục cấu hình/token", str(USER_DATA_DIR)),
        ]
        table = ctk.CTkFrame(about, fg_color="transparent")
        table.pack(fill="x", padx=17, pady=(4, 16))
        table.grid_columnconfigure(1, weight=1)
        for i, (key, value) in enumerate(details):
            ctk.CTkLabel(table, text=key, text_color=C["muted"], font=ctk.CTkFont(size=12, weight="bold")).grid(row=i, column=0, sticky="nw", padx=(0, 18), pady=6)
            ctk.CTkLabel(table, text=value, text_color=C["text"], font=ctk.CTkFont(size=12), wraplength=760, justify="left").grid(row=i, column=1, sticky="nw", pady=6)

        notes = self._card(page, "Lưu ý vận hành")
        notes.pack(fill="x", pady=(0, 13))
        note_text = (
            "• Thao tác xóa sử dụng Thùng rác khi send2trash đã được cài; không xóa tự động các thư mục Windows/Program Files.\n"
            "• Tắt Windows Update hoặc Recovery có ảnh hưởng bảo mật/khả năng sửa lỗi, vì vậy sẽ yêu cầu xác nhận riêng.\n"
            "• Thay đổi cổng RDP không tự bật RDP. Cần kiểm tra cài đặt Remote Desktop, mạng và chính sách tổ chức.\n"
            "• Windows không cho ứng dụng bên thứ ba đặt trình duyệt mặc định hoàn toàn tự động trên các bản Windows hiện đại; hãy dùng Settings.\n"
            "• Mở rộng phân vùng C phụ thuộc cấu trúc phân vùng và khoảng trống liền kề. Ứng dụng chỉ mở Disk Management, không giả vờ tự mở rộng.\n"
            "• Tùy chỉnh Taskbar nhỏ có thể bị bỏ qua trên Windows 11. Một số lệnh hệ thống cần chạy bằng Administrator."
        )
        ctk.CTkLabel(notes, text=note_text, text_color=C["muted"], font=ctk.CTkFont(size=12), justify="left", wraplength=950).pack(anchor="w", padx=17, pady=(5, 17))
        buttons = ctk.CTkFrame(page, fg_color="transparent")
        buttons.pack(fill="x", pady=(0, 8))
        self._button(buttons, "Mở thư mục cấu hình", lambda: self.open_path(USER_DATA_DIR), kind="neutral", width=170).pack(side="left")
        self._button(buttons, "Mở thư mục mã nguồn", lambda: self.open_path(APP_DIR), kind="neutral", width=180).pack(side="left", padx=8)

    def _build_maintenance_page(self) -> None:
        page = ctk.CTkScrollableFrame(self.content_container, fg_color="transparent", corner_radius=0)
        self.frames["maintenance"] = page

        intro = self._card(page, "Bảo trì & chẩn đoán nâng cao", "Ưu tiên đo lường, tạo báo cáo và dùng công cụ chính thức của Windows. Các bản quét dài sẽ chạy nền; không có nút tự động tắt hàng loạt dịch vụ hệ thống.")
        intro.pack(fill="x", pady=(0, 13))
        quick = ctk.CTkFrame(intro, fg_color="transparent")
        quick.pack(fill="x", padx=17, pady=(4, 15))
        self._button(quick, "Storage Sense", lambda: self.open_windows_settings("ms-settings:storagepolicies"), kind="neutral", width=145).pack(side="left", padx=(0, 8), pady=3)
        self._button(quick, "Tệp tạm / Storage", lambda: self.open_windows_settings("ms-settings:storage"), kind="neutral", width=155).pack(side="left", padx=8, pady=3)
        self._button(quick, "Windows Update", lambda: self.open_windows_settings("ms-settings:windowsupdate"), kind="neutral", width=145).pack(side="left", padx=8, pady=3)
        self._button(quick, "Ứng dụng đã cài", lambda: self.open_windows_settings("ms-settings:appsfeatures"), kind="neutral", width=150).pack(side="left", padx=8, pady=3)

        startup = self._card(page, "1 · Quản lý ứng dụng khởi động", "Có thể xem các mục Run của tài khoản Windows hiện tại và tạm vô hiệu hóa/bật lại từng mục. Không sửa các mục khởi động cấp toàn máy.")
        startup.pack(fill="x", pady=(0, 13))
        startup_row = ctk.CTkFrame(startup, fg_color="transparent")
        startup_row.pack(fill="x", padx=17, pady=(4, 15))
        self._button(startup_row, "Mở trình quản lý khởi động", self.open_startup_manager, kind="primary", width=225).pack(side="left", padx=(0, 8))
        self._button(startup_row, "Mở Startup Settings", lambda: self.open_windows_settings("ms-settings:startupapps"), kind="neutral", width=180).pack(side="left", padx=8)

        health = self._card(page, "2 · Kiểm tra sức khỏe Windows", "SFC /verifyonly chỉ xác minh tệp hệ thống; DISM /ScanHealth quét kho thành phần. Hai thao tác không tự sửa file. Cần quyền Administrator, có thể mất nhiều thời gian.")
        health.pack(fill="x", pady=(0, 13))
        health_row = ctk.CTkFrame(health, fg_color="transparent")
        health_row.pack(fill="x", padx=17, pady=(4, 15))
        self._button(health_row, "Chạy SFC + DISM ScanHealth", self.run_health_scan, kind="primary", width=235).pack(side="left", padx=(0, 8))
        self._button(health_row, "Quét nhanh Microsoft Defender", self.run_defender_quick_scan, kind="orange", width=240).pack(side="left", padx=8)
        self._button(health_row, "Tạo điểm khôi phục", self.create_restore_point, kind="neutral", width=180).pack(side="left", padx=8)

        power = self._card(page, "3 · Nguồn điện, pin & ổ đĩa", "Chế độ hiệu năng cao có thể tiêu thụ điện và làm máy nóng hơn. Một số chế độ nguồn không tồn tại trên mọi thiết bị.")
        power.pack(fill="x", pady=(0, 13))
        power_row = ctk.CTkFrame(power, fg_color="transparent")
        power_row.pack(fill="x", padx=17, pady=(4, 15))
        ctk.CTkLabel(power_row, text="Chế độ nguồn", text_color=C["muted"], font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=(0, 8))
        self.power_plan_var = ctk.StringVar(value="Balanced")
        ctk.CTkComboBox(power_row, variable=self.power_plan_var, values=["Balanced", "High performance", "Power saver"], width=180).pack(side="left", padx=(0, 8))
        self._button(power_row, "Áp dụng chế độ nguồn", self.set_power_plan, kind="primary", width=175).pack(side="left", padx=8)
        self._button(power_row, "Báo cáo pin", self.generate_battery_report, kind="neutral", width=125).pack(side="left", padx=8)
        self._button(power_row, "Tối ưu ổ đĩa", lambda: self.open_windows_settings("ms-settings:disksandvolumes"), kind="neutral", width=125).pack(side="left", padx=8)

        reports = self._card(page, "4 · Báo cáo hệ thống, mạng & cập nhật", "Báo cáo được lưu cục bộ trong thư mục dữ liệu Hendy Tools. Báo cáo mạng có thể chứa tên máy, địa chỉ IP và thông tin adapter; hãy xem lại trước khi chia sẻ.")
        reports.pack(fill="x", pady=(0, 13))
        reports_row = ctk.CTkFrame(reports, fg_color="transparent")
        reports_row.pack(fill="x", padx=17, pady=(4, 15))
        self._button(reports_row, "Xuất báo cáo hệ thống", self.generate_system_report, kind="primary", width=180).pack(side="left", padx=(0, 8), pady=3)
        self._button(reports_row, "Kiểm tra cập nhật WinGet", self.check_winget_updates, kind="neutral", width=185).pack(side="left", padx=8, pady=3)
        self._button(reports_row, "Xóa cache DNS", self.flush_dns_cache, kind="neutral", width=145).pack(side="left", padx=8, pady=3)
        self._button(reports_row, "Cài đặt mạng", lambda: self.open_windows_settings("ms-settings:network-status"), kind="neutral", width=135).pack(side="left", padx=8, pady=3)

        restore = self._card(page, "5 · An toàn & khôi phục", "Không thể bảo đảm điểm khôi phục được tạo nếu System Protection đang tắt hoặc Windows giới hạn tần suất. Tạo điểm khôi phục không thay thế bản sao lưu dữ liệu.")
        restore.pack(fill="x", pady=(0, 6))
        restore_row = ctk.CTkFrame(restore, fg_color="transparent")
        restore_row.pack(fill="x", padx=17, pady=(4, 15))
        self._button(restore_row, "Mở Windows Security", self.open_windows_security, kind="neutral", width=165).pack(side="left", padx=(0, 8))
        self._button(restore_row, "Mở System Protection", lambda: self._open_control_panel("SystemPropertiesProtection.exe"), kind="neutral", width=180).pack(side="left", padx=8)
        self._button(restore_row, "Mở Reliability Monitor", lambda: self._open_control_panel("perfmon.exe /rel"), kind="neutral", width=180).pack(side="left", padx=8)

    def _open_control_panel(self, command: str) -> None:
        if not self._require_windows():
            return
        try:
            subprocess.Popen(command, shell=True)
            self.log(f"ℹ️ Đã yêu cầu mở công cụ Windows: {command}")
        except Exception as exc:
            self.log(f"🔴 Không mở được {command}: {exc}")

    def open_startup_manager(self) -> None:
        """Manage only the current user's HKCU Run values; preserve disabled entries for restore."""
        if not self._require_windows():
            return
        import winreg

        run_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        disabled_path = r"Software\HendyToolsPro\DisabledStartup"
        types_path = r"Software\HendyToolsPro\DisabledStartupTypes"
        dialog = ctk.CTkToplevel(self)
        dialog.title("Quản lý ứng dụng khởi động")
        dialog.geometry("850x620")
        dialog.minsize(700, 470)
        dialog.configure(fg_color=C["bg"])
        dialog.transient(self)
        heading = ctk.CTkFrame(dialog, fg_color="transparent")
        heading.pack(fill="x", padx=18, pady=(16, 6))
        ctk.CTkLabel(heading, text="Ứng dụng khởi động · tài khoản hiện tại", text_color=C["text"], font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w")
        ctk.CTkLabel(heading, text="Các mục bị tắt được lưu trong Registry để bạn có thể bật lại. Không sửa khóa Run của toàn máy.", text_color=C["muted"], font=ctk.CTkFont(size=11), wraplength=790, justify="left").pack(anchor="w", pady=(4, 0))
        rows = ctk.CTkScrollableFrame(dialog, fg_color=C["panel"], corner_radius=12)
        rows.pack(fill="both", expand=True, padx=18, pady=8)
        count_label = ctk.CTkLabel(dialog, text="", text_color=C["muted"], font=ctk.CTkFont(size=11))
        count_label.pack(anchor="w", padx=22, pady=(0, 4))

        def read_values(path: str) -> list[tuple[str, object, int]]:
            result: list[tuple[str, object, int]] = []
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, path, 0, winreg.KEY_READ) as key:
                    idx = 0
                    while True:
                        try:
                            name, value, value_type = winreg.EnumValue(key, idx)
                            result.append((name, value, value_type))
                            idx += 1
                        except OSError:
                            break
            except FileNotFoundError:
                pass
            return result

        def toggle_item(name: str, currently_enabled: bool) -> None:
            try:
                if currently_enabled:
                    if not messagebox.askyesno("Tạm tắt ứng dụng khởi động", f"Tạm tắt mục '{name}' khỏi danh sách khởi động của tài khoản này?\n\nỨng dụng không bị gỡ cài đặt. Bạn có thể bật lại ở đây.", parent=dialog):
                        return
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_path, 0, winreg.KEY_READ) as source:
                        value, value_type = winreg.QueryValueEx(source, name)
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, disabled_path) as target:
                        winreg.SetValueEx(target, name, 0, value_type, value)
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, types_path) as type_key:
                        winreg.SetValueEx(type_key, name, 0, winreg.REG_DWORD, value_type)
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_path, 0, winreg.KEY_SET_VALUE) as source:
                        winreg.DeleteValue(source, name)
                    self.log(f"✅ Đã tạm tắt khởi động: {name}")
                else:
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, disabled_path, 0, winreg.KEY_READ) as source:
                        value, stored_type = winreg.QueryValueEx(source, name)
                    value_type = winreg.REG_SZ
                    try:
                        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, types_path, 0, winreg.KEY_READ) as type_key:
                            value_type, _ = winreg.QueryValueEx(type_key, name)
                    except OSError:
                        value_type = winreg.REG_SZ
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, run_path) as target:
                        winreg.SetValueEx(target, name, 0, int(value_type), value)
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, disabled_path, 0, winreg.KEY_SET_VALUE) as source:
                        winreg.DeleteValue(source, name)
                    try:
                        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, types_path, 0, winreg.KEY_SET_VALUE) as type_key:
                            winreg.DeleteValue(type_key, name)
                    except OSError:
                        pass
                    self.log(f"✅ Đã bật lại khởi động: {name}")
                refresh_rows()
            except Exception as exc:
                self.log(f"🔴 Không thay đổi được mục khởi động '{name}': {exc}")
                messagebox.showerror("Thao tác thất bại", str(exc), parent=dialog)

        def refresh_rows() -> None:
            for child in rows.winfo_children():
                child.destroy()
            active = read_values(run_path)
            disabled = read_values(disabled_path)
            count_label.configure(text=f"Đang bật: {len(active)}   ·   Đã tạm tắt: {len(disabled)}")
            if not active and not disabled:
                ctk.CTkLabel(rows, text="Không có mục Run cho tài khoản này.", text_color=C["muted"]).pack(pady=28)
                return
            for name, value, _kind in sorted(active, key=lambda item: item[0].lower()):
                item = ctk.CTkFrame(rows, fg_color=C["panel_2"], corner_radius=9)
                item.pack(fill="x", padx=5, pady=4)
                body = ctk.CTkFrame(item, fg_color="transparent")
                body.pack(side="left", fill="x", expand=True, padx=12, pady=8)
                ctk.CTkLabel(body, text=f"●  {name}", text_color=C["text"], font=ctk.CTkFont(size=12, weight="bold"), anchor="w").pack(anchor="w")
                ctk.CTkLabel(body, text=str(value)[:240], text_color=C["muted"], font=ctk.CTkFont(size=10), wraplength=560, justify="left", anchor="w").pack(anchor="w", pady=(3, 0))
                self._button(item, "Tạm tắt", lambda n=name: toggle_item(n, True), kind="orange", width=100).pack(side="right", padx=10, pady=8)
            for name, value, _kind in sorted(disabled, key=lambda item: item[0].lower()):
                item = ctk.CTkFrame(rows, fg_color=C["panel_2"], corner_radius=9)
                item.pack(fill="x", padx=5, pady=4)
                body = ctk.CTkFrame(item, fg_color="transparent")
                body.pack(side="left", fill="x", expand=True, padx=12, pady=8)
                ctk.CTkLabel(body, text=f"○  {name} · ĐÃ TẮT", text_color=C["orange"], font=ctk.CTkFont(size=12, weight="bold"), anchor="w").pack(anchor="w")
                ctk.CTkLabel(body, text=str(value)[:240], text_color=C["muted"], font=ctk.CTkFont(size=10), wraplength=560, justify="left", anchor="w").pack(anchor="w", pady=(3, 0))
                self._button(item, "Bật lại", lambda n=name: toggle_item(n, False), kind="green", width=100).pack(side="right", padx=10, pady=8)

        footer = ctk.CTkFrame(dialog, fg_color="transparent")
        footer.pack(fill="x", padx=18, pady=(4, 15))
        self._button(footer, "Làm mới", refresh_rows, kind="neutral", width=110).pack(side="left")
        self._button(footer, "Mở Startup Settings", lambda: self.open_windows_settings("ms-settings:startupapps"), kind="primary", width=180).pack(side="right")
        refresh_rows()

    def run_health_scan(self) -> None:
        if not self._require_admin():
            return
        if not messagebox.askyesno("Quét sức khỏe Windows", "Chạy SFC /verifyonly và DISM /ScanHealth? Đây là tác vụ chẩn đoán, không tự sửa tệp; có thể mất 10–30 phút hoặc lâu hơn."):
            return
        self._start_worker("SFC + DISM ScanHealth", self._run_health_scan_worker)

    def _run_health_scan_worker(self) -> None:
        commands = [
            ("SFC /verifyonly", ["sfc", "/verifyonly"], 1800),
            ("DISM /Online /Cleanup-Image /ScanHealth", ["DISM", "/Online", "/Cleanup-Image", "/ScanHealth"], 3600),
        ]
        for label, command, timeout in commands:
            self.log(f"🔎 Đang chạy {label}...")
            try:
                result = self._run_command(command, timeout=timeout)
                output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
                if result.returncode == 0:
                    self.log(f"✅ {label} hoàn tất. {output[-650:]}")
                else:
                    self.log(f"⚠️ {label} kết thúc với mã {result.returncode}. {output[-900:]}")
            except subprocess.TimeoutExpired:
                self.log(f"⚠️ {label} vượt thời gian chờ; kiểm tra log Windows để biết trạng thái.")
            except Exception as exc:
                self.log(f"🔴 Lỗi {label}: {exc}")

    def run_defender_quick_scan(self) -> None:
        if not self._require_windows():
            return
        if not messagebox.askyesno("Microsoft Defender", "Bắt đầu quét virus nhanh bằng Microsoft Defender? Nếu Defender bị vô hiệu hóa hoặc máy dùng antivirus khác, thao tác có thể thất bại."):
            return
        self._start_worker("Microsoft Defender Quick Scan", self._run_defender_quick_scan_worker)

    def _run_defender_quick_scan_worker(self) -> None:
        command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Start-MpScan -ScanType QuickScan; Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled | Format-List"]
        try:
            result = self._run_command(command, timeout=1800)
            output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
            if result.returncode == 0:
                self.log(f"✅ Lệnh quét nhanh Defender đã kết thúc. {output[-800:]}")
            else:
                self.log(f"⚠️ Defender không hoàn tất (mã {result.returncode}). {output[-1000:]}")
        except Exception as exc:
            self.log(f"🔴 Không thể chạy Defender Quick Scan: {exc}")

    def create_restore_point(self) -> None:
        if not self._require_windows():
            return
        if not self._require_admin():
            return
        if not messagebox.askyesno("Tạo điểm khôi phục", "Thử tạo điểm khôi phục Windows trước khi bảo trì? Cần System Protection được bật; điểm khôi phục không thay thế backup tệp."):
            return
        self._start_worker("Tạo điểm khôi phục", self._create_restore_point_worker)

    def _create_restore_point_worker(self) -> None:
        ps = "Checkpoint-Computer -Description 'Hendy Tools Pro pre-maintenance' -RestorePointType 'MODIFY_SETTINGS'"
        result = self._run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], timeout=300)
        output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
        if result.returncode == 0:
            self.log("✅ Windows báo lệnh tạo điểm khôi phục hoàn tất.")
        else:
            self.log(f"⚠️ Không tạo được điểm khôi phục. Kiểm tra System Protection/giới hạn hệ thống. {output[-1000:]}")

    def set_power_plan(self) -> None:
        if not self._require_windows():
            return
        label = self.power_plan_var.get()
        plans = {
            "Balanced": "381b4222-f694-41f0-9685-ff5bb260df2e",
            "High performance": "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
            "Power saver": "a1841308-3541-4fab-bc81-f71556f20b4a",
        }
        guid = plans.get(label)
        if not guid:
            return
        if not messagebox.askyesno("Thay đổi chế độ nguồn", f"Chuyển chế độ nguồn sang '{label}'? High performance có thể tăng điện năng tiêu thụ, nhiệt độ và tiếng quạt."):
            return
        def work():
            try:
                current = self._run_command(["powercfg", "/list"], timeout=20)
                if current.returncode != 0:
                    self.log(f"🔴 Không đọc được power plan: {(current.stderr or current.stdout).strip()}")
                    return
                if guid.lower() not in current.stdout.lower():
                    self.log(f"⚠️ Chế độ '{label}' không có trong danh sách power plan của máy này. Không thay đổi gì.")
                    return
                result = self._run_command(["powercfg", "/setactive", guid], timeout=30)
                if result.returncode == 0:
                    self.log(f"✅ Đã chuyển power plan sang '{label}'.")
                else:
                    self.log(f"🔴 Không chuyển được power plan: {(result.stderr or result.stdout).strip()}")
            except Exception as exc:
                self.log(f"🔴 Lỗi thay đổi power plan: {exc}")
        self._start_worker("Thay đổi chế độ nguồn", work)

    def generate_battery_report(self) -> None:
        if not self._require_windows():
            return
        out = USER_DATA_DIR / "reports" / f"battery-report-{datetime.now():%Y%m%d-%H%M%S}.html"
        def work():
            out.parent.mkdir(parents=True, exist_ok=True)
            try:
                result = self._run_command(["powercfg", "/batteryreport", "/output", str(out)], timeout=90)
                output = ((result.stdout or "") + " " + (result.stderr or "")).strip()
                if result.returncode == 0 and out.exists():
                    self.log(f"✅ Đã tạo báo cáo pin: {out}")
                    self._post(self.open_path, out)
                else:
                    self.log(f"ℹ️ Không tạo được báo cáo pin (có thể máy desktop không có pin): {output[-700:]}")
            except Exception as exc:
                self.log(f"🔴 Lỗi báo cáo pin: {exc}")
        self._start_worker("Tạo báo cáo pin", work)

    def generate_system_report(self) -> None:
        if not self._require_windows():
            return
        self._start_worker("Xuất báo cáo hệ thống", self._generate_system_report_worker)

    def _generate_system_report_worker(self) -> None:
        report_dir = USER_DATA_DIR / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        out = report_dir / f"system-report-{datetime.now():%Y%m%d-%H%M%S}.txt"
        sections = [
            ("SYSTEM INFO", ["systeminfo"], 120),
            ("NETWORK CONFIGURATION", ["ipconfig", "/all"], 45),
            ("DRIVER LIST", ["driverquery", "/fo", "csv"], 90),
            ("ACTIVE POWER PLAN", ["powercfg", "/getactivescheme"], 30),
        ]
        with out.open("w", encoding="utf-8-sig") as handle:
            handle.write(f"Hendy Tools Pro - Local system report\nCreated: {datetime.now().isoformat(timespec='seconds')}\n\n")
            for title, command, timeout in sections:
                handle.write(f"\n{'=' * 18} {title} {'=' * 18}\n")
                try:
                    result = self._run_command(command, timeout=timeout)
                    handle.write(result.stdout or "")
                    if result.stderr:
                        handle.write("\n[STDERR]\n" + result.stderr)
                    handle.write(f"\n[Exit code: {result.returncode}]\n")
                except Exception as exc:
                    handle.write(f"[ERROR] {exc}\n")
        self.log(f"✅ Đã xuất báo cáo hệ thống cục bộ: {out}")
        self.log("🔐 Báo cáo có thể chứa thông tin thiết bị/mạng; hãy xem lại trước khi gửi cho người khác.")
        self._post(self.open_path, out)

    def check_winget_updates(self) -> None:
        if not self._require_windows():
            return
        self._start_worker("Kiểm tra cập nhật WinGet", self._check_winget_updates_worker)

    def _check_winget_updates_worker(self) -> None:
        try:
            result = self._run_command(["winget", "upgrade", "--accept-source-agreements"], timeout=900)
            output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
            report_dir = USER_DATA_DIR / "reports"
            report_dir.mkdir(parents=True, exist_ok=True)
            out = report_dir / f"winget-upgrades-{datetime.now():%Y%m%d-%H%M%S}.txt"
            out.write_text(output or "Không có đầu ra từ WinGet.", encoding="utf-8-sig")
            if result.returncode == 0:
                self.log(f"✅ Hoàn tất kiểm tra WinGet. Không cài/gỡ/cập nhật phần mềm. Báo cáo: {out}")
            else:
                self.log(f"⚠️ WinGet trả mã {result.returncode}; kiểm tra báo cáo {out}. WinGet có thể chưa được cài/cấu hình.")
            self._post(self.open_path, out)
        except FileNotFoundError:
            self.log("⚠️ Không tìm thấy WinGet. Cài/cập nhật App Installer từ Microsoft Store rồi thử lại.")
        except Exception as exc:
            self.log(f"🔴 Lỗi kiểm tra WinGet: {exc}")

    def flush_dns_cache(self) -> None:
        if not self._require_windows():
            return
        if not messagebox.askyesno("Xóa cache DNS", "Xóa bộ nhớ đệm DNS cục bộ để khắc phục một số lỗi phân giải tên miền? Thao tác không xóa mật khẩu hoặc lịch sử trình duyệt."):
            return
        def work():
            try:
                result = self._run_command(["ipconfig", "/flushdns"], timeout=30)
                output = ((result.stdout or "") + " " + (result.stderr or "")).strip()
                if result.returncode == 0:
                    self.log(f"✅ Cache DNS đã được làm mới. {output[-500:]}")
                else:
                    self.log(f"⚠️ Không xóa được cache DNS (mã {result.returncode}): {output[-700:]}")
            except Exception as exc:
                self.log(f"🔴 Lỗi xóa cache DNS: {exc}")
        self._start_worker("Xóa cache DNS", work)

    # ---------- Queue / logging / common helpers ----------
    def _post(self, fn: Callable, *args, **kwargs) -> None:
        self.events.put(("call", fn, args, kwargs))

    def _pump_events(self) -> None:
        try:
            while True:
                item = self.events.get_nowait()
                kind = item[0]
                if kind == "log":
                    self._append_log(item[1])
                elif kind == "call":
                    _, fn, args, kwargs = item
                    try:
                        fn(*args, **kwargs)
                    except Exception as exc:
                        self._append_log(f"🔴 Lỗi cập nhật giao diện: {exc}")
                elif kind == "job_delta":
                    with self._job_lock:
                        self._active_jobs = max(0, self._active_jobs + item[1])
        except queue.Empty:
            pass
        if self.winfo_exists():
            self.after(100, self._pump_events)

    def log(self, message: str) -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        self.events.put(("log", f"[{stamp}] {message}"))

    def _append_log(self, line: str) -> None:
        self.textbox_log.insert("end", line + "\n")
        self.textbox_log.see("end")

    def clear_log(self) -> None:
        self.textbox_log.delete("1.0", "end")

    def _cloud_write(self, text: str, clear: bool = False) -> None:
        if clear:
            self.textbox_classify.delete("1.0", "end")
        self.textbox_classify.insert("end", text)
        self.textbox_classify.see("end")

    def _metric_tick(self) -> None:
        if not self.winfo_exists():
            return
        self.refresh_metrics()
        self.after(3000, self._metric_tick)

    def _tick_clock(self) -> None:
        if not self.winfo_exists():
            return
        self.lbl_time.configure(text=datetime.now().strftime("%H:%M:%S"))
        self.after(1000, self._tick_clock)

    def _start_worker(self, description: str, fn: Callable, *args) -> None:
        def runner():
            self.events.put(("job_delta", 1))
            self.log(f"⏳ Bắt đầu: {description}")
            try:
                fn(*args)
            except Exception as exc:
                self.log(f"🔴 {description} thất bại: {exc}")
            finally:
                self.log(f"🏁 Kết thúc tác vụ: {description}")
                self.events.put(("job_delta", -1))
        threading.Thread(target=runner, name=f"Hendy-{description[:20]}", daemon=True).start()

    def is_admin(self) -> bool:
        if not IS_WINDOWS:
            return False
        try:
            import ctypes
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False

    def _require_windows(self) -> bool:
        if not IS_WINDOWS:
            self.log("⚠️ Tính năng này chỉ hỗ trợ Windows.")
            return False
        return True

    def _require_admin(self) -> bool:
        if not self._require_windows():
            return False
        if not self.is_admin():
            self.log("🔴 Tác vụ bị chặn: hãy đóng ứng dụng và chạy lại bằng Run as administrator.")
            messagebox.showwarning("Cần quyền Administrator", "Tác vụ này yêu cầu quyền Administrator. Hãy mở lại ứng dụng bằng Run as administrator.")
            return False
        return True

    def _run_command(self, args: list[str], timeout: int = 300, check: bool = False) -> subprocess.CompletedProcess:
        kwargs = {"capture_output": True, "text": True, "timeout": timeout, "check": check}
        if IS_WINDOWS:
            kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        return subprocess.run(args, **kwargs)

    def get_available_drives(self) -> list[str]:
        if IS_WINDOWS:
            return [f"{letter}:\\" for letter in string.ascii_uppercase if os.path.exists(f"{letter}:\\")]
        return ["/"]

    def refresh_metrics(self) -> None:
        try:
            if psutil is not None:
                cpu = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory()
                self.metric_labels["cpu"].configure(text=f"{cpu:.0f}%")
                self.metric_bars["cpu"].set(max(0.0, min(1.0, cpu / 100)))
                self.metric_labels["ram"].configure(text=f"{mem.percent:.0f}%  ·  {self._gb(mem.used)} / {self._gb(mem.total)} GB")
                self.metric_bars["ram"].set(max(0.0, min(1.0, mem.percent / 100)))
            else:
                self.metric_labels["cpu"].configure(text="Cài psutil")
                self.metric_labels["ram"].configure(text="Cài psutil")
            root = os.environ.get("SystemDrive", "C:") + "\\" if IS_WINDOWS else "/"
            usage = shutil.disk_usage(root)
            used_ratio = usage.used / usage.total if usage.total else 0
            self.metric_labels["disk"].configure(text=f"{used_ratio * 100:.0f}%  ·  {self._gb(usage.free)} GB trống")
            self.metric_bars["disk"].set(max(0.0, min(1.0, used_ratio)))
            self.on_drive_change(self.selected_drive.get())
        except Exception as exc:
            self.log(f"⚠️ Không thể cập nhật số liệu: {exc}")

    @staticmethod
    def _gb(value: int) -> float:
        return value / (1024 ** 3)

    # ---------- Fast actions / Windows maintenance ----------
    def open_uac_settings(self) -> None:
        if not self._require_windows():
            return
        try:
            subprocess.Popen(["UserAccountControlSettings.exe"])
            self.log("ℹ️ Đã mở UAC Settings. Không có thay đổi UAC nào được áp dụng tự động.")
        except Exception as exc:
            self.log(f"🔴 Không mở được UAC Settings: {exc}")

    def open_windows_security(self) -> None:
        if not self._require_windows():
            return
        try:
            os.startfile("windowsdefender:")  # type: ignore[attr-defined]
        except Exception as exc:
            self.log(f"🔴 Không mở được Windows Security: {exc}")

    def open_server_manager(self) -> None:
        if not self._require_windows():
            return
        try:
            subprocess.Popen(["ServerManager.exe"])
            self.log("ℹ️ Đã yêu cầu mở Server Manager. IE Enhanced Security chỉ áp dụng trên một số phiên bản Windows Server.")
        except Exception as exc:
            self.log(f"ℹ️ Server Manager không có trên phiên bản Windows này: {exc}")

    def restart_pc(self) -> None:
        if not self._require_windows():
            return
        if not messagebox.askyesno("Khởi động lại Windows", "Lưu mọi tài liệu đang mở trước. Máy sẽ khởi động lại sau 15 giây. Tiếp tục?"):
            return
        try:
            result = self._run_command(["shutdown", "/r", "/t", "15"], timeout=10)
            if result.returncode == 0:
                self.log("⚠️ Windows đã lên lịch khởi động lại sau 15 giây. Dùng 'shutdown /a' để hủy nếu cần.")
            else:
                self.log(f"🔴 Không lên lịch restart được: {(result.stderr or result.stdout).strip()}")
        except Exception as exc:
            self.log(f"🔴 Lỗi lên lịch restart: {exc}")

    def open_task_manager(self) -> None:
        if not self._require_windows():
            return
        try:
            subprocess.Popen(["taskmgr.exe"])
            self.log("✅ Đã mở Task Manager. Windows tự quản lý lịch CPU/RAM; ứng dụng không giả lập nút tăng tốc.")
        except Exception as exc:
            self.log(f"🔴 Không mở được Task Manager: {exc}")

    def opt_ram(self) -> None:
        self.refresh_metrics()
        self.log("ℹ️ Đã làm mới số liệu RAM. Windows quản lý bộ nhớ tự động; giải phóng working set của riêng ứng dụng không làm tăng RAM khả dụng một cách bền vững.")

    def opt_cpu(self) -> None:
        self.open_task_manager()

    def extend_drive_c(self) -> None:
        if not self._require_windows():
            return
        confirmed = messagebox.askyesno(
            "Disk Management",
            "Mở Disk Management để bạn kiểm tra phân vùng. Ứng dụng không tự thay đổi kích thước phân vùng vì kết quả phụ thuộc cấu trúc ổ đĩa.\n\nBạn nên sao lưu dữ liệu trước khi thao tác. Mở công cụ?",
        )
        if not confirmed:
            return
        try:
            subprocess.Popen(["mmc.exe", "diskmgmt.msc"], shell=False)
            self.log("✅ Đã mở Disk Management. Chưa có phân vùng nào bị thay đổi tự động.")
        except Exception as exc:
            self.log(f"🔴 Không mở được Disk Management: {exc}")

    def open_windows_settings(self, uri: str) -> None:
        if not self._require_windows():
            return
        try:
            os.startfile(uri)  # type: ignore[attr-defined]
        except Exception:
            try:
                subprocess.Popen(["cmd", "/c", "start", "", uri], shell=False)
            except Exception as exc:
                self.log(f"🔴 Không mở được Windows Settings: {exc}")

    def sync_time_with_ntp(self) -> None:
        if not self._require_windows():
            return
        if not messagebox.askyesno("Đồng bộ giờ", "Chạy w32tm /resync để đồng bộ thời gian Windows? Một số máy cần quyền Administrator."):
            return
        def work():
            result = self._run_command(["w32tm", "/resync"], timeout=30)
            output = (result.stdout or "").strip() or (result.stderr or "").strip()
            if result.returncode == 0:
                self.log(f"✅ Đồng bộ NTP thành công. {output}")
            else:
                self.log(f"🔴 Đồng bộ NTP thất bại (mã {result.returncode}). {output}")
        self._start_worker("Đồng bộ NTP", work)

    def install_vi_language(self) -> None:
        if not self._require_windows():
            return
        if not messagebox.askyesno("Cài tiếng Việt", "Windows sẽ tải gói ngôn ngữ vi-VN từ Microsoft. Quá trình cần Internet, có thể lâu và cần quyền Administrator. Tiếp tục?"):
            return
        def work():
            ps = "Install-Language vi-VN; Set-WinUILanguageOverride -Language vi-VN"
            result = self._run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], timeout=1800)
            output = (result.stdout or "").strip() or (result.stderr or "").strip()
            if result.returncode == 0:
                self.log("✅ Lệnh cài tiếng Việt hoàn tất. Hãy kiểm tra Language settings và đăng xuất/khởi động lại nếu được yêu cầu.")
            else:
                self.log(f"🔴 Cài tiếng Việt thất bại (mã {result.returncode}). {output[-1200:]}")
        self._start_worker("Cài gói tiếng Việt", work)

    def restore_windows_features(self) -> None:
        if not self._require_admin():
            return
        if not messagebox.askyesno("Khôi phục tính năng Windows", "Thử bật lại Windows Update, Windows Recovery Environment và Hibernation? Thao tác không thay đổi thiết lập thời gian ngủ hoặc các khóa giao diện Taskbar/khay hệ thống."):
            return
        self._start_worker("Khôi phục Update / RE / Hibernate", self._restore_windows_features)

    def _restore_windows_features(self) -> None:
        commands = [
            ("Windows Update", ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Service -Name wuauserv -StartupType Manual; Start-Service -Name wuauserv"]),
            ("Windows Recovery Environment", ["reagentc", "/enable"]),
            ("Hibernation", ["powercfg", "/hibernate", "on"]),
        ]
        for title, command in commands:
            try:
                result = self._run_command(command, timeout=180)
                output = ((result.stdout or "") + " " + (result.stderr or "")).strip()
                if result.returncode == 0:
                    self.log(f"✅ Đã yêu cầu khôi phục {title}.")
                else:
                    self.log(f"⚠️ Không khôi phục được {title} (mã {result.returncode}): {output[-500:]}")
            except Exception as exc:
                self.log(f"🔴 Lỗi khôi phục {title}: {exc}")

    def apply_window_optimizations(self) -> None:
        if not self._require_windows():
            return
        selected = [key for key, var in self.opt_vars.items() if var.get()]
        if not selected:
            self.log("ℹ️ Chưa chọn tùy chỉnh nào.")
            return
        risky = {"update", "rec", "hiber"}.intersection(selected)
        warning = "\n\nLưu ý: thao tác có thể thay đổi trạng thái cập nhật, khôi phục hoặc ngủ đông của Windows. Hãy sao lưu dữ liệu và chỉ tiếp tục nếu bạn hiểu ảnh hưởng."
        temp_note = "\n\nCẢNH BÁO: send2trash chưa cài; mục Temp cũ hơn 24 giờ sẽ bị xóa trực tiếp, không vào Thùng rác." if "temp" in selected and send2trash is None else ""
        if not messagebox.askyesno("Xác nhận bảo trì Windows", f"Sẽ chạy {len(selected)} tùy chỉnh: {', '.join(selected)}.{warning if risky else ''}{temp_note}\n\nTiếp tục?"):
            return
        if any(key in selected for key in ("update", "rec", "hiber", "sleep")) and not self.is_admin():
            if not messagebox.askyesno("Cần quyền Administrator", "Một số thay đổi có thể thất bại khi không chạy bằng quyền Administrator. Vẫn thử thực hiện các tùy chọn đã chọn?"):
                return
        self._start_worker("Áp dụng tùy chỉnh Windows", self._apply_selected_tweaks, selected)

    def _apply_selected_tweaks(self, selected: list[str]) -> None:
        for key in selected:
            try:
                if key == "temp":
                    removed, failed, freed = self._clear_temp()
                    self.log(f"✅ Dọn Temp: {removed} mục đã chuyển/xóa, bỏ qua {failed} mục; giải phóng khoảng {self._size_text(freed)}.")
                elif key == "sleep":
                    if not self.is_admin():
                        self.log("⚠️ Tắt chế độ ngủ có thể yêu cầu quyền Administrator; bỏ qua mục này.")
                        continue
                    results = [self._run_command(["powercfg", "/change", "standby-timeout-ac", "0"]), self._run_command(["powercfg", "/change", "standby-timeout-dc", "0"])]
                    if all(r.returncode == 0 for r in results):
                        self.log("✅ Đã đặt thời gian ngủ về Never cho nguồn AC/DC.")
                    else:
                        self.log("🔴 Không thể thay đổi thời gian ngủ. Hãy kiểm tra quyền Administrator và power plan.")
                elif key == "hiber":
                    if not self.is_admin():
                        self.log("⚠️ Tắt ngủ đông cần quyền Administrator; bỏ qua mục này.")
                        continue
                    res = self._run_command(["powercfg", "/hibernate", "off"])
                    self.log("✅ Đã tắt hibernation." if res.returncode == 0 else f"🔴 Tắt hibernation thất bại: {(res.stderr or res.stdout).strip()}")
                elif key == "update":
                    if not self.is_admin():
                        self.log("⚠️ Tạm dừng Windows Update cần quyền Administrator; bỏ qua mục này.")
                        continue
                    ps = "Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue; Set-Service -Name wuauserv -StartupType Manual"
                    res = self._run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])
                    self.log("✅ Đã yêu cầu dừng Windows Update và đặt startup thành Manual. Hãy bật lại sau bảo trì." if res.returncode == 0 else f"🔴 Không thay đổi được Windows Update: {(res.stderr or res.stdout).strip()}")
                elif key == "rec":
                    if not self.is_admin():
                        self.log("⚠️ Tắt Windows Recovery Environment cần quyền Administrator; bỏ qua mục này.")
                        continue
                    res = self._run_command(["reagentc", "/disable"])
                    self.log("✅ Đã yêu cầu tắt Windows RE. Cân nhắc bật lại sau khi hoàn tất." if res.returncode == 0 else f"🔴 Tắt Windows RE thất bại: {(res.stderr or res.stdout).strip()}")
                elif key == "taskbar":
                    if not IS_WINDOWS:
                        continue
                    import winreg
                    path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, path) as key_handle:
                        winreg.SetValueEx(key_handle, "TaskbarSmallIcons", 0, winreg.REG_DWORD, 1)
                    self.log("ℹ️ Đã ghi tùy chọn TaskbarSmallIcons cho tài khoản hiện tại. Windows 11 có thể bỏ qua giá trị này.")
                elif key == "tray":
                    import winreg
                    path = r"Software\Microsoft\Windows\CurrentVersion\Explorer"
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, path) as key_handle:
                        winreg.SetValueEx(key_handle, "EnableAutoTray", 0, winreg.REG_DWORD, 0)
                    self.log("✅ Đã bật tùy chọn hiển thị icon khay hệ thống. Có thể cần đăng xuất hoặc khởi động lại Explorer.")
            except Exception as exc:
                self.log(f"🔴 Tùy chỉnh '{key}' thất bại: {exc}")

    # ---------- User/account/network administration ----------
    def change_admin(self) -> None:
        if not self._require_admin():
            return
        new_name = self.entry_admin.get().strip()
        if not new_name or not all(ch.isalnum() or ch in "._-" for ch in new_name):
            self.log("🔴 Tên tài khoản không hợp lệ. Chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.")
            return
        if not messagebox.askyesno("Đổi tên tài khoản", f"Thử đổi tên tài khoản cục bộ hiện tại thành '{new_name}'? Thao tác có thể thất bại với tài khoản Microsoft/domain."):
            return
        current = getpass.getuser()
        ps = f"Rename-LocalUser -Name $env:USERNAME -NewName '{new_name}'"
        def work():
            result = self._run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], timeout=60)
            if result.returncode == 0:
                self.log(f"✅ Windows đã đổi tên tài khoản cục bộ '{current}' thành '{new_name}'.")
            else:
                self.log(f"🔴 Đổi tên thất bại: {((result.stderr or result.stdout).strip())[-900:]}")
        self._start_worker("Đổi tên tài khoản", work)

    def change_rdp_port(self) -> None:
        if not self._require_admin():
            return
        raw = self.entry_rdp.get().strip()
        if not raw.isdigit() or not 1 <= int(raw) <= 65535:
            self.log("🔴 Port RDP không hợp lệ. Nhập số trong khoảng 1–65535.")
            return
        port = int(raw)
        if port == 3389:
            self.log("ℹ️ Port RDP đã là giá trị mặc định 3389.")
        if not messagebox.askyesno("Thay đổi cổng RDP", f"Đặt port RDP trong Registry thành {port} và thêm firewall rule chỉ cho profile Domain/Private?\n\nThay đổi này có thể làm ngắt kết nối từ xa và thường cần khởi động lại dịch vụ/máy. Nó KHÔNG tự bật Remote Desktop."):
            return
        def work():
            reg = self._run_command(["reg", "add", r"HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp", "/v", "PortNumber", "/t", "REG_DWORD", "/d", str(port), "/f"])
            if reg.returncode != 0:
                self.log(f"🔴 Không ghi được port RDP: {(reg.stderr or reg.stdout).strip()}")
                return
            ps = f"if (-not (Get-NetFirewallRule -DisplayName 'Hendy Tools RDP {port}' -ErrorAction SilentlyContinue)) {{ New-NetFirewallRule -DisplayName 'Hendy Tools RDP {port}' -Direction Inbound -Protocol TCP -LocalPort {port} -Action Allow -Profile Domain,Private | Out-Null }}"
            fw = self._run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])
            if fw.returncode == 0:
                self.log(f"✅ Đã ghi port RDP {port} và thêm/quy chiếu firewall rule Domain/Private. Kiểm tra RDP settings và khởi động lại dịch vụ nếu cần.")
            else:
                self.log(f"⚠️ Đã ghi port RDP {port}, nhưng firewall rule thất bại: {(fw.stderr or fw.stdout).strip()}")
        self._start_worker("Đổi port RDP", work)

    def open_firewall_port(self) -> None:
        if not self._require_admin():
            return
        raw = self.entry_fw.get().strip()
        if not raw.isdigit() or not 1 <= int(raw) <= 65535:
            self.log("🔴 Port firewall không hợp lệ. Nhập số trong khoảng 1–65535.")
            return
        port = int(raw)
        if not messagebox.askyesno("Mở port firewall", f"Thêm rule cho phép kết nối TCP đến port {port} trên profile Domain/Private? Chỉ tiếp tục nếu biết dịch vụ nào sẽ lắng nghe cổng này."):
            return
        def work():
            name = f"HendyTools-TCP-{port}"
            result = self._run_command(["netsh", "advfirewall", "firewall", "add", "rule", f"name={name}", "dir=in", "action=allow", "protocol=TCP", f"localport={port}", "profile=domain,private"])
            out = (result.stdout or result.stderr).strip()
            self.log(f"✅ Đã thêm firewall rule TCP/{port}. {out}" if result.returncode == 0 else f"🔴 Không thể thêm firewall rule: {out}")
        self._start_worker("Mở firewall port", work)

    def change_password(self) -> None:
        if not self._require_admin():
            return
        password = self.entry_pass.get()
        if len(password) < 8:
            self.log("🔴 Mật khẩu mới phải có ít nhất 8 ký tự.")
            return
        if not messagebox.askyesno("Đổi mật khẩu Windows", f"Thử đặt mật khẩu cho tài khoản cục bộ '{getpass.getuser()}'? Tài khoản Microsoft/domain có thể không được hỗ trợ."):
            return
        self.entry_pass.delete(0, "end")
        username = getpass.getuser()
        def work():
            if not IS_WINDOWS:
                self.log("🔴 Chỉ hỗ trợ tài khoản Windows cục bộ.")
                return
            try:
                import ctypes
                from ctypes import wintypes
                class USER_INFO_1003(ctypes.Structure):
                    _fields_ = [("usri1003_password", wintypes.LPWSTR)]
                info = USER_INFO_1003(password)
                param_error = wintypes.DWORD(0)
                netapi = ctypes.WinDLL("Netapi32.dll")
                func = netapi.NetUserSetInfo
                func.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, wintypes.LPBYTE, ctypes.POINTER(wintypes.DWORD)]
                func.restype = wintypes.DWORD
                status = func(None, username, 1003, ctypes.cast(ctypes.byref(info), wintypes.LPBYTE), ctypes.byref(param_error))
                if status == 0:
                    self.log(f"✅ Windows API đã chấp nhận đổi mật khẩu cho '{username}'.")
                else:
                    self.log(f"🔴 Đổi mật khẩu thất bại. Windows NetUserSetInfo status={status}; kiểm tra loại tài khoản và chính sách mật khẩu.")
            except Exception as exc:
                self.log(f"🔴 Lỗi đổi mật khẩu: {exc}")
        self._start_worker("Đổi mật khẩu Windows", work)

    def download_selected_apps(self) -> None:
        selected = [name for name, var in self.app_vars.items() if var.get()]
        if not selected:
            self.log("ℹ️ Chọn ít nhất một phần mềm trước khi cài đặt.")
            return
        if not self._require_windows():
            return
        if shutil.which("winget") is None:
            messagebox.showerror("Không tìm thấy WinGet", "Máy chưa có winget hoặc chưa nằm trong PATH. Hãy cập nhật App Installer từ Microsoft Store rồi thử lại.")
            self.log("🔴 Không tìm thấy WinGet.")
            return
        unsupported = [name for name in selected if name not in WINGET_IDS and name != "Net Framework 3.5"]
        install_list = [name for name in selected if name in WINGET_IDS or name == "Net Framework 3.5"]
        preview = "\n".join(install_list + ([f"Không tự cài: {name}" for name in unsupported]))
        if not messagebox.askyesno("Xác nhận cài phần mềm", f"WinGet/DISM sẽ cài hoặc kích hoạt các mục đã chọn:\n\n{preview}\n\nỨng dụng có thể tải bộ cài từ Internet và thay đổi máy. Tiếp tục?"):
            return
        self._start_worker("Cài phần mềm qua WinGet", self._install_selected_apps, selected, bool(self.var_chrome_default.get()))

    def _install_selected_apps(self, selected: list[str], open_default_settings: bool) -> None:
        installed = 0
        for app_name in selected:
            if app_name == "WordPress (CMS)":
                self.log("ℹ️ WordPress là CMS/web application, không có gói desktop WinGet phổ quát; không tự cài mục này.")
                continue
            if app_name == "Net Framework 3.5":
                if not self.is_admin():
                    self.log("⚠️ .NET Framework 3.5 cần quyền Administrator; bỏ qua mục này.")
                    continue
                self.log("⏳ Đang bật .NET Framework 3.5 bằng DISM…")
                result = self._run_command(["dism", "/online", "/enable-feature", "/featurename:NetFx3", "/All", "/NoRestart"], timeout=1800)
                if result.returncode == 0:
                    installed += 1
                    self.log("✅ Đã yêu cầu bật .NET Framework 3.5.")
                else:
                    self.log(f"🔴 Bật .NET Framework 3.5 thất bại: {((result.stderr or result.stdout).strip())[-700:]}")
                continue
            package_id = WINGET_IDS.get(app_name)
            if not package_id:
                self.log(f"⚠️ Không có WinGet package ID đã cấu hình cho {app_name}; đã bỏ qua.")
                continue
            self.log(f"⏳ Đang cài {app_name} ({package_id})…")
            try:
                result = self._run_command([
                    "winget", "install", "--id", package_id, "-e", "--silent",
                    "--accept-package-agreements", "--accept-source-agreements",
                ], timeout=3600)
                combined = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
                if result.returncode == 0:
                    installed += 1
                    self.log(f"✅ WinGet báo cài đặt thành công: {app_name}.")
                elif "already installed" in combined.lower():
                    self.log(f"ℹ️ {app_name} đã có trên máy.")
                else:
                    self.log(f"🔴 Cài {app_name} thất bại (mã {result.returncode}): {combined[-700:]}")
            except subprocess.TimeoutExpired:
                self.log(f"⚠️ Cài {app_name} vượt quá thời gian chờ; kiểm tra WinGet hoặc bộ cài đang chạy.")
            except Exception as exc:
                self.log(f"🔴 Lỗi WinGet với {app_name}: {exc}")
        self.log(f"🏁 Hoàn tất danh sách cài phần mềm. Số mục được WinGet/DISM báo thành công: {installed}.")
        if open_default_settings:
            self._post(self.open_windows_settings, "ms-settings:defaultapps")
            self.log("ℹ️ Đã mở Settings để bạn tự đặt Chrome làm trình duyệt mặc định; Windows không cho đặt mặc định tự động một cách đáng tin cậy.")

    # ---------- Process manager (no blanket process killing) ----------
    def open_process_manager(self) -> None:
        if psutil is None:
            messagebox.showinfo("Cần psutil", "Cài thư viện bằng lệnh: pip install psutil")
            return
        dialog = ctk.CTkToplevel(self)
        dialog.title("Quản lý tiến trình người dùng")
        dialog.geometry("760x600")
        dialog.minsize(650, 450)
        dialog.configure(fg_color=C["bg"])
        dialog.transient(self)
        head = ctk.CTkFrame(dialog, fg_color="transparent")
        head.pack(fill="x", padx=18, pady=(16, 6))
        ctk.CTkLabel(head, text="Chọn rõ ứng dụng cần đóng", font=ctk.CTkFont(size=18, weight="bold"), text_color=C["text"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Tiến trình hệ thống và Explorer được bảo vệ. Lưu công việc trước khi đóng ứng dụng.", text_color=C["muted"], font=ctk.CTkFont(size=11)).pack(anchor="w", pady=(4, 0))
        list_frame = ctk.CTkScrollableFrame(dialog, fg_color=C["panel"], corner_radius=12)
        list_frame.pack(fill="both", expand=True, padx=18, pady=8)
        process_vars: dict[int, ctk.BooleanVar] = {}
        process_objects: dict[int, str] = {}

        def refresh_list() -> None:
            for widget in list_frame.winfo_children():
                widget.destroy()
            process_vars.clear()
            process_objects.clear()
            items = []
            for proc in psutil.process_iter(["pid", "name", "username", "memory_info"]):
                try:
                    info = proc.info
                    name = info.get("name") or "(unknown)"
                    username = info.get("username") or ""
                    if name.lower() in PROTECTED_PROCESS_NAMES or name.lower().startswith(("system", "wininit", "csrss")):
                        continue
                    # Only expose processes owned by the current user unless username is unavailable.
                    if username and getpass.getuser().lower() not in username.lower():
                        continue
                    rss = getattr(info.get("memory_info"), "rss", 0) or 0
                    items.append((int(info["pid"]), name, rss))
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, KeyError, TypeError):
                    continue
            items.sort(key=lambda item: item[2], reverse=True)
            for pid, name, rss in items[:250]:
                row = ctk.CTkFrame(list_frame, fg_color=C["panel_2"], corner_radius=7)
                row.pack(fill="x", padx=5, pady=3)
                var = ctk.BooleanVar(value=False)
                process_vars[pid] = var
                process_objects[pid] = name
                ctk.CTkCheckBox(row, text="", variable=var, width=22).pack(side="left", padx=(10, 2), pady=8)
                ctk.CTkLabel(row, text=name, text_color=C["text"], font=ctk.CTkFont(size=11, weight="bold"), anchor="w").pack(side="left", fill="x", expand=True, padx=5)
                ctk.CTkLabel(row, text=f"PID {pid}  ·  {rss / (1024**2):.0f} MB", text_color=C["muted"], font=ctk.CTkFont(size=10)).pack(side="right", padx=12)
            if not items:
                ctk.CTkLabel(list_frame, text="Không tìm thấy tiến trình người dùng phù hợp.", text_color=C["muted"]).pack(pady=25)

        def stop_selected() -> None:
            selected = [(pid, process_objects[pid]) for pid, var in process_vars.items() if var.get()]
            if not selected:
                messagebox.showinfo("Chưa chọn tiến trình", "Chọn ít nhất một ứng dụng để đóng.", parent=dialog)
                return
            names = ", ".join(f"{name} (PID {pid})" for pid, name in selected[:8])
            if len(selected) > 8:
                names += f" và {len(selected) - 8} tiến trình khác"
            if not messagebox.askyesno("Xác nhận đóng ứng dụng", f"Gửi lệnh terminate cho:\n{names}\n\nỨng dụng có thể mất dữ liệu chưa lưu. Tiếp tục?", parent=dialog):
                return
            pids = [pid for pid, _ in selected]
            def work():
                closed = 0
                for pid in pids:
                    try:
                        proc = psutil.Process(pid)
                        if proc.name().lower() in PROTECTED_PROCESS_NAMES:
                            continue
                        proc.terminate()
                        try:
                            proc.wait(timeout=3)
                        except psutil.TimeoutExpired:
                            self.log(f"⚠️ PID {pid} chưa thoát sau terminate; không kill cưỡng bức.")
                            continue
                        closed += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as exc:
                        self.log(f"⚠️ Không đóng được PID {pid}: {exc}")
                self.log(f"✅ Đã yêu cầu đóng {closed}/{len(pids)} tiến trình đã chọn.")
                self._post(refresh_list)
            self._start_worker("Đóng tiến trình đã chọn", work)

        footer = ctk.CTkFrame(dialog, fg_color="transparent")
        footer.pack(fill="x", padx=18, pady=(4, 16))
        self._button(footer, "Làm mới danh sách", refresh_list, kind="neutral", width=155).pack(side="left")
        self._button(footer, "Đóng mục đã chọn", stop_selected, kind="red", width=155).pack(side="right")
        refresh_list()

    # ---------- Disk operations ----------
    def on_drive_change(self, drive: str) -> None:
        if not drive:
            return
        try:
            usage = shutil.disk_usage(drive)
            pct = usage.used / usage.total * 100 if usage.total else 0
            self.lbl_disk_info.configure(text=f"{drive}    ·    Tổng {self._gb(usage.total):.1f} GB    ·    Đã dùng {self._gb(usage.used):.1f} GB ({pct:.1f}%)    ·    Trống {self._gb(usage.free):.1f} GB")
        except Exception:
            self.lbl_disk_info.configure(text=f"Không thể đọc dung lượng ổ {drive}.")

    def _show_disk_placeholder(self, text: str) -> None:
        for widget in self.scroll_clean.winfo_children():
            widget.destroy()
        self.folder_items.clear()
        ctk.CTkLabel(self.scroll_clean, text=text, text_color=C["muted"], font=ctk.CTkFont(size=12)).pack(pady=28)

    def start_action(self, action_type: str) -> None:
        if action_type in {"scan", "scan_large", "defrag"}:
            drive = self.selected_drive.get()
        else:
            drive = ""
        if action_type in {"classify", "archive", "cloud_backup"}:
            target = self.path_classify_var.get().strip()
            if not target or not os.path.isdir(target):
                self._post(self._cloud_write, "\n🔴 Chọn thư mục nguồn hợp lệ trước khi chạy.\n")
                self.log("🔴 Đường dẫn nguồn không hợp lệ hoặc không phải thư mục.")
                return
        else:
            target = ""
        if action_type == "clean":
            selected = [path for path, var in self.folder_items.items() if var.get()]
            if not selected:
                self.log("ℹ️ Bạn chưa chọn mục nào để đưa vào Thùng rác.")
                return
            if send2trash is None:
                messagebox.showwarning("Thiếu send2trash", "Cài send2trash bằng lệnh pip install send2trash để chuyển mục vào Thùng rác an toàn. Ứng dụng sẽ không xóa vĩnh viễn khi thiếu thư viện.")
                return
            preview = "\n".join(selected[:8]) + (f"\n… và {len(selected)-8} mục khác" if len(selected) > 8 else "")
            if not messagebox.askyesno("Xác nhận đưa vào Thùng rác", f"Đưa {len(selected)} mục vào Thùng rác?\n\n{preview}\n\nThư mục hệ thống đã được khóa, nhưng hãy kiểm tra đường dẫn trước khi tiếp tục."):
                return
            self._start_worker("Đưa mục đã chọn vào Thùng rác", self._clean_selected, selected)
        elif action_type == "scan":
            self._show_disk_placeholder("Đang quét thư mục… kết quả sẽ xuất hiện ở đây.")
            self._start_worker("Quét thư mục", self._scan_folders, drive)
        elif action_type == "scan_large":
            self._show_disk_placeholder("Đang tìm tệp lớn… có thể mất thời gian trên ổ nhiều tệp.")
            self._start_worker("Tìm file lớn", self._scan_large_files, drive)
        elif action_type == "defrag":
            if not self._require_admin():
                return
            drive_arg = drive.rstrip("\\/")
            if not messagebox.askyesno("Optimize Drive", f"Chạy defrag /O cho {drive_arg}? Windows tự quyết định tối ưu phù hợp với HDD/SSD."):
                return
            self._start_worker("Optimize drive", self._optimize_drive, drive_arg)
        elif action_type == "classify":
            self._post(self._cloud_write, f"\n📊 Đang phân loại: {target}\n")
            self._start_worker("Phân loại tệp", self._classify_folder, target)
        elif action_type == "archive":
            self._post(self._cloud_write, f"\n📦 Đang tạo ZIP từ: {target}\n")
            self._start_worker("Tạo ZIP", self._archive_folder, target)
        elif action_type == "cloud_backup":
            if not self.is_cloud_logged_in or self.gdrive_service is None:
                self.log("🔴 Chưa đăng nhập Google Drive.")
                self._post(self._cloud_write, "\n🔴 Hãy cấp quyền Google Drive trước khi upload.\n")
                return
            service = self.gdrive_service
            self._post(self._cloud_write, f"\n☁️ Đang nén và upload: {target}\n")
            self._start_worker("Google Drive backup", self._cloud_backup, target, service)

    def _scan_folders(self, drive: str) -> None:
        results: list[tuple[str, int, bool]] = []
        try:
            with os.scandir(drive) as entries:
                candidates = [entry.path for entry in entries if entry.is_dir(follow_symlinks=False) and not entry.name.startswith("$")]
        except Exception as exc:
            self.log(f"🔴 Không thể liệt kê ổ {drive}: {exc}")
            return
        for idx, folder in enumerate(candidates, 1):
            size = self._folder_size_bytes(folder)
            if size > 0:
                results.append((folder, size, self._is_protected_path(folder)))
            if idx % 10 == 0:
                self.log(f"Đang quét thư mục: {idx}/{len(candidates)}…")
        results.sort(key=lambda item: item[1], reverse=True)
        self.log(f"✅ Quét xong {drive}: {len(results)} thư mục có dữ liệu.")
        self._post(self._show_disk_results, results, "Thư mục")

    def _scan_large_files(self, drive: str) -> None:
        results: list[tuple[str, int, bool]] = []
        cap = 500
        seen = 0
        try:
            for root, dirs, files in os.walk(drive, topdown=True, onerror=lambda _e: None):
                dirs[:] = [d for d in dirs if d not in {"$Recycle.Bin", "System Volume Information"}]
                for name in files:
                    path = os.path.join(root, name)
                    try:
                        size = os.path.getsize(path)
                        if size > 50 * 1024 * 1024:
                            results.append((path, size, self._is_protected_path(path)))
                            if len(results) >= cap:
                                raise StopIteration
                    except (OSError, PermissionError):
                        continue
                seen += len(files)
                if seen and seen % 5000 < len(files):
                    self.log(f"Đang quét tệp… đã xét khoảng {seen:,} tệp.")
        except StopIteration:
            self.log(f"ℹ️ Đạt giới hạn {cap} kết quả để giữ giao diện phản hồi tốt.")
        results.sort(key=lambda item: item[1], reverse=True)
        self.log(f"✅ Tìm thấy {len(results)} tệp lớn hơn 50 MB trên {drive}.")
        self._post(self._show_disk_results, results, "Tệp lớn")

    def _show_disk_results(self, results: list[tuple[str, int, bool]], label: str) -> None:
        for widget in self.scroll_clean.winfo_children():
            widget.destroy()
        self.folder_items.clear()
        self.result_count_label.configure(text=f"{len(results)} mục · {label}")
        if not results:
            ctk.CTkLabel(self.scroll_clean, text="Không tìm thấy mục phù hợp hoặc không có quyền đọc.", text_color=C["muted"]).pack(pady=24)
            return
        for path, size, protected in results:
            row = ctk.CTkFrame(self.scroll_clean, fg_color=C["panel"], corner_radius=7)
            row.pack(fill="x", padx=4, pady=3)
            var = ctk.BooleanVar(value=False)
            self.folder_items[path] = var
            cb = ctk.CTkCheckBox(row, text="", variable=var, width=22, checkbox_width=18, checkbox_height=18)
            cb.pack(side="left", padx=(9, 2), pady=8)
            if protected:
                cb.configure(state="disabled")
            ctk.CTkLabel(row, text=path, text_color=C["muted"] if protected else C["text"], font=ctk.CTkFont(size=10), anchor="w", justify="left", wraplength=740).pack(side="left", fill="x", expand=True, padx=5, pady=7)
            size_label = self._size_text(size)
            ctk.CTkLabel(row, text=f"{size_label}{' · SYSTEM' if protected else ''}", text_color=C["red"] if protected else C["cyan"], font=ctk.CTkFont(size=10, weight="bold")).pack(side="right", padx=10)

    def _folder_size_bytes(self, path: str) -> int:
        total = 0
        for root, dirs, files in os.walk(path, topdown=True, onerror=lambda _e: None, followlinks=False):
            dirs[:] = [d for d in dirs if not os.path.islink(os.path.join(root, d))]
            for name in files:
                fp = os.path.join(root, name)
                try:
                    if not os.path.islink(fp):
                        total += os.path.getsize(fp)
                except OSError:
                    pass
        return total

    def _is_protected_path(self, path: str) -> bool:
        absolute = os.path.abspath(path)
        protected_roots = []
        if IS_WINDOWS:
            protected_roots.extend([
                os.environ.get("SystemRoot", r"C:\Windows"),
                os.environ.get("ProgramFiles", r"C:\Program Files"),
                os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
                os.environ.get("ProgramData", r"C:\ProgramData"),
            ])
            for drive in self.get_available_drives():
                root = os.path.abspath(drive)
                try:
                    if os.path.normcase(absolute) == os.path.normcase(root):
                        return True
                except Exception:
                    pass
        for root in protected_roots:
            if not root:
                continue
            try:
                common = os.path.commonpath([os.path.normcase(absolute), os.path.normcase(os.path.abspath(root))])
                if common == os.path.normcase(os.path.abspath(root)):
                    return True
            except (ValueError, OSError):
                continue
        return False

    def _clean_selected(self, paths: list[str]) -> None:
        moved = failed = 0
        for path in paths:
            if self._is_protected_path(path):
                self.log(f"⛔ Bỏ qua đường dẫn được bảo vệ: {path}")
                failed += 1
                continue
            try:
                send2trash(path)
                moved += 1
                self.log(f"🗑️ Đã chuyển vào Thùng rác: {path}")
            except Exception as exc:
                failed += 1
                self.log(f"⚠️ Không thể chuyển vào Thùng rác '{path}': {exc}")
        self.log(f"✅ Hoàn tất: {moved} mục vào Thùng rác, {failed} mục thất bại/bị bỏ qua.")
        self._post(self._show_disk_placeholder, "Quét lại để cập nhật kết quả sau khi dọn dẹp.")

    def _optimize_drive(self, drive: str) -> None:
        result = self._run_command(["defrag", drive, "/O"], timeout=1800)
        output = (result.stdout or "").strip() or (result.stderr or "").strip()
        if result.returncode == 0:
            self.log(f"✅ Windows hoàn tất yêu cầu optimize {drive}. {output[-700:]}")
        else:
            self.log(f"🔴 Optimize {drive} thất bại (mã {result.returncode}). {output[-1000:]}")

    # ---------- File classification / ZIP / Google Drive ----------
    def browse_source_folder(self) -> None:
        path = filedialog.askdirectory(title="Chọn thư mục nguồn")
        if path:
            self.path_classify_var.set(path)

    def browse_credentials(self) -> None:
        path = filedialog.askopenfilename(title="Chọn OAuth client JSON", filetypes=[("JSON", "*.json"), ("All files", "*.*")])
        if path:
            self.credentials_path_var.set(path)

    def _classify_folder(self, target: str) -> None:
        categories = {
            "Video": {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".flv"},
            "Âm thanh": {".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"},
            "Ảnh": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".svg"},
            "Tài liệu": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".csv"},
            "Nén": {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"},
            "Cài đặt": {".exe", ".msi", ".msix", ".apk", ".dmg", ".deb", ".rpm"},
        }
        counts = {key: 0 for key in categories}
        counts["Khác"] = 0
        total = 0
        for root, _, files in os.walk(target, topdown=True, onerror=lambda _e: None):
            for name in files:
                ext = Path(name).suffix.lower()
                found = next((category for category, extensions in categories.items() if ext in extensions), "Khác")
                counts[found] += 1
                total += 1
        lines = [f"📊 BÁO CÁO PHÂN LOẠI\nNguồn: {target}\nTổng số tệp: {total}\n"]
        lines.extend(f"• {category}: {count} tệp" for category, count in counts.items())
        report = "\n".join(lines) + "\n"
        self._post(self._cloud_write, report)
        self.log(f"✅ Phân loại hoàn tất: {total} tệp.")

    def _archive_folder(self, target: str) -> None:
        out_dir = Path.home() / "Hendy_Archives"
        out_dir.mkdir(parents=True, exist_ok=True)
        zip_path = out_dir / f"Archive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        source_abs = os.path.abspath(target)
        out_abs = os.path.abspath(out_dir)
        if os.path.commonpath([source_abs, out_abs]) == source_abs:
            # Avoid writing the archive inside the tree being archived.
            out_dir = Path(tempfile.gettempdir()) / "Hendy_Archives"
            out_dir.mkdir(parents=True, exist_ok=True)
            zip_path = out_dir / f"Archive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        count = 0
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
            for root, dirs, files in os.walk(target, topdown=True, onerror=lambda _e: None, followlinks=False):
                dirs[:] = [d for d in dirs if not os.path.islink(os.path.join(root, d))]
                for name in files:
                    path = os.path.join(root, name)
                    if os.path.islink(path):
                        continue
                    try:
                        archive.write(path, os.path.relpath(path, target))
                        count += 1
                        if count % 500 == 0:
                            self.log(f"Đang nén… {count:,} tệp.")
                    except (OSError, PermissionError) as exc:
                        self.log(f"⚠️ Bỏ qua tệp không đọc được: {path} ({exc})")
        size = zip_path.stat().st_size
        self._post(self._cloud_write, f"✅ Tạo ZIP thành công\nĐường dẫn: {zip_path}\nSố tệp: {count}\nDung lượng: {self._size_text(size)}\n\n")
        self.log(f"✅ Đã tạo ZIP: {zip_path} ({self._size_text(size)}).")

    def open_login_dialog(self) -> None:
        if not GOOGLE_API_AVAILABLE:
            messagebox.showerror("Thiếu thư viện Google", "Cài các gói trong requirements.txt hoặc chạy:\npip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
            return
        credentials_path = Path(self.credentials_path_var.get().strip()).expanduser()
        if not credentials_path.is_file():
            messagebox.showerror("Thiếu OAuth client JSON", "Không tìm thấy file JSON. Tải OAuth Client ID loại Desktop app từ Google Cloud Console rồi chọn file tại đây.")
            return
        if not messagebox.askyesno("Google Drive OAuth", "Ứng dụng sẽ mở trình duyệt để bạn đăng nhập và cấp quyền truy cập tệp Drive do ứng dụng tạo. Tiếp tục?"):
            return
        self.btn_login.configure(state="disabled")
        def work():
            try:
                creds = None
                if TOKEN_PATH.exists():
                    try:
                        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
                    except Exception:
                        creds = None
                if not creds or not creds.valid:
                    if creds and creds.expired and creds.refresh_token:
                        creds.refresh(Request())
                    else:
                        flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
                        creds = flow.run_local_server(port=0, open_browser=True)
                    TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
                service = build("drive", "v3", credentials=creds, cache_discovery=False)
                self._post(self._set_cloud_connected, service)
                self.log("✅ OAuth Google Drive thành công.")
            except Exception as exc:
                self.log(f"🔴 Lỗi OAuth Google Drive: {exc}")
                self._post(messagebox.showerror, "Lỗi xác thực Google Drive", str(exc))
            finally:
                self._post(self.btn_login.configure, state="normal")
        self._start_worker("Đăng nhập Google Drive", work)

    def _set_cloud_connected(self, service) -> None:
        self.gdrive_service = service
        self.is_cloud_logged_in = True
        self.lbl_cloud_status.configure(text="● Đã kết nối Google Drive", text_color=C["green"])
        self.btn_upload.configure(state="normal")
        self.btn_login.configure(text="Cập nhật quyền")

    def _cloud_backup(self, target: str, service) -> None:
        zip_path = Path(tempfile.gettempdir()) / f"HendyBackup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        try:
            count = 0
            with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
                for root, dirs, files in os.walk(target, topdown=True, onerror=lambda _e: None, followlinks=False):
                    dirs[:] = [d for d in dirs if not os.path.islink(os.path.join(root, d))]
                    for name in files:
                        path = os.path.join(root, name)
                        if os.path.islink(path):
                            continue
                        try:
                            archive.write(path, os.path.relpath(path, target))
                            count += 1
                        except (OSError, PermissionError) as exc:
                            self.log(f"⚠️ Bỏ qua tệp không đọc được: {path} ({exc})")
            zip_name = zip_path.name
            size = zip_path.stat().st_size
            self._post(self._cloud_write, f"ZIP sẵn sàng: {zip_name}\nSố tệp: {count}\nDung lượng: {self._size_text(size)}\nĐang upload…\n")
            meta = {"name": zip_name, "mimeType": "application/zip"}
            media = MediaFileUpload(str(zip_path), mimetype="application/zip", resumable=True)
            result = service.files().create(body=meta, media_body=media, fields="id,name,webViewLink,size").execute()
            file_id = result.get("id", "(không có ID)")
            link = result.get("webViewLink", "")
            done = f"✅ UPLOAD THÀNH CÔNG\nTên: {result.get('name', zip_name)}\nID: {file_id}\nDung lượng: {result.get('size', size)} bytes\n{link}\n\n"
            self._post(self._cloud_write, done)
            self.log(f"✅ Đã upload bản backup lên Google Drive. ID: {file_id}")
        except Exception as exc:
            self._post(self._cloud_write, f"🔴 Backup/upload thất bại: {exc}\n\n")
            self.log(f"🔴 Google Drive backup thất bại: {exc}")
        finally:
            try:
                zip_path.unlink(missing_ok=True)
            except Exception:
                pass

    # ---------- General utilities ----------
    def browse_path(self, variable: ctk.StringVar) -> None:
        path = filedialog.askdirectory(title="Chọn thư mục")
        if path:
            variable.set(path)

    def _clear_temp(self) -> tuple[int, int, int]:
        temp_path = Path(tempfile.gettempdir())
        removed = failed = freed = 0
        cutoff = time.time() - (24 * 60 * 60)
        for child in temp_path.iterdir():
            try:
                # Leave very recent items alone in case an installer currently needs them.
                if child.stat().st_mtime > cutoff:
                    continue
                size = self._folder_size_bytes(str(child)) if child.is_dir() else child.stat().st_size
                if send2trash is not None:
                    send2trash(str(child))
                elif child.is_file():
                    child.unlink()
                else:
                    shutil.rmtree(child)
                removed += 1
                freed += size
            except Exception:
                failed += 1
        return removed, failed, freed

    @staticmethod
    def _size_text(size: int) -> str:
        value = float(size)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if value < 1024 or unit == "TB":
                return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
            value /= 1024
        return f"{value:.1f} TB"

    def open_path(self, path: Path) -> None:
        try:
            path.mkdir(parents=True, exist_ok=True) if path == USER_DATA_DIR else None
            if IS_WINDOWS:
                os.startfile(str(path))  # type: ignore[attr-defined]
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])
        except Exception as exc:
            self.log(f"🔴 Không mở được đường dẫn {path}: {exc}")

    def _on_close(self) -> None:
        if self._active_jobs:
            if not messagebox.askyesno("Đang có tác vụ", "Một hoặc nhiều tác vụ đang chạy nền. Đóng giao diện có thể làm gián đoạn chúng. Vẫn thoát?"):
                return
        self.destroy()


if __name__ == "__main__":
    app = HendyToolsApp()
    app.mainloop()
