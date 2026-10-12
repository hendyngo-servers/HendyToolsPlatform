import 'dart:async';
import 'dart:io';
import 'dart:convert';

import 'package:battery_plus/battery_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HendyToolsMobileApp());
}

const _brandBlue = Color(0xFF4F8CFF);
const _brandCyan = Color(0xFF43D9D5);
const _pageBg = Color(0xFF0B1120);
const _panel = Color(0xFF141F33);
const _panelAlt = Color(0xFF192740);
const _muted = Color(0xFF9AAAC4);
const _updateBaseUrl = String.fromEnvironment('HENDY_UPDATE_BASE_URL', defaultValue: '');
const _updateChannel = String.fromEnvironment('HENDY_UPDATE_CHANNEL', defaultValue: 'stable');

class HendyToolsMobileApp extends StatelessWidget {
  const HendyToolsMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _brandBlue,
      brightness: Brightness.dark,
      surface: _panel,
    );
    return MaterialApp(
      title: 'Hendy Tools Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: _pageBg,
        appBarTheme: const AppBarTheme(
          backgroundColor: _pageBg,
          foregroundColor: Colors.white,
          centerTitle: false,
        ),
        cardTheme: const CardThemeData(
          color: _panel,
          elevation: 0,
          margin: EdgeInsets.zero,
        ),
      ),
      home: const MobileHomePage(),
    );
  }
}

class MobileHomePage extends StatefulWidget {
  const MobileHomePage({super.key});

  @override
  State<MobileHomePage> createState() => _MobileHomePageState();
}

class _MobileHomePageState extends State<MobileHomePage> {
  final Battery _battery = Battery();
  StreamSubscription<BatteryState>? _batterySubscription;
  int _selectedTab = 0;
  int? _batteryLevel;
  BatteryState? _batteryState;
  String _deviceName = 'Đang đọc thiết bị…';
  String _osName = Platform.operatingSystem;
  String _osVersion = 'Đang đọc phiên bản…';
  String _cacheMessage = 'Đang kiểm tra cache riêng của Hendy Tools…';
  Directory? _appCacheDirectory;
  bool _busy = false;
  bool _checkingUpdate = false;
  String _appVersionText = 'Đang đọc phiên bản…';

