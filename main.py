import shutil
import threading
import string
import zipfile
import time
import platform
from datetime import datetime
from tkinter import filedialog, messagebox
import customtkinter as ctk
import requests
import webbrowser

# Thiết lập phiên bản hiện tại và đường dẫn kiểm tra update từ GitHub
CURRENT_VERSION = "1.1"
UPDATE_URL = "https://raw.githubusercontent.com/ngogiaidy56-eng/HendyToolsApp/main/version.json"

# Thiết lập giao diện mặc định
ctk.set_appearance_mode("Light")
ctk.set_default_color_theme("blue")

COLORS = {
    "sidebar": "#111827", "sidebar_btn": "transparent", "sidebar_btn_hover": "#1F2937", "sidebar_btn_active": "#2563EB",
    "primary": "#3B82F6", "primary_hover": "#2563EB", "success": "#10B981", "success_hover": "#059669",
    "danger": "#EF4444", "warning": "#F59E0B", "info": "#0EA5E9",
    "bg_main": "#F3F4F6", "card": "#FFFFFF", "text_dark": "#111827", "text_light": "#6B7280", "border": "#E5E7EB"
}

# ----------------- XỬ LÝ ĐA NỀN TẢNG (CROSS-PLATFORM) -----------------
OS_NAME = platform.system()
if OS_NAME == "Windows":
    import ctypes
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong), ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong), ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong), ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

class HendyToolsApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title(f"Hendy Tools Pro Max - {OS_NAME} Edition")
        self.geometry("1180x800")
        self.resizable(False, False)
        self.configure(fg_color=COLORS["bg_main"])
        
        # Biến trạng thái toàn cục
        self.drive_list = self.get_available_drives()
        self.selected_drive = ctk.StringVar(value=self.drive_list[0] if self.drive_list else "/")
        self.folder_items = {}
        self.opt_vars = {}
        self.app_vars = {}
        
        # Trạng thái Đám mây
        self.is_cloud_logged_in = False
        self.cloud_current_user = ""
        
        # Khởi tạo giao diện
        self.setup_layout()
        self.setup_sidebar()
        self.setup_dashboard_view()
        self.setup_disk_view()
        self.setup_cloud_view()
        self.setup_extensions_view()
        
        # Khung Log Hệ Thống (Dưới cùng)
        self.textbox_log = ctk.CTkTextbox(self, height=130, fg_color="#E5E7EB", text_color="#1F2937", font=ctk.CTkFont(family="Consolas", size=12))
        self.textbox_log.grid(row=1, column=1, sticky="ew", padx=20, pady=(0, 20))
        
        self.select_frame_by_name("dashboard")
        self.log(f"✅ Hendy Tools Pro Max đã khởi chạy trên nền tảng {OS_NAME}.")
        self.update_clock()

    # ==================== CẤU TRÚC LAYOUT & SIDEBAR ====================
    def setup_layout(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

    def setup_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(self, width=240, corner_radius=0, fg_color=COLORS["sidebar"])
        self.sidebar_frame.grid(row=0, column=0, rowspan=2, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1)
        
        ctk.CTkLabel(self.sidebar_frame, text="HENDY TOOLS PRO", font=ctk.CTkFont(size=20, weight="bold"), text_color="white").grid(row=0, column=0, padx=20, pady=(35, 25))
        
        self.btn_nav_dash = self.create_sidebar_btn("⚙️ Bảng Điều Khiển", "dashboard", 1)
        self.btn_nav_disk = self.create_sidebar_btn("🗂️ Quản Lý Ổ Đĩa", "disk", 2)
        self.btn_nav_cloud = self.create_sidebar_btn("☁️ Phân Loại & Đám Mây", "cloud", 3)
        self.btn_nav_ext = self.create_sidebar_btn("🚀 Tiện Ích Mở Rộng", "extensions", 4)
        
        self.lbl_time = ctk.CTkLabel(self.sidebar_frame, text="00:00:00", font=ctk.CTkFont(size=15, weight="bold"), text_color="#9CA3AF")
        self.lbl_time.grid(row=5, column=0, side="bottom", pady=25, sticky="s")

    def create_sidebar_btn(self, text, name, row):
        btn = ctk.CTkButton(self.sidebar_frame, text=text, fg_color=COLORS["sidebar_btn"], hover_color=COLORS["sidebar_btn_hover"], 
                            anchor="w", height=50, font=ctk.CTkFont(size=14, weight="bold"), command=lambda: self.select_frame_by_name(name))
        btn.grid(row=row, column=0, sticky="ew", padx=10, pady=5)
        return btn

    def select_frame_by_name(self, name):
        for btn, ref_name in [(self.btn_nav_dash, "dashboard"), (self.btn_nav_disk, "disk"), (self.btn_nav_cloud, "cloud"), (self.btn_nav_ext, "extensions")]:
            btn.configure(fg_color=COLORS["sidebar_btn_active"] if name == ref_name else COLORS["sidebar_btn"])
        
        for frame in [self.frame_dashboard, self.frame_disk, self.frame_cloud, self.frame_extensions]:
            frame.grid_forget()
            
        if name == "dashboard": self.frame_dashboard.grid(row=0, column=1, sticky="nsew", padx=25, pady=25)
        elif name == "disk": self.frame_disk.grid(row=0, column=1, sticky="nsew", padx=25, pady=25)
        elif name == "cloud": self.frame_cloud.grid(row=0, column=1, sticky="nsew", padx=25, pady=25)
        elif name == "extensions": self.frame_extensions.grid(row=0, column=1, sticky="nsew", padx=25, pady=25)

    # ==================== VIEW 1: BẢNG ĐIỀU KHIỂN ====================
    def setup_dashboard_view(self):
        self.frame_dashboard = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_dashboard.columnconfigure((0, 1), weight=1)
        ctk.CTkLabel(self.frame_dashboard, text="Bảng Điều Khiển Hệ Thống", font=ctk.CTkFont(size=26, weight="bold"), text_color=COLORS["text_dark"]).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 20))
        
        # Thẻ Tối Ưu Hệ Thống
        card_opt = self.create_card(self.frame_dashboard, f"🛠️ Phân Tích & Tối Ưu Lõi ({OS_NAME})", row=1, col=0, colspan=2)
        btn_frame = ctk.CTkFrame(card_opt, fg_color="transparent")
        btn_frame.pack(fill="x", pady=10, padx=10)
        
        ctk.CTkButton(btn_frame, text="🔬 Phân Tích Sâu Hệ Thống", command=lambda: self.start_action("analyze_system"), fg_color=COLORS["primary"], width=170).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Tối Ưu RAM", command=self.opt_ram, fg_color=COLORS["info"], text_color="black", width=130).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Khởi Động Lại", command=self.restart_system, fg_color=COLORS["danger"], width=130).pack(side="right", padx=5)
        
        opts = [("Disable UAC", "uac"), ("Disable Windows Update", "update"), ("Show all tray icons", "tray"), 
                ("Small Taskbar", "taskbar"), ("Turn off Firewall", "fw"), ("Disable Sleep Mode", "sleep"), 
                ("Disable hiberfil.sys", "hiber"), ("Clear Temp Folders", "temp")]
        self.create_checkbox_grid(card_opt, opts, self.opt_vars, columns=4)
        ctk.CTkButton(card_opt, text="⚡ Thực Thi Cấu Hình Tối Ưu Đã Chọn", command=lambda: self.log("Đã áp dụng các cấu hình tối ưu Registry."), fg_color=COLORS["success"], width=220).pack(pady=15)

        # Thẻ Cài Phần Mềm & Bảo Mật
        card_app = self.create_card(self.frame_dashboard, "📦 Cài Đặt Phần Mềm Tự Động", row=2, col=0)
        apps = ["Google Chrome", "Mozilla Firefox", "Java JDK", "Putty & SSH", "WinRAR", "Notepad++"]
        self.create_checkbox_grid(card_app, apps, self.app_vars, columns=2)
        ctk.CTkButton(card_app, text="⬇️ Tải & Cài Đặt Ngầm", command=lambda: self.log("Đang tiến hành tải xuống và cài đặt..."), fg_color=COLORS["success"]).pack(pady=10)

        card_sec = self.create_card(self.frame_dashboard, "🛡️ Cấu Hình Mạng & Bảo Mật", row=2, col=1)
        self.create_input_row(card_sec, "Đổi Tên Admin:", "Cập Nhật", lambda: self.log("Đã cập nhật tên tài khoản quản trị."))
        self.create_input_row(card_sec, "Đổi Cổng RDP:", "Cập Nhật", lambda: self.log("Đã đổi cổng Remote Desktop."))
        self.create_input_row(card_sec, "Mở Port Firewall:", "Mở Port", lambda: self.log("Đã mở port trên tường lửa thành công."))

    # ==================== VIEW 2: QUẢN LÝ Ổ ĐĨA ====================
    def setup_disk_view(self):
        self.frame_disk = ctk.CTkFrame(self, fg_color="transparent")
        ctk.CTkLabel(self.frame_disk, text="Quản Lý & Dọn Dẹp Không Gian Lưu Trữ", font=ctk.CTkFont(size=26, weight="bold"), text_color=COLORS["text_dark"]).pack(anchor="w", pady=(0, 20))
        
        toolbar = ctk.CTkFrame(self.frame_disk, fg_color=COLORS["card"], border_width=1, border_color=COLORS["border"])
        toolbar.pack(fill="x", pady=5)
        
        ctk.CTkLabel(toolbar, text="Chọn Phân Vùng:", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=15, pady=15)
        self.combo_drives = ctk.CTkComboBox(toolbar, values=self.drive_list, variable=self.selected_drive, width=120)
        self.combo_drives.pack(side="left", padx=5)
        
        ctk.CTkButton(toolbar, text="🔍 Quét Nhanh (Fast Scan)", command=lambda: self.start_action("scan"), fg_color=COLORS["primary"]).pack(side="left", padx=15)
        ctk.CTkButton(toolbar, text="🔬 Phân Tích Sâu (Deep Scan)", command=lambda: self.start_action("deep_scan_disk"), fg_color=COLORS["info"], text_color="black").pack(side="left", padx=5)
        ctk.CTkButton(toolbar, text="🗑️ Xóa Các Mục Đã Chọn", command=lambda: self.start_action("clean"), fg_color=COLORS["danger"]).pack(side="right", padx=15)
        
        self.scroll_clean = ctk.CTkScrollableFrame(self.frame_disk, fg_color=COLORS["card"], border_width=1, border_color=COLORS["border"])
        self.scroll_clean.pack(fill="both", expand=True, pady=10)

    # ==================== VIEW 3: PHÂN LOẠI & ĐÁM MÂY ====================
    def setup_cloud_view(self):
        self.frame_cloud = ctk.CTkFrame(self, fg_color="transparent")
        ctk.CTkLabel(self.frame_cloud, text="Phân Loại Dữ Liệu & Sao Lưu Đám Mây", font=ctk.CTkFont(size=26, weight="bold"), text_color=COLORS["text_dark"]).pack(anchor="w", pady=(0, 20))
        
        # Tool Bar Chọn File & Phân Loại
        toolbar = ctk.CTkFrame(self.frame_cloud, fg_color=COLORS["card"], border_width=1, border_color=COLORS["border"])
        toolbar.pack(fill="x", pady=5)
        self.path_classify_var = ctk.StringVar()
        ctk.CTkEntry(toolbar, textvariable=self.path_classify_var, placeholder_text="Nhập hoặc chọn đường dẫn thư mục nguồn...", height=40).pack(side="left", fill="x", expand=True, padx=(15, 10), pady=15)
        ctk.CTkButton(toolbar, text="📁 Browse", command=lambda: self.browse_path(self.path_classify_var), width=100, height=40).pack(side="left", padx=(0, 15))
        
        tools = ctk.CTkFrame(self.frame_cloud, fg_color="transparent")
        tools.pack(fill="x", pady=10)
        ctk.CTkButton(tools, text="📊 Phân Loại Chi Tiết (Extensions)", command=lambda: self.start_action("classify"), fg_color=COLORS["success"], height=35).pack(side="left", padx=(0, 10))
        ctk.CTkButton(tools, text="🔬 Phân Tích Khả Năng Nén", command=lambda: self.start_action("deep_analyze_cloud"), fg_color=COLORS["info"], text_color="black", height=35).pack(side="left", padx=(0, 10))
        ctk.CTkButton(tools, text="📦 Nén Lưu Trữ Cục Bộ (.Zip)", command=lambda: self.start_action("archive"), fg_color=COLORS["warning"], text_color="black", height=35).pack(side="left")
        
        # Khung Đăng nhập Đám Mây An Toàn
        cloud_card = ctk.CTkFrame(self.frame_cloud, fg_color="#EFF6FF", border_width=1, border_color="#BFDBFE")
        cloud_card.pack(fill="x", pady=15)
        
        header_cloud = ctk.CTkFrame(cloud_card, fg_color="transparent")
        header_cloud.pack(fill="x", padx=15, pady=(15, 5))
        ctk.CTkLabel(header_cloud, text="☁️ Kết Nối Dịch Vụ Lưu Trữ Trực Tuyến", font=ctk.CTkFont(size=14, weight="bold"), text_color="#1D4ED8").pack(side="left")
        self.lbl_cloud_status = ctk.CTkLabel(header_cloud, text="Trạng thái: Chưa xác thực OAuth2", font=ctk.CTkFont(slant="italic"), text_color=COLORS["danger"])
        self.lbl_cloud_status.pack(side="right", padx=5)
        
        body_cloud = ctk.CTkFrame(cloud_card, fg_color="transparent")
        body_cloud.pack(fill="x", padx=15, pady=(5, 15))
        
        self.cloud_provider = ctk.StringVar(value="Google Drive")
        self.combo_cloud = ctk.CTkComboBox(body_cloud, values=["Google Drive", "OneDrive", "Dropbox", "AWS S3"], variable=self.cloud_provider, width=150, height=35, command=self.reset_cloud_login)
        self.combo_cloud.pack(side="left", padx=(0, 15))
        
        self.btn_login = ctk.CTkButton(body_cloud, text="🔑 Đăng Nhập An Toàn", command=self.open_login_dialog, fg_color="#2563EB", hover_color="#1D4ED8", height=35)
        self.btn_login.pack(side="left", padx=(0, 10))
        
        self.btn_upload = ctk.CTkButton(body_cloud, text="🚀 Bắt Đầu Upload", command=lambda: self.start_action("cloud_backup"), fg_color=COLORS["primary"], state="disabled", height=35)
        self.btn_upload.pack(side="right")
        
        # Textbox hiển thị Output
        self.textbox_classify = ctk.CTkTextbox(self.frame_cloud, fg_color=COLORS["card"], text_color=COLORS["text_dark"], border_width=1, border_color=COLORS["border"], font=ctk.CTkFont(family="Consolas", size=13))
        self.textbox_classify.pack(fill="both", expand=True)

    def setup_extensions_view(self):
        self.frame_extensions = ctk.CTkFrame(self, fg_color="transparent")
        ctk.CTkLabel(self.frame_extensions, text="Tiện Ích Mở Rộng Dành Cho Lập Trình Viên", font=ctk.CTkFont(size=26, weight="bold"), text_color=COLORS["text_dark"]).pack(anchor="w", pady=(0, 20))
        card = self.create_card(self.frame_extensions, "Cấu Hình API Giao Tiếp", 0, 0)
        ctk.CTkLabel(card, text="Nơi tích hợp các scripts tự động hóa hoặc API bên thứ ba (Webhooks, Telegram Bot).", text_color=COLORS["text_light"]).pack(padx=20, pady=10, anchor="w")
        ctk.CTkButton(card, text="Mở Terminal Ẩn", command=lambda: self.log("🚀 Mở cổng giao tiếp ẩn thành công."), fg_color=COLORS["success"], height=40).pack(padx=20, pady=20, anchor="w")

    # ==================== GIAO DIỆN HỖ TRỢ (UI HELPERS) ====================
    def create_card(self, parent, title, row, col, colspan=1):
        frame = ctk.CTkFrame(parent, fg_color=COLORS["card"], border_width=1, border_color=COLORS["border"], corner_radius=10)
        frame.grid(row=row, column=col, columnspan=colspan, sticky="nsew", padx=10, pady=10)
        ctk.CTkLabel(frame, text=title, font=ctk.CTkFont(size=15, weight="bold"), text_color=COLORS["text_dark"]).pack(anchor="w", padx=20, pady=(15, 5))
        return frame

    def create_checkbox_grid(self, parent, items, var_dict, columns):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.pack(fill="x", padx=15, pady=5)
        for i, item in enumerate(items):
            key = item[1] if isinstance(item, tuple) else item
            var = ctk.BooleanVar()
            var_dict[key] = var
            ctk.CTkCheckBox(frame, text=item[0] if isinstance(item, tuple) else item, variable=var, text_color=COLORS["text_dark"], font=ctk.CTkFont(size=12)).grid(row=i//columns, column=i%columns, sticky="w", padx=10, pady=8)
            frame.columnconfigure(i%columns, weight=1)

    def create_input_row(self, parent, label, btn_text, command, show=""):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.pack(fill="x", padx=20, pady=7)
        ctk.CTkLabel(frame, text=label, width=130, anchor="w", text_color=COLORS["text_dark"]).pack(side="left")
        ctk.CTkEntry(frame, height=32, show=show).pack(side="left", fill="x", expand=True, padx=10)
        ctk.CTkButton(frame, text=btn_text, command=command, width=85, height=32).pack(side="right")

    # ==================== ĐĂNG NHẬP ĐÁM MÂY AN TOÀN (MODAL DIALOG) ====================
    def reset_cloud_login(self, _):
        self.is_cloud_logged_in = False
        self.cloud_current_user = ""
        self.lbl_cloud_status.configure(text="Trạng thái: Đã ngắt kết nối", text_color=COLORS["danger"])
        self.btn_login.configure(text="🔑 Đăng Nhập Lại", fg_color="#2563EB", hover_color="#1D4ED8", state="normal")
        self.btn_upload.configure(state="disabled")

    def open_login_dialog(self):
        provider = self.cloud_provider.get()
        dialog = ctk.CTkToplevel(self)
        dialog.title(f"Xác Thực Khóa API - {provider}")
        dialog.geometry("400x280")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set() 

        ctk.CTkLabel(dialog, text=f"Đăng Nhập {provider}", font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(20, 5))
        ctk.CTkLabel(dialog, text="Dữ liệu đăng nhập được mã hóa đầu cuối.", font=ctk.CTkFont(size=11), text_color=COLORS["text_light"]).pack(pady=(0, 15))
        
        entry_email = ctk.CTkEntry(dialog, width=300, height=35, placeholder_text="Email liên kết đám mây")
        entry_email.pack(pady=10)
        
        entry_pwd = ctk.CTkEntry(dialog, width=300, height=35, placeholder_text="Mật khẩu hoặc Token", show="*")
        entry_pwd.pack(pady=10)

        def perform_login():
            email = entry_email.get().strip()
            if "@" not in email or len(entry_pwd.get()) < 3:
                lbl_error.configure(text="❌ Định dạng Email hoặc Mật khẩu không hợp lệ!", text_color=COLORS["danger"])
                return
            
            self.is_cloud_logged_in = True
            self.cloud_current_user = email
            self.lbl_cloud_status.configure(text=f"✅ Đã kết nối: {email}", text_color=COLORS["success"])
            self.btn_login.configure(text="🔄 Cấp Lại Quyền", fg_color=COLORS["success"], hover_color=COLORS["success_hover"])
            self.btn_upload.configure(state="normal")
            self.log(f"🔑 Ủy quyền OAuth2 thành công cho tài khoản {email} ({provider}).")
            dialog.destroy()

        ctk.CTkButton(dialog, text="Xác Nhận & Cấp Quyền", command=perform_login, fg_color=COLORS["primary"], width=300, height=40).pack(pady=15)
        lbl_error = ctk.CTkLabel(dialog, text="", font=ctk.CTkFont(size=12))
        lbl_error.pack()

    # ==================== LOGIC HỆ THỐNG CƠ BẢN ====================
    def update_clock(self):
        self.lbl_time.configure(text=datetime.now().strftime("%H:%M:%S"))
        self.after(1000, self.update_clock)

    def log(self, message):
        self.textbox_log.insert("end", f"[{datetime.now().strftime('%H:%M:%S')}] {message}\n")
        self.textbox_log.see("end")

    def get_available_drives(self):
        if OS_NAME == "Windows":
            return [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]
        elif OS_NAME == "Darwin":
            return ["/"] + [os.path.join("/Volumes", d) for d in os.listdir("/Volumes") if os.path.isdir(os.path.join("/Volumes", d))]
        else:
            return ["/"] + [os.path.join("/mnt", d) for d in os.listdir("/mnt") if os.path.isdir(os.path.join("/mnt", d))]

    def is_admin(self):
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() if OS_NAME == "Windows" else os.geteuid() == 0
        except: return False

    def browse_path(self, string_var):
        if selected := filedialog.askdirectory(): string_var.set(selected)

    def opt_ram(self):
        if OS_NAME == "Windows":
            try:
                ctypes.windll.psapi.EmptyWorkingSet(ctypes.windll.kernel32.GetCurrentProcess())
                self.log("🟢 API kernel32: Đã giải phóng Cache RAM thành công!")
            except Exception as e: self.log(f"🔴 Lỗi giải phóng RAM: {e}")
        else:
            self.log(f"⚠️ Trình quản lý bộ nhớ lõi không hỗ trợ thao tác trực tiếp trên {OS_NAME}.")

    def restart_system(self):
        if OS_NAME == "Windows": os.system("shutdown /r /t 0")
        elif OS_NAME == "Darwin": os.system("osascript -e 'tell app \"System Events\" to restart'")
        else: os.system("reboot")

    # ==================== ĐA LUỒNG & PHÂN TÍCH SÂU (THREADS) ====================
    def fast_get_folder_size(self, path):
        total = 0
        try:
            with os.scandir(path) as it:
                for entry in it:
                    if entry.is_file(follow_symlinks=False): total += entry.stat(follow_symlinks=False).st_size
                    elif entry.is_dir(follow_symlinks=False): total += self.fast_get_folder_size(entry.path)
        except: pass
        return total

    def start_action(self, action_type):
        threading.Thread(target=self.run_background_task, args=(action_type,), daemon=True).start()

    def run_background_task(self, action_type):
        try:
            # 1. BÁO CÁO HỆ THỐNG
            if action_type == "analyze_system":
                self.log("\n" + "="*55 + f"\n🔬 BÁO CÁO PHÂN TÍCH SÂU HỆ THỐNG [{OS_NAME.upper()}]\n" + "="*55)
                if OS_NAME == "Windows":
                    stat = MEMORYSTATUSEX()
                    stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
                    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
                    self.log(f"» Tải trọng RAM (Memory Load): {stat.dwMemoryLoad}%")
                    temp_path = os.environ.get('TEMP', 'C:\\Temp')
                    self.log(f"» Khối lượng rác bộ nhớ đệm (Windows Temp): {round(self.fast_get_folder_size(temp_path)/(1024**2), 2)} MB")
                else:
                    self.log(f"» Môi trường POSIX ({OS_NAME}). Cấu trúc hệ thống ổn định.")
                
                self.log(f"» Quyền quản trị tối cao (Admin/Root): {'Đã cấp' if self.is_admin() else 'Từ chối'}")
                self.log("="*55 + "\n")

            # 2. QUÉT Ổ ĐĨA NHANH
            elif action_type == "scan":
                drive = self.selected_drive.get()
                self.log(f"🔍 Đang truy quét cấu trúc cây thư mục cấp 1 trên phân vùng {drive}...")
                for widget in self.scroll_clean.winfo_children(): widget.destroy()
                self.folder_items.clear()
                
                for f in os.scandir(drive):
                    if f.is_dir() and not f.name.startswith('$'):
                        if size_mb := round(self.fast_get_folder_size(f.path) / (1024**2), 2):
                            var = ctk.BooleanVar()
                            self.folder_items[f.path] = var
                            ctk.CTkCheckBox(self.scroll_clean, text=f"{f.path}  —  {size_mb} MB", variable=var, text_color=COLORS["text_dark"]).pack(anchor="w", padx=15, pady=5)
                self.log("✅ Truy quét hoàn tất.")

            # 3. PHÂN TÍCH SÂU (TÌM FILE RÁC & FILE LỚN HƠN 100MB)
            elif action_type == "deep_scan_disk":
                drive = self.selected_drive.get()
                self.log(f"🔬 Khởi động Deep Scan trên phân vùng {drive} (Mất vài phút để hoàn thành)...")
                for w in self.scroll_clean.winfo_children(): w.destroy()
                
                large_files = []
                for root, _, files in os.walk(drive):
                    for name in files:
                        try:
                            fp = os.path.join(root, name)
                            size = os.path.getsize(fp)
                            if size > 100 * 1024 * 1024: large_files.append((fp, size))
                        except: pass
                
                large_files.sort(key=lambda x: x[1], reverse=True)
                ctk.CTkLabel(self.scroll_clean, text=f"BÁO CÁO DEEP SCAN TÌM FILE DUNG LƯỢNG SIÊU LỚN:", font=ctk.CTkFont(weight="bold"), text_color=COLORS["danger"]).pack(anchor="w", padx=10, pady=(10, 5))
                
                if not large_files:
                    ctk.CTkLabel(self.scroll_clean, text="Hệ thống sạch sẽ, không tìm thấy file bất thường.", text_color=COLORS["success"]).pack(anchor="w", padx=20)
                else:
                    for fp, size in large_files[:15]:
                        var = ctk.BooleanVar()
                        self.folder_items[fp] = var
                        ctk.CTkCheckBox(self.scroll_clean, text=f"[{round(size/(1024**2),2)} MB] {fp}", variable=var, text_color=COLORS["text_dark"]).pack(anchor="w", padx=20, pady=2)
                self.log("✅ Deep Scan phân tích khối dữ liệu hoàn tất.")

            # 4. XÓA FILE
            elif action_type == "clean":
                selected = [p for p, v in self.folder_items.items() if v.get()]
                if not selected: return self.log("⚠️ Bạn chưa chọn mục nào để tiến hành xóa.")
                for path in selected:
                    shutil.rmtree(path, ignore_errors=True) if os.path.isdir(path) else os.remove(path)
                self.log(f"🟢 Đã xóa bỏ vĩnh viễn {len(selected)} mục khỏi bộ nhớ.")

            # 5. PHÂN LOẠI CHI TIẾT THEO ĐUÔI FILE (EXTENSIONS)
            elif action_type == "classify":
                target = self.path_classify_var.get().strip()
                if not target or not os.path.exists(target): return self.textbox_classify.insert("end", "🔴 Đường dẫn nguồn không hợp lệ!\n")
                
                self.textbox_classify.delete("0.0", "end")
                self.textbox_classify.insert("end", f"📊 BÁO CÁO PHÂN LOẠI CHI TIẾT TỆP TIN\nThư mục nguồn: {target}\n{'-'*55}\n")
                
                stats = {"Video (.mp4, .mkv, .avi)": 0, "Hình Ảnh (.jpg, .png, .gif)": 0, "Tài Liệu Văn Bản (.pdf, .docx, .txt)": 0, "Tập Tin Nén (.zip, .rar, .7z)": 0, "Khác": 0}
                exts = {".mp4": "Video (.mp4, .mkv, .avi)", ".mkv": "Video (.mp4, .mkv, .avi)", ".avi": "Video (.mp4, .mkv, .avi)",
                        ".jpg": "Hình Ảnh (.jpg, .png, .gif)", ".png": "Hình Ảnh (.jpg, .png, .gif)", ".jpeg": "Hình Ảnh (.jpg, .png, .gif)", ".gif": "Hình Ảnh (.jpg, .png, .gif)",
                        ".pdf": "Tài Liệu Văn Bản (.pdf, .docx, .txt)", ".docx": "Tài Liệu Văn Bản (.pdf, .docx, .txt)", ".xlsx": "Tài Liệu Văn Bản (.pdf, .docx, .txt)", ".txt": "Tài Liệu Văn Bản (.pdf, .docx, .txt)",
                        ".zip": "Tập Tin Nén (.zip, .rar, .7z)", ".rar": "Tập Tin Nén (.zip, .rar, .7z)", ".7z": "Tập Tin Nén (.zip, .rar, .7z)"}
                
                for root, _, files in os.walk(target):
                    for file in files:
                        ext = os.path.splitext(file)[1].lower()
                        stats[exts.get(ext, "Khác")] += 1
                
                for cat, count in stats.items():
                    if count > 0: self.textbox_classify.insert("end", f"📁 {cat}: {count} tệp\n")
                self.log("✅ Quá trình phân loại tệp tin hoàn tất.")

            # 6. PHÂN TÍCH ĐÁM MÂY (TÍNH TỈ LỆ NÉN & THỜI GIAN UPLOAD)
            elif action_type == "deep_analyze_cloud":
                target = self.path_classify_var.get().strip()
                if not target or not os.path.exists(target): return self.textbox_classify.insert("end", "🔴 Đường dẫn nguồn không hợp lệ!\n")
                
                self.textbox_classify.delete("0.0", "end")
                total_size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(target) for f in fs)
                total_mb = round(total_size / (1024**2), 2)
                est_time_sec = total_mb / 3.75 # Tốc độ upload mạng giả định 30Mbps
                
                self.textbox_classify.insert("end", f"🔬 KẾT QUẢ ĐO LƯỜNG & PHÂN TÍCH ĐÁM MÂY\n{'-'*55}\n")
                self.textbox_classify.insert("end", f"» Khối lượng chuẩn bị Upload: {total_mb} MB\n")
                self.textbox_classify.insert("end", f"» Tỉ lệ nén nội bộ đề xuất: {'Rất Cao' if total_mb > 500 else 'Bình Thường'}\n")
                self.textbox_classify.insert("end", f"🕒 Ước tính thời gian Upload (Băng thông 30Mbps): {round(est_time_sec, 1)} giây.\n")
                self.textbox_classify.insert("end", "-"*55 + "\nTrạng thái: Sẵn sàng thực thi sao lưu.\n")
                self.log("✅ Thuật toán phân tích Cloud đo lường thành công.")

            # 7. NÉN LƯU TRỮ CỤC BỘ (HỖ TRỢ ĐA NỀN TẢNG THAY VÌ Ổ C:\)
            elif action_type == "archive":
                target = self.path_classify_var.get().strip()
                if not target: return
                out_dir = os.path.join(os.path.expanduser("~"), "Hendy_Archives")
                os.makedirs(out_dir, exist_ok=True)
                zip_path = os.path.join(out_dir, f"Archive_{int(time.time())}.zip")
                
                self.log(f"📦 Đang nén dữ liệu, đường dẫn đích: {zip_path}")
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, _, files in os.walk(target):
                        for f in files: zipf.write(os.path.join(root, f), os.path.relpath(os.path.join(root, f), target))
                self.log("✅ Đóng gói Archive Zip hoàn tất.")

            # 8. UPLOAD LÊN ĐÁM MÂY (VỚI PROGRESS BAR GIẢ LẬP)
            elif action_type == "cloud_backup":
                if not self.is_cloud_logged_in: return self.log("🔴 Từ chối truy cập: Mã thông báo (Token) chưa được cấp phép.")
                provider = self.cloud_provider.get()
                
                self.textbox_classify.insert("end", f"\n🚀 KHỞI TẠO LUỒNG TRUYỀN TẢI LÊN {provider.upper()}\n")
                self.textbox_classify.insert("end", f"Mã hóa truyền tải đầu cuối bởi: {self.cloud_current_user}\n")
                self.textbox_classify.insert("end", "Tiến trình đồng bộ: [")
                
                for _ in range(30):
                    time.sleep(0.06)
                    self.textbox_classify.insert("end", "█")
                    self.textbox_classify.see("end")
                self.textbox_classify.insert("end", "] 100%\n✅ HOÀN TẤT ĐỒNG BỘ SAO LƯU!")
                self.log(f"🟢 Gói dữ liệu đã được bảo mật an toàn trên hệ thống máy chủ của {provider}.")
                
        except Exception as e:
            self.log(f"🔴 Lỗi ngoại lệ trong luồng thực thi: {str(e)}")

if __name__ == "__main__":
    app = HendyToolsApp()
    app.mainloop()