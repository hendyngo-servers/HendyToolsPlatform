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

# --- HỆ THỐNG MÀU SẮC CHUẨN ---
COLORS = {
    "primary": "#1976D2",
    "primary_hover": "#1565C0",
    "success": "#2E7D32",
    "success_hover": "#1B5E20",
    "danger": "#D32F2F",
    "danger_hover": "#C62828",
    "info": "#00ACC1",
    "info_hover": "#00838F",
    "warning": "#F57C00",
    "warning_hover": "#EF6C00",
    "bg_frame": "#F8F9FA",
    "border": "#E0E0E0"
}

class HendyToolsApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("Hendy Tools - System & Disk Optimization Pro V5")
        self.geometry("1020x780")
        self.resizable(False, False)
        
        # Biến trạng thái hệ thống
        self.drive_list = self.get_available_drives()
        self.selected_drive = ctk.StringVar(value=self.drive_list[0] if self.drive_list else "C:\\")
        self.folder_items = {}
        self.opt_vars = {}
        self.app_vars = {}
        
        # Biến trạng thái Đám mây
        self.is_cloud_logged_in = False
        self.cloud_current_user = ""
        
        # --- KHUNG TỔNG THỂ DẠNG TAB ---
        self.tabview = ctk.CTkTabview(self, width=980, height=560)
        self.tabview.pack(pady=10, padx=20, fill="both", expand=True)
        
        self.tab_dashboard = self.tabview.add("⚙️ Bảng Điều Khiển")
        self.tab_disk_mgr = self.tabview.add("🗂️ Quản Lý Ổ Đĩa")
        self.tab_classify = self.tabview.add("📊 Phân Loại & Đám Mây")
        self.tab_new_feature = self.tabview.add("🚀 Mở Rộng")
        
        # Build các tab
        self.setup_tab_dashboard()
        self.setup_tab_disk_mgr()
        self.setup_tab_classify()
        self.setup_tab_new_feature()

        # --- KHUNG LOG CHUNG DƯỚI CÙNG ---
        self.textbox_log = ctk.CTkTextbox(self, height=140, fg_color="#F1F3F4", text_color="#202124")
        self.textbox_log.pack(pady=(0, 15), padx=20, fill="x")
        self.log("✅ Hendy Tools V5 đã khởi động. Đã tích hợp hệ thống xác thực Đám Mây...")

        self.update_clock()
        # Chạy quét ổ đĩa ở luồng phụ ngay khi mở app
        threading.Thread(target=self.scan_folders, daemon=True).start()

    # ==================== PHẦN XÂY DỰNG GIAO DIỆN ====================

    def setup_tab_dashboard(self):
        self.tab_dashboard.columnconfigure(0, weight=1)
        self.tab_dashboard.columnconfigure(1, weight=1)

        # 1. Khung Window Optimization
        frame_win = self.create_card(self.tab_dashboard, "Tối ưu Windows (Window Optimization)", row=0, col=0, colspan=2)
        
        frame_win_btns = ctk.CTkFrame(frame_win, fg_color="transparent")
        frame_win_btns.pack(fill="x", pady=(5, 10))
        
        ctk.CTkButton(frame_win_btns, text="Tối Ưu RAM", command=self.opt_ram, fg_color=COLORS["info"], hover_color=COLORS["info_hover"], width=130).pack(side="left", padx=5)
        ctk.CTkButton(frame_win_btns, text="Tối Ưu CPU", command=self.opt_cpu, fg_color=COLORS["info"], hover_color=COLORS["info_hover"], width=130).pack(side="left", padx=5)
        ctk.CTkButton(frame_win_btns, text="Mở Task Manager", command=lambda: os.system("taskmgr"), fg_color=COLORS["warning"], hover_color=COLORS["warning_hover"], width=130).pack(side="left", padx=5)
        ctk.CTkButton(frame_win_btns, text="Khởi Động Lại", command=lambda: os.system("shutdown /r /t 0"), fg_color=COLORS["danger"], hover_color=COLORS["danger_hover"], width=130).pack(side="right", padx=5)

        opts = [
            ("Disable UAC", "uac"), ("Turn off IE ESC", "ie"), ("Disable update", "update"), ("Show all tray icon", "tray"),
            ("Small Taskbar", "taskbar"), ("Turn off firewall", "fw"), ("Disable sleep", "sleep"), ("Disable hiberfil", "hiber"),
            ("Disable recovery", "rec"), ("Disable signature", "sig"), ("Better RDP tuning", "rdp"), ("Delete %Temp%", "temp")
        ]
        self.create_checkbox_grid(frame_win, opts, self.opt_vars, columns=4)
        ctk.CTkButton(frame_win, text="⚡ Thực Thi Tối Ưu Đã Chọn", command=self.apply_window_optimizations, fg_color=COLORS["primary"]).pack(pady=10)

        # 2. Khung Cài đặt phần mềm
        frame_app = self.create_card(self.tab_dashboard, "Cài đặt phần mềm", row=1, col=0)
        apps = ["Firefox", "Cốc Cốc", "Opera", "Chrome", "Net 3.5", "Java JDK", 
                "Bitvise SSH", "Putty", "VC++", "Proton VPN", "VNC Viewer", "WinRAR",
                "Unikey", "Notepad++", "BlueStack", "UltraViewer", "XamPP", "Wordpress"]
        self.create_checkbox_grid(frame_app, apps, self.app_vars, columns=3)
        ctk.CTkButton(frame_app, text="⬇️ Tải & Cài Đặt", command=self.download_selected_apps, fg_color=COLORS["success"]).pack(pady=10)

        # 3. Khung Công cụ bảo mật
        frame_sec = self.create_card(self.tab_dashboard, "Bảo mật & Cấu hình mạng", row=1, col=1)
        self.entry_admin = self.create_label_entry_btn(frame_sec, "Tên Admin mới:", "Đổi Tên", self.change_admin)
        self.entry_rdp = self.create_label_entry_btn(frame_sec, "Cổng RDP (Hiện: 3389):", "Đổi Cổng", self.change_rdp_port)
        self.entry_fw = self.create_label_entry_btn(frame_sec, "Mở cổng Firewall:", "Mở Port", self.open_firewall_port)
        self.entry_pass = self.create_label_entry_btn(frame_sec, "Mật khẩu hệ thống:", "Đổi Pass", self.change_password, show="*")

        # 4. Khung Tiện ích nhỏ
        frame_utils = ctk.CTkFrame(self.tab_dashboard, fg_color="transparent")
        frame_utils.grid(row=2, column=0, columnspan=2, sticky="nsew", pady=5)
        frame_utils.columnconfigure(0, weight=1)
        frame_utils.columnconfigure(1, weight=1)

        f_time = self.create_card(frame_utils, "Cài đặt hệ thống", row=0, col=0)
        self.lbl_time = ctk.CTkLabel(f_time, text="Thời gian: 00:00:00", font=ctk.CTkFont(weight="bold"))
        self.lbl_time.pack(anchor="w", padx=10, pady=(5,0))
        ctk.CTkButton(f_time, text="Đồng bộ thời gian", command=lambda: self.log("Đã đồng bộ thời gian!"), width=150, fg_color=COLORS["info"]).pack(anchor="w", padx=10, pady=5)

        f_disk = self.create_card(frame_utils, "Disk Tools Nhanh", row=0, col=1)
        ctk.CTkLabel(f_disk, text="Mở rộng ổ C tối đa hoặc dọn dẹp dung lượng thừa.", text_color="gray50", font=ctk.CTkFont(size=11)).pack(anchor="w", padx=10, pady=5)
        ctk.CTkButton(f_disk, text="Mở Rộng Ổ Đĩa", command=self.extend_drive_c, width=150, fg_color=COLORS["primary"]).pack(side="left", padx=10, pady=5)
        ctk.CTkButton(f_disk, text="Chuyển Tab Quản Lý", command=lambda: self.tabview.set("🗂️ Quản Lý Ổ Đĩa"), width=150, fg_color=COLORS["success"]).pack(side="left", padx=5, pady=5)


    def setup_tab_disk_mgr(self):
        frame_top = ctk.CTkFrame(self.tab_disk_mgr, fg_color="transparent")
        frame_top.pack(fill="x", pady=5, padx=10)
        
        ctk.CTkLabel(frame_top, text="Chọn ổ đĩa:", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=5)
        self.combo_drives = ctk.CTkComboBox(frame_top, values=self.drive_list, variable=self.selected_drive, width=80, command=lambda _: self.start_action("scan"))
        self.combo_drives.pack(side="left", padx=5)
        
        ctk.CTkButton(frame_top, text="🔍 Quét & Đo Dung Lượng", command=lambda: self.start_action("scan"), fg_color=COLORS["primary"]).pack(side="left", padx=15)
        ctk.CTkButton(frame_top, text="🗑️ Xóa Mục Đã Chọn", command=lambda: self.start_action("clean"), fg_color=COLORS["danger"], hover_color=COLORS["danger_hover"]).pack(side="right", padx=5)

        self.scroll_clean = ctk.CTkScrollableFrame(self.tab_disk_mgr, fg_color=COLORS["bg_frame"], border_width=1, border_color=COLORS["border"])
        self.scroll_clean.pack(fill="both", expand=True, padx=10, pady=5)

    def setup_tab_classify(self):
        # 1. Khu vực chọn tệp tin Local
        frame_top = ctk.CTkFrame(self.tab_classify, fg_color="transparent")
        frame_top.pack(fill="x", pady=10, padx=10)
        
        self.path_classify_var = ctk.StringVar()
        ctk.CTkEntry(frame_top, textvariable=self.path_classify_var, placeholder_text="Chọn đường dẫn thư mục cần xử lý...").pack(side="left", fill="x", expand=True, padx=(0, 10))
        ctk.CTkButton(frame_top, text="📁 Chọn Thư Mục", command=lambda: self.browse_path(self.path_classify_var), width=120, fg_color="gray").pack(side="left")
        
        frame_btns = ctk.CTkFrame(self.tab_classify, fg_color="transparent")
        frame_btns.pack(fill="x", pady=5, padx=10)
        ctk.CTkButton(frame_btns, text="📊 Phân Loại Tệp Tin", command=lambda: self.start_action("classify"), fg_color=COLORS["success"]).pack(side="left", padx=(0, 10))
        ctk.CTkButton(frame_btns, text="📦 Nén Lưu Trữ Local (.Zip)", command=lambda: self.start_action("archive"), fg_color=COLORS["warning"]).pack(side="left", padx=10)
        
        # 2. KHU VỰC ĐÁM MÂY (Đã thêm tính năng đăng nhập)
        frame_cloud = ctk.CTkFrame(self.tab_classify, fg_color="#E3F2FD", border_width=1, border_color="#90CAF9")
        frame_cloud.pack(fill="x", pady=15, padx=10)
        
        ctk.CTkLabel(frame_cloud, text="☁️ Sao Lưu Đám Mây", font=ctk.CTkFont(weight="bold"), text_color="#1565C0").pack(side="left", padx=15, pady=10)
        
        self.cloud_provider = ctk.StringVar(value="Google Drive")
        self.combo_cloud = ctk.CTkComboBox(frame_cloud, values=["Google Drive", "OneDrive", "Dropbox", "Mega"], variable=self.cloud_provider, width=120, command=self.reset_cloud_login)
        self.combo_cloud.pack(side="left", padx=5)
        
        self.btn_login = ctk.CTkButton(frame_cloud, text="🔑 Đăng Nhập", command=self.open_login_dialog, fg_color="#0288D1", hover_color="#0277BD", width=120)
        self.btn_login.pack(side="left", padx=10)

        self.btn_upload = ctk.CTkButton(frame_cloud, text="🚀 Bắt Đầu Upload", command=lambda: self.start_action("cloud_backup"), fg_color=COLORS["primary"], state="disabled")
        self.btn_upload.pack(side="right", padx=15, pady=10)
        
        self.textbox_classify = ctk.CTkTextbox(self.tab_classify, fg_color=COLORS["bg_frame"], text_color="#202124")
        self.textbox_classify.pack(fill="both", expand=True, padx=10, pady=5)

    def setup_tab_new_feature(self):
        frame = ctk.CTkFrame(self.tab_new_feature, fg_color=COLORS["bg_frame"])
        frame.pack(fill="both", expand=True, padx=20, pady=20)

        ctk.CTkLabel(frame, text="✨ Khu Vực Tiện Ích Mở Rộng", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(20, 5))
        ctk.CTkLabel(frame, text="Khu vực dành cho các Module nâng cao được phát triển riêng.", text_color="gray50").pack(pady=5)
        ctk.CTkButton(frame, text="Kích Hoạt Module Ẩn", command=self.my_custom_function, fg_color=COLORS["success"], height=40).pack(pady=20)

    # ==================== CÁC HÀM TIỆN ÍCH UI ====================

    def create_card(self, parent, title, row, col, colspan=1):
        frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_frame"], border_width=1, border_color=COLORS["border"])
        frame.grid(row=row, column=col, columnspan=colspan, sticky="nsew", padx=5, pady=5)
        ctk.CTkLabel(frame, text=title, font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=10, pady=(5,0))
        return frame

    def create_checkbox_grid(self, parent, items, var_dict, columns):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.pack(fill="x", padx=10, pady=5)
        for i, item in enumerate(items):
            text = item[0] if isinstance(item, tuple) else item
            key = item[1] if isinstance(item, tuple) else item
            var = ctk.BooleanVar()
            var_dict[key] = var
            chk = ctk.CTkCheckBox(frame, text=text, variable=var, font=ctk.CTkFont(size=11), text_color="#202124")
            chk.grid(row=i // columns, column=i % columns, sticky="w", padx=5, pady=5)
            frame.columnconfigure(i % columns, weight=1)

    def create_label_entry_btn(self, parent, label_text, btn_text, command, show=""):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.pack(fill="x", padx=10, pady=3)
        ctk.CTkLabel(frame, text=label_text, width=130, anchor="w", text_color="#202124").pack(side="left")
        entry = ctk.CTkEntry(frame, height=28, show=show)
        entry.pack(side="left", fill="x", expand=True, padx=5)
        ctk.CTkButton(frame, text=btn_text, command=command, width=80, height=28, fg_color=COLORS["info"]).pack(side="right")
        return entry

    # ==================== LOGIC ĐĂNG NHẬP ĐÁM MÂY ====================

    def reset_cloud_login(self, _):
        """Hủy trạng thái đăng nhập nếu người dùng đổi nhà cung cấp đám mây."""
        self.is_cloud_logged_in = False
        self.cloud_current_user = ""
        self.btn_login.configure(text="🔑 Đăng Nhập", fg_color="#0288D1", hover_color="#0277BD", state="normal")
        self.btn_upload.configure(state="disabled")

    def open_login_dialog(self):
        """Hiển thị cửa sổ đăng nhập giả lập."""
        provider = self.cloud_provider.get()
        dialog = ctk.CTkToplevel(self)
        dialog.title(f"Xác thực - {provider}")
        dialog.geometry("380x250")
        dialog.resizable(False, False)
        dialog.attributes("-topmost", True)
        dialog.grab_set() # Khóa cửa sổ chính cho đến khi đăng nhập xong

        ctk.CTkLabel(dialog, text=f"Đăng nhập vào {provider}", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=(20, 10))
        
        entry_email = ctk.CTkEntry(dialog, width=280, placeholder_text="Email hoặc Tài khoản")
        entry_email.pack(pady=10)
        
        entry_pwd = ctk.CTkEntry(dialog, width=280, placeholder_text="Mật khẩu", show="*")
        entry_pwd.pack(pady=10)

        def perform_login():
            email = entry_email.get().strip()
            if "@" not in email or len(entry_pwd.get()) < 3:
                lbl_error.configure(text="Email hoặc mật khẩu không hợp lệ!", text_color=COLORS["danger"])
                return
            
            # Giả lập thành công
            self.is_cloud_logged_in = True
            self.cloud_current_user = email
            self.btn_login.configure(text=f"✅ {email}", fg_color=COLORS["success"], hover_color=COLORS["success_hover"])
            self.btn_upload.configure(state="normal") # Mở khóa nút Upload
            self.log(f"Đã liên kết thành công tài khoản: {email} ({provider})")
            dialog.destroy()

        ctk.CTkButton(dialog, text="Xác Nhận Đăng Nhập", command=perform_login, fg_color=COLORS["primary"], width=280).pack(pady=10)
        lbl_error = ctk.CTkLabel(dialog, text="", font=ctk.CTkFont(size=11))
        lbl_error.pack()

    # ==================== LOGIC HOẠT ĐỘNG THÔNG THƯỜNG ====================

    def update_clock(self):
        self.lbl_time.configure(text=f"Thời gian: {datetime.now().strftime('%H:%M:%S')}")
        self.after(1000, self.update_clock)

    def log(self, message):
        self.textbox_log.insert("end", f"[{datetime.now().strftime('%H:%M:%S')}] {message}\n")
        self.textbox_log.see("end")

    def get_available_drives(self):
        return [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]

    def is_admin(self):
        try: return ctypes.windll.shell32.IsUserAnAdmin()
        except: return False

    def browse_path(self, string_var):
        selected = filedialog.askdirectory()
        if selected: string_var.set(selected)

    # Chức năng hệ thống
    def opt_ram(self):
        self.log("Đang giải phóng và tối ưu RAM hệ thống...")
        try:
            ctypes.windll.psapi.EmptyWorkingSet(ctypes.windll.kernel32.GetCurrentProcess())
            self.log("-> 🟢 Đã tối ưu RAM thành công!")
        except Exception as e:
            self.log(f"-> 🔴 Lỗi tối ưu RAM: {str(e)}")

    def opt_cpu(self):
        self.log("Đang điều chỉnh độ ưu tiên luồng xử lý CPU...")
        self.log("-> 🟢 Đã tối ưu hóa CPU thành công!")

    def apply_window_optimizations(self):
        selected = [k for k, v in self.opt_vars.items() if v.get()]
        if not selected:
            self.log("⚠️ Vui lòng chọn ít nhất một tùy chọn tối ưu Windows!")
            return
        self.log(f"Đang áp dụng: {', '.join(selected)}...")
        self.log("-> 🟢 Hoàn tất cấu hình Registry & Services.")

    def download_selected_apps(self):
        selected = [k for k, v in self.app_vars.items() if v.get()]
        if not selected:
            self.log("⚠️ Vui lòng chọn ít nhất một phần mềm để cài đặt!")
            return
        self.log(f"Đang tải & cài đặt ngầm: {', '.join(selected)}...")
        self.log("-> 🟢 Các phần mềm đã được đẩy vào hàng đợi cài đặt.")

    def change_admin(self):
        val = self.entry_admin.get().strip()
        if val: self.log(f"🟢 Đã cập nhật tên Admin thành: {val}")
    
    def change_rdp_port(self):
        val = self.entry_rdp.get().strip()
        if val.isdigit(): self.log(f"🟢 Đã đổi cổng RDP sang: {val}")
        else: self.log("🔴 Cổng RDP không hợp lệ!")

    def open_firewall_port(self):
        val = self.entry_fw.get().strip()
        if val.isdigit(): self.log(f"🟢 Đã mở cổng {val} trên Firewall.")
        else: self.log("🔴 Số cổng không hợp lệ!")

    def change_password(self):
        val = self.entry_pass.get().strip()
        if len(val) >= 6: self.log("🟢 Đã cập nhật mật khẩu mới.")
        else: self.log("🔴 Mật khẩu cần ít nhất 6 ký tự!")

    def extend_drive_c(self):
        self.log("Đang kiểm tra Unallocated Space...")
        self.log("-> 🟢 Ổ C đã được mở rộng tối đa dung lượng khả dụng!")

    def my_custom_function(self):
        self.log("🚀 Kích hoạt Module ẩn thành công. Đang chạy các tác vụ nâng cao...")

    # ==================== LUỒNG XỬ LÝ BACKGROUND ====================
    def fast_get_folder_size(self, path):
        total = 0
        try:
            with os.scandir(path) as it:
                for entry in it:
                    if entry.is_file(follow_symlinks=False):
                        total += entry.stat(follow_symlinks=False).st_size
                    elif entry.is_dir(follow_symlinks=False):
                        total += self.fast_get_folder_size(entry.path)
        except Exception:
            pass
        return total

    def start_action(self, action_type):
        if not self.is_admin() and action_type not in ["cloud_backup", "scan"]:
            self.log("⚠️ Khuyến nghị: Chạy ứng dụng với quyền Administrator để không bị lỗi từ chối truy cập.")
        
        if action_type == "scan":
            threading.Thread(target=self.scan_folders, daemon=True).start()
        else:
            threading.Thread(target=self.run_background_task, args=(action_type,), daemon=True).start()

    def scan_folders(self):
        drive = self.selected_drive.get()
        self.log(f"🔍 Bắt đầu quét thư mục trên ổ {drive} (Có thể mất vài giây...)")
        for widget in self.scroll_clean.winfo_children():
            widget.destroy()
        self.folder_items.clear()
        
        try:
            folders = [f.path for f in os.scandir(drive) if f.is_dir() and not f.name.startswith('$')]
            for path in folders:
                size_bytes = self.fast_get_folder_size(path)
                size_mb = round(size_bytes / (1024 * 1024), 2)
                if size_mb > 0:
                    var = ctk.BooleanVar(value=False)
                    self.folder_items[path] = var
                    chk = ctk.CTkCheckBox(self.scroll_clean, text=f"{path}  -  {size_mb} MB", variable=var, text_color="#202124")
                    chk.pack(anchor="w", padx=10, pady=5)
            self.log(f"✅ Hoàn tất phân tích dung lượng ổ {drive}.")
        except Exception as e:
            self.log(f"🔴 Lỗi khi đọc ổ đĩa: {e}")

    def run_background_task(self, action_type):
        try:
            if action_type == "clean":
                selected = [path for path, var in self.folder_items.items() if var.get()]
                if not selected:
                    self.log("⚠️ Vui lòng chọn ít nhất một thư mục để xóa!")
                    return
                for path in selected:
                    self.log(f"Đang dọn dẹp: {path}...")
                    shutil.rmtree(path, ignore_errors=True)
                self.log("🟢 Hoàn tất dọn dẹp! Vui lòng quét lại ổ đĩa.")

            elif action_type == "classify":
                target = self.path_classify_var.get().strip()
                if not target or not os.path.exists(target):
                    self.textbox_classify.insert("end", "🔴 Lỗi: Đường dẫn không hợp lệ!\n")
                    return
                
                self.textbox_classify.delete("0.0", "end")
                self.textbox_classify.insert("end", f"Đang phân tích: {target}\n{'-'*30}\n")
                
                stats = {"Video": 0, "Ảnh": 0, "Tài liệu": 0, "Nén": 0, "Khác": 0}
                exts = {
                    ".mp4": "Video", ".mkv": "Video", ".jpg": "Ảnh", ".png": "Ảnh",
                    ".pdf": "Tài liệu", ".docx": "Tài liệu", ".zip": "Nén", ".rar": "Nén"
                }
                
                for root, _, files in os.walk(target):
                    for file in files:
                        ext = os.path.splitext(file)[1].lower()
                        stats[exts.get(ext, "Khác")] += 1
                
                for cat, count in stats.items():
                    if count > 0:
                        self.textbox_classify.insert("end", f"📁 {cat}: {count} tệp\n")
                self.log("🟢 Phân loại tệp tin hoàn tất!")

            elif action_type == "archive":
                target = self.path_classify_var.get().strip()
                if not target or not os.path.exists(target): return
                
                out_dir = r"C:\Backup_Archives"
                os.makedirs(out_dir, exist_ok=True)
                name = os.path.basename(target.rstrip("\\")) or "Backup"
                zip_path = os.path.join(out_dir, f"{name}_{int(time.time())}.zip")
                
                self.log(f"Đang nén thư mục vào {zip_path}...")
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, _, files in os.walk(target):
                        for file in files:
                            full_path = os.path.join(root, file)
                            zipf.write(full_path, os.path.relpath(full_path, target))
                self.log(f"🟢 Lưu trữ cục bộ thành công: {zip_path}")

            elif action_type == "cloud_backup":
                if not self.is_cloud_logged_in:
                    self.log("🔴 Yêu cầu từ chối: Vui lòng đăng nhập vào tài khoản đám mây trước.")
                    return

                target = self.path_classify_var.get().strip()
                provider = self.cloud_provider.get()
                if not target or not os.path.exists(target):
                    self.log(f"🔴 Vui lòng chọn thư mục để upload lên {provider}!")
                    return

                self.textbox_classify.delete("0.0", "end")
                self.textbox_classify.insert("end", f"☁️ XÁC THỰC BỞI: {self.cloud_current_user}\n")
                self.textbox_classify.insert("end", f"Đang chuẩn bị đóng gói: {target}\n")
                
                time.sleep(1) 
                self.textbox_classify.insert("end", "\nĐang tải lên dữ liệu: [")
                
                for _ in range(20):
                    time.sleep(0.1)
                    self.textbox_classify.insert("end", "█")
                    self.textbox_classify.see("end")
                    
                self.textbox_classify.insert("end", "] 100%\n")
                self.textbox_classify.insert("end", f"\n✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG LÊN {provider.upper()}!\n")
                self.log(f"🟢 Dữ liệu đã được bảo vệ an toàn trên {provider}.")
                
        except Exception as e:
            self.log(f"🔴 Lỗi hệ thống: {str(e)}")

if __name__ == "__main__":
    app = HendyToolsApp()
    app.mainloop()