  @override
  void initState() {
    super.initState();
    _refreshBattery();
    _batterySubscription = _battery.onBatteryStateChanged.listen((state) {
      if (mounted) setState(() => _batteryState = state);
    });
    _loadDeviceDetails();
    _loadAppVersion();
    _prepareCacheDirectory();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkForUpdates(showNoUpdate: false);
    });
  }

  @override
  void dispose() {
    _batterySubscription?.cancel();
    super.dispose();
  }

  Future<void> _refreshBattery() async {
    try {
      final level = await _battery.batteryLevel;
      final state = await _battery.batteryState;
      if (mounted) {
        setState(() {
          _batteryLevel = level;
          _batteryState = state;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _batteryLevel = null);
    }
  }

  Future<void> _loadDeviceDetails() async {
    try {
      final plugin = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final info = await plugin.androidInfo;
        if (!mounted) return;
        setState(() {
          _deviceName = '${info.manufacturer} ${info.model}'.trim();
          _osName = 'Android';
          _osVersion = 'Android ${info.version.release} · API ${info.version.sdkInt}';
        });
      } else if (Platform.isIOS) {
        final info = await plugin.iosInfo;
        if (!mounted) return;
        setState(() {
          _deviceName = '${info.name} (${info.model})';
          _osName = info.systemName;
          _osVersion = '${info.systemName} ${info.systemVersion}';
        });
      } else {
        final info = await plugin.deviceInfo;
        if (!mounted) return;
        setState(() {
          _deviceName = info.data['name']?.toString() ?? 'Thiết bị';
          _osName = Platform.operatingSystem;
          _osVersion = Platform.operatingSystemVersion;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _osVersion = 'Không đọc được thông tin thiết bị: $error');
    }
  }

  Future<void> _prepareCacheDirectory() async {
    try {
      final temp = await getTemporaryDirectory();
      final ownedCache = Directory('${temp.path}${Platform.pathSeparator}hendy_tools_cache');
      await ownedCache.create(recursive: true);
      _appCacheDirectory = ownedCache;
      final count = await _countFiles(ownedCache);
      if (mounted) {
        setState(() => _cacheMessage = '$count mục cache riêng của ứng dụng');
      }
    } catch (error) {
      if (mounted) setState(() => _cacheMessage = 'Không đọc được cache: $error');
    }
  }

  Future<int> _countFiles(Directory directory) async {
    var count = 0;
    if (!await directory.exists()) return count;
    await for (final entity in directory.list(followLinks: false, recursive: true)) {
      if (entity is File) count++;
    }
    return count;
  }

  Future<void> _loadAppVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) setState(() => _appVersionText = '${info.version} (build ${info.buildNumber})');
    } catch (_) {
      if (mounted) setState(() => _appVersionText = 'Không đọc được phiên bản');
    }
  }

  Future<void> _checkForUpdates({bool showNoUpdate = true}) async {
    if (_checkingUpdate) return;
    if (!Platform.isAndroid && !Platform.isIOS) {
      if (showNoUpdate && mounted) _showMessage('Kiểm tra cập nhật qua Hendy Update Server chỉ khả dụng trên Android/iOS.');
      return;
    }
    final base = _updateBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    if (base.isEmpty || !base.startsWith('https://') || base.contains('example.workers.dev')) {
      if (showNoUpdate && mounted) _showMessage('Chưa cấu hình HENDY_UPDATE_BASE_URL khi build ứng dụng.');
      return;
    }

    setState(() => _checkingUpdate = true);
    try {
      final package = await PackageInfo.fromPlatform();
      final platformName = Platform.isAndroid ? 'android' : 'ios';
      final uri = Uri.parse('$base/api/v1/releases/latest').replace(queryParameters: {
        'platform': platformName,
        'channel': _updateChannel,
        'current': package.version,
        'build': package.buildNumber,
      });
      final response = await http.get(uri, headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      }).timeout(const Duration(seconds: 15));
      if (response.statusCode != 200) throw Exception('Update Server trả HTTP ${response.statusCode}');
      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) throw Exception('Manifest không hợp lệ');
      if (decoded['platform'] != platformName) throw Exception('Manifest sai nền tảng');
      if (decoded['updateAvailable'] != true) {
        if (showNoUpdate && mounted) _showMessage('Bạn đang sử dụng phiên bản mới nhất.');
        return;
      }

      final version = decoded['version']?.toString() ?? 'mới';
      final mandatory = decoded['mandatory'] == true;
      final storeUrl = decoded['storeUrl']?.toString() ?? '';
      final downloadUrl = decoded['downloadUrl']?.toString() ?? '';
      final notes = decoded['releaseNotes'];
      final notesText = notes is List
          ? notes.whereType<String>().map((line) => '• $line').join('\n')
          : 'Có bản phát hành mới.';
      final isDirectAndroid = Platform.isAndroid && downloadUrl.startsWith('https://');
      final destination = isDirectAndroid ? downloadUrl : storeUrl;
      final actionText = isDirectAndroid ? 'Tải APK mới' : 'Mở trang phân phối';
      final platformNotice = isDirectAndroid
          ? '\n\nAndroid sẽ tải APK và yêu cầu bạn xác nhận cài đặt. Có thể cần cho phép trình duyệt cài ứng dụng từ nguồn này trong cài đặt Android.'
          : '\n\nTrên iPhone/iPad, hãy dùng phương thức phân phối iOS chính thức đã được cấu hình; tệp IPA thông thường không thể cài chỉ bằng tải tệp từ website.';
      if (!mounted) return;
      final shouldOpen = await showDialog<bool>(
        context: context,
        barrierDismissible: !mandatory,
        builder: (dialogContext) => AlertDialog(
          title: Text(mandatory ? 'Cần cập nhật Hendy Tools' : 'Có bản cập nhật Hendy Tools'),
          content: SingleChildScrollView(
            child: Text('Phiên bản hiện tại: ${package.version} (build ${package.buildNumber})\n'
                'Phiên bản mới: $version${mandatory ? '\n\nBản phát hành này được đánh dấu quan trọng.' : ''}\n\n'
                '${notesText.isEmpty ? 'Có cải tiến và sửa lỗi.' : notesText}$platformNotice'),
          ),
          actions: [
            if (!mandatory)
              TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('Để sau')),
            FilledButton(onPressed: () => Navigator.of(dialogContext).pop(true), child: Text(actionText)),
          ],
        ),
      );
      if (shouldOpen == true) {
        final target = Uri.tryParse(destination);
        if (target == null || target.scheme != 'https' || target.host.isEmpty) {
          if (mounted) _showMessage(isDirectAndroid
              ? 'Manifest chưa có liên kết tải APK HTTPS hợp lệ.'
              : 'Manifest chưa có liên kết phân phối HTTPS hợp lệ.');
        } else {
          final launched = await launchUrl(target, mode: LaunchMode.externalApplication);
          if (!launched && mounted) _showMessage('Không thể mở liên kết phân phối.');
        }
      }
    } catch (error) {
      if (showNoUpdate && mounted) _showMessage('Không kiểm tra được cập nhật: $error');
    } finally {
      if (mounted) setState(() => _checkingUpdate = false);
    }
  }

  Future<void> _clearOwnedCache() async {
    final directory = _appCacheDirectory;
    if (directory == null) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Dọn cache Hendy Tools'),
        content: const Text(
          'Chỉ xóa các tệp bên trong thư mục cache riêng do Hendy Tools tạo. '
          'Không xóa dữ liệu hoặc cache của ứng dụng khác.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Dọn cache')),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    setState(() => _busy = true);
    try {
      if (await directory.exists()) {
        await for (final entity in directory.list(followLinks: false)) {
          await entity.delete(recursive: true);
        }
      }
      await directory.create(recursive: true);
      if (mounted) {
        setState(() => _cacheMessage = 'Đã dọn cache riêng của Hendy Tools');
        _showMessage('Đã dọn cache riêng của ứng dụng.');
      }
    } catch (error) {
      if (mounted) _showMessage('Không dọn được cache: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openAppSettings() async {
    final opened = await openAppSettings();
    if (mounted && !opened) {
      _showMessage('Thiết bị không mở được trang cài đặt ứng dụng tự động.');
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _showOptimizationTips() async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tối ưu điện thoại an toàn'),
        content: const SingleChildScrollView(
          child: Text(
            '• Kiểm tra mức dùng pin trong Cài đặt và hạn chế ứng dụng ít dùng.\n\n'
            '• Giải phóng dung lượng bằng công cụ lưu trữ chính thức của Android/iOS.\n\n'
            '• Cập nhật hệ điều hành và ứng dụng từ cửa hàng chính thức.\n\n'
            '• Khởi động lại nếu điện thoại chậm bất thường.\n\n'
            'Hendy Tools Mobile không tự kill ứng dụng khác, không xóa dữ liệu ứng dụng khác và không sửa giới hạn hệ điều hành.',
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))],
      ),
    );
  }

  String get _batteryStateText {
    final state = _batteryState;
    if (state == null) return 'Chưa có dữ liệu trạng thái';
    switch (state) {
      case BatteryState.charging:
        return 'Đang sạc';
      case BatteryState.discharging:
        return 'Đang dùng pin';
      case BatteryState.full:
        return 'Đã sạc đầy';
      case BatteryState.connectedNotCharging:
        return 'Đã kết nối nguồn, không sạc';
      case BatteryState.unknown:
        return 'Không xác định';
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _buildDashboard(),
      _buildToolsPage(),
      _buildSettingsPage(),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('HENDY TOOLS', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
            Text('MOBILE COMPANION', style: TextStyle(fontSize: 10, color: _brandCyan, letterSpacing: 1.7)),
          ],
        ),
        actions: [
          IconButton(tooltip: 'Làm mới', onPressed: () { _refreshBattery(); _loadDeviceDetails(); }, icon: const Icon(Icons.refresh_rounded)),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(child: IndexedStack(index: _selectedTab, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) => setState(() => _selectedTab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Tổng quan'),
          NavigationDestination(icon: Icon(Icons.build_outlined), selectedIcon: Icon(Icons.build), label: 'Công cụ'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Cài đặt'),
        ],
      ),
    );
  }

  Widget _buildDashboard() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(colors: [Color(0xFF203A65), Color(0xFF14243B)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            border: Border.all(color: const Color(0xFF2A456E)),
          ),
          child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('DEVICE CARE CENTER', style: TextStyle(color: _brandCyan, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
            SizedBox(height: 10),
            Text('Thiết bị khỏe.\nKiểm soát rõ ràng.', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, height: 1.15)),
            SizedBox(height: 10),
            Text('Theo dõi thông tin cục bộ và chạy các tiện ích an toàn trong phạm vi hệ điều hành cho phép.', style: TextStyle(color: _muted, height: 1.45)),
          ]),
        ),
        const SizedBox(height: 14),
        _sectionTitle('TRẠNG THÁI THIẾT BỊ'),
        _batteryCard(),
        const SizedBox(height: 12),
        _infoCard(Icons.phone_android_rounded, 'Thiết bị', _deviceName, '$_osName · $_osVersion'),
        const SizedBox(height: 12),
        _sectionTitle('THAO TÁC NHANH'),
        _actionCard(Icons.cleaning_services_outlined, 'Dọn cache của Hendy Tools', _cacheMessage, onTap: _clearOwnedCache),
        const SizedBox(height: 10),
        _actionCard(Icons.tips_and_updates_outlined, 'Gợi ý tối ưu pin & lưu trữ', 'Các bước thủ công an toàn, không tắt ép ứng dụng khác.', onTap: _showOptimizationTips),
        const SizedBox(height: 10),
        _actionCard(Icons.settings_applications_outlined, 'Cài đặt ứng dụng', 'Mở trang cài đặt chính thức của Hendy Tools.', onTap: _openAppSettings),
        const SizedBox(height: 16),
        _notice('Giới hạn hệ điều hành', 'Android/iOS không cho ứng dụng thông thường tự tắt mọi tiến trình, xóa cache của ứng dụng khác hoặc điều chỉnh lõi hệ thống. Các thao tác đó không được giả lập trong ứng dụng này.'),
      ],
    );
  }

  Widget _buildToolsPage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _sectionTitle('CÔNG CỤ ĐIỆN THOẠI'),
        _actionCard(Icons.battery_charging_full_rounded, 'Làm mới trạng thái pin', 'Đọc lại mức pin và trạng thái sạc hiện tại.', onTap: _refreshBattery),
        const SizedBox(height: 10),
        _actionCard(Icons.delete_sweep_outlined, 'Dọn cache riêng', 'Chỉ xóa nội dung trong thư mục cache do ứng dụng Hendy tạo.', onTap: _clearOwnedCache),
        const SizedBox(height: 10),
        _actionCard(Icons.lightbulb_outline_rounded, 'Hướng dẫn bảo trì', 'Gợi ý giải phóng bộ nhớ, cập nhật hệ điều hành và bảo vệ pin.', onTap: _showOptimizationTips),
        const SizedBox(height: 10),
        _actionCard(Icons.settings_outlined, 'Cài đặt hệ thống ứng dụng', 'Chuyển đến trang cài đặt của ứng dụng trong Android/iOS.', onTap: _openAppSettings),
        const SizedBox(height: 16),
        _notice('Tích hợp điều khiển PC', 'Muốn xem hoặc quản lý máy Windows từ điện thoại, cần phát triển thêm backend có đăng nhập, ghép cặp thiết bị, HTTPS và nhật ký kiểm toán. Không mở cổng điều khiển Windows trực tiếp ra Internet.'),
      ],
    );
  }

  Widget _buildSettingsPage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _sectionTitle('ỨNG DỤNG'),
        _actionCard(Icons.system_update_alt_rounded, _checkingUpdate ? 'Đang kiểm tra cập nhật…' : 'Kiểm tra cập nhật', 'Phiên bản $_appVersionText · kiểm tra qua Hendy Update Server và mở cửa hàng chính thức.', onTap: () => _checkForUpdates()),
        const SizedBox(height: 10),
        _infoCard(Icons.verified_user_outlined, 'Quyền riêng tư', 'Không yêu cầu quyền đọc danh bạ, SMS, vị trí hay ảnh.', 'Thông tin thiết bị và pin được đọc cục bộ để hiển thị trên màn hình.'),
        const SizedBox(height: 12),
        _infoCard(Icons.phone_android_outlined, 'Nền tảng', _osName, _osVersion),
        const SizedBox(height: 12),
        _infoCard(Icons.folder_open_outlined, 'Cache riêng', _cacheMessage, _appCacheDirectory?.path ?? 'Chưa khởi tạo'),
        const SizedBox(height: 16),
        _notice('Windows Edition và Mobile Edition', 'Bản Windows có thể chẩn đoán hệ thống qua các công cụ Windows. Bản mobile cung cấp tiện ích phù hợp cho điện thoại; không cố áp dụng các chức năng quản trị Windows vào Android/iOS.'),
      ],
    );
  }

  Widget _batteryCard() {
    final level = _batteryLevel;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF2A3954))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 42, height: 42, decoration: BoxDecoration(color: _brandCyan.withValues(alpha: 0.13), borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.battery_5_bar_rounded, color: _brandCyan)),
          const SizedBox(width: 12),
          const Expanded(child: Text('Pin thiết bị', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700))),
          Text(level == null ? '--' : '$level%', style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 15),
        ClipRRect(borderRadius: BorderRadius.circular(30), child: LinearProgressIndicator(value: level == null ? null : level / 100, minHeight: 7, backgroundColor: const Color(0xFF2A3954), color: level != null && level < 20 ? Colors.orangeAccent : _brandCyan)),
        const SizedBox(height: 10),
        Text(_batteryStateText, style: const TextStyle(color: _muted, fontSize: 12)),
      ]),
    );
  }

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(left: 3, bottom: 10),
    child: Text(title, style: const TextStyle(color: _muted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.4)),
  );

  Widget _infoCard(IconData icon, String title, String primary, String detail) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(15), border: Border.all(color: const Color(0xFF2A3954))),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: _brandBlue, size: 25),
      const SizedBox(width: 13),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(color: _muted, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(primary, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(detail, style: const TextStyle(color: _muted, fontSize: 11, height: 1.4)),
      ])),
    ]),
  );

  Widget _actionCard(IconData icon, String title, String detail, {required VoidCallback onTap}) => Material(
    color: _panel,
    borderRadius: BorderRadius.circular(15),
    child: InkWell(
      borderRadius: BorderRadius.circular(15),
      onTap: _busy ? null : onTap,
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(15), border: Border.all(color: const Color(0xFF2A3954))),
        child: Row(children: [
          Container(width: 43, height: 43, decoration: BoxDecoration(color: _panelAlt, borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: _brandCyan)),
          const SizedBox(width: 13),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(detail, style: const TextStyle(color: _muted, fontSize: 11, height: 1.35)),
          ])),
          const Icon(Icons.chevron_right_rounded, color: _muted),
        ]),
      ),
    ),
  );

  Widget _notice(String title, String body) => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(color: const Color(0xFF222B3B), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF3A4A63))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [const Icon(Icons.info_outline_rounded, color: _brandCyan, size: 19), const SizedBox(width: 8), Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800))]),
      const SizedBox(height: 8),
      Text(body, style: const TextStyle(color: _muted, fontSize: 11, height: 1.5)),
    ]),
  );
}
