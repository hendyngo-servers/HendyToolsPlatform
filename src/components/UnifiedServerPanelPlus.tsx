import React, { useState, useEffect } from 'react';
import { ReleaseStore, formatFileSize, formatReleaseDate } from '../services/releaseStore';
import { ReleaseManifest, Platform } from '../types';
import { NewReleaseModal } from './NewReleaseModal';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  port: number | null;
  status: 'running' | 'stopped' | 'restarting';
  uptime: string;
  cpu: number;
  memory: string;
}

interface ProcessItem {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  status: 'running' | 'sleeping';
}

interface PortItem {
  port: number;
  protocol: 'TCP' | 'UDP';
  service: string;
  binding: string;
  state: 'LISTEN' | 'ESTABLISHED';
}

interface Props {
  onBackToPublic: () => void;
  initialTab?: string;
}

export const UnifiedServerPanelPlus: React.FC<Props> = ({ onBackToPublic, initialTab = 'server-overview' }) => {
  // Navigation tab state covering both Server Infrastructure and Release Control
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Release Management States
  const [activeFilter, setActiveFilter] = useState<'all' | 'windows' | 'android'>('all');
  const [windowsLatest, setWindowsLatest] = useState<ReleaseManifest | null>(null);
  const [androidLatest, setAndroidLatest] = useState<ReleaseManifest | null>(null);
  const [iosLatest, setIosLatest] = useState<ReleaseManifest | null>(null);
  const [historyList, setHistoryList] = useState<ReleaseManifest[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isSyncingReleases, setIsSyncingReleases] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Server Management States
  const [cpuUsage, setCpuUsage] = useState(28);
  const [ramUsage, setRamUsage] = useState(4.3);
  const [diskUsage] = useState(58.4);
  const [netDown, setNetDown] = useState(3.4);
  const [netUp, setNetUp] = useState(1.1);

  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'hendy-api',
      name: 'hendy-tools-api',
      description: 'Hendy Tools Release & Update Gateway',
      port: 3000,
      status: 'running',
      uptime: '14d 08h 12m',
      cpu: 1.2,
      memory: '128 MB',
    },
    {
      id: 'nginx-proxy',
      name: 'nginx-reverse-proxy',
      description: 'SSL/TLS Edge Proxy & Load Balancer',
      port: 443,
      status: 'running',
      uptime: '38d 14h 50m',
      cpu: 0.8,
      memory: '64 MB',
    },
    {
      id: 'r2-sync',
      name: 'r2-storage-sync',
      description: 'Cloudflare R2 Bucket Artifact Sync Worker',
      port: null,
      status: 'running',
      uptime: '14d 08h 12m',
      cpu: 0.4,
      memory: '92 MB',
    },
    {
      id: 'docker-engine',
      name: 'docker-daemon',
      description: 'Container Runtime Environment',
      port: null,
      status: 'running',
      uptime: '45d 02h 20m',
      cpu: 2.1,
      memory: '380 MB',
    },
    {
      id: 'redis-cache',
      name: 'redis-server',
      description: 'In-Memory Release Manifest Cache',
      port: 6379,
      status: 'running',
      uptime: '14d 08h 12m',
      cpu: 0.3,
      memory: '48 MB',
    },
    {
      id: 'sshd',
      name: 'ssh-daemon',
      description: 'Secure Shell Remote Administration',
      port: 22,
      status: 'running',
      uptime: '60d 11h 05m',
      cpu: 0.1,
      memory: '16 MB',
    },
  ]);

  const [processes, setProcesses] = useState<ProcessItem[]>([
    { pid: 1420, name: 'node src/index.js', user: 'hendy', cpu: 1.8, memoryMb: 128, status: 'running' },
    { pid: 982, name: 'nginx: worker process', user: 'www-data', cpu: 0.6, memoryMb: 42, status: 'sleeping' },
    { pid: 1540, name: 'r2-sync-agent --watch', user: 'hendy', cpu: 0.4, memoryMb: 92, status: 'sleeping' },
    { pid: 740, name: 'dockerd -H fd://', user: 'root', cpu: 2.1, memoryMb: 380, status: 'running' },
    { pid: 612, name: 'redis-server 127.0.0.1:6379', user: 'redis', cpu: 0.3, memoryMb: 48, status: 'sleeping' },
    { pid: 489, name: '/usr/sbin/sshd -D', user: 'root', cpu: 0.1, memoryMb: 16, status: 'sleeping' },
    { pid: 310, name: 'systemd-journald', user: 'root', cpu: 0.2, memoryMb: 32, status: 'running' },
  ]);

  const [processSearch, setProcessSearch] = useState('');

  const ports: PortItem[] = [
    { port: 80, protocol: 'TCP', service: 'HTTP (Nginx)', binding: '0.0.0.0:80', state: 'LISTEN' },
    { port: 443, protocol: 'TCP', service: 'HTTPS (SSL/TLS)', binding: '0.0.0.0:443', state: 'LISTEN' },
    { port: 3000, protocol: 'TCP', service: 'Hendy Release API', binding: '0.0.0.0:3000', state: 'LISTEN' },
    { port: 22, protocol: 'TCP', service: 'OpenSSH Server', binding: '0.0.0.0:22', state: 'LISTEN' },
    { port: 6379, protocol: 'TCP', service: 'Redis Cache', binding: '127.0.0.1:6379', state: 'LISTEN' },
  ];

  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; out: string; time: string }>>([
    {
      cmd: 'hendy-server status',
      out: '✓ Hendy Tools Server Plus v2.5.0\n• Node: hendy-core-node-01.local\n• OS: Ubuntu 24.04 LTS (Linux 6.8.0)\n• Release Services: Active & Healthy\n• R2 Sync: 0 pending sync jobs\n• Public Releases: Windows v3.1.1, Android v3.1.1, iOS v1.0.0',
      time: '16:32:01',
    },
    {
      cmd: 'df -h /',
      out: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2  248G   58G  178G  25% /',
      time: '16:33:15',
    },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync releases from store
  const syncReleases = () => {
    setIsSyncingReleases(true);
    setTimeout(() => {
      setWindowsLatest(ReleaseStore.getLatestRelease('windows', 'stable'));
      setAndroidLatest(ReleaseStore.getLatestRelease('android', 'stable'));
      setIosLatest(ReleaseStore.getLatestRelease('ios', 'stable'));
      setHistoryList(ReleaseStore.getAllReleases());
      const now = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date());
      setLastSyncedTime(now);
      setIsSyncingReleases(false);
    }, 200);
  };

  useEffect(() => {
    syncReleases();
  }, []);

  // Fluctuate CPU/Net slightly
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage((prev) => Math.min(95, Math.max(12, Math.round(prev + (Math.random() * 8 - 4)))));
      setNetDown((prev) => parseFloat(Math.max(0.5, prev + (Math.random() * 1.2 - 0.6)).toFixed(1)));
      setNetUp((prev) => parseFloat(Math.max(0.2, prev + (Math.random() * 0.6 - 0.3)).toFixed(1)));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleServiceAction = (id: string, action: 'restart' | 'stop' | 'start') => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          if (action === 'restart') return { ...s, status: 'restarting' };
          if (action === 'stop') return { ...s, status: 'stopped', cpu: 0 };
          if (action === 'start') return { ...s, status: 'running', cpu: 0.8 };
        }
        return s;
      })
    );

    if (action === 'restart') {
      setTimeout(() => {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: 'running', uptime: '1m' } : s))
        );
        setToastMessage(`Dịch vụ ${id} đã được khởi động lại thành công.`);
        setTimeout(() => setToastMessage(null), 3000);
      }, 1200);
    } else {
      setToastMessage(`Dịch vụ ${id} đã được chuyển sang trạng thái ${action === 'stop' ? 'dừng' : 'chạy'}.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleKillProcess = (pid: number, name: string) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    setToastMessage(`Đã kết thúc tiến trình PID ${pid} (${name}).`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    let out = '';
    const now = new Date().toTimeString().split(' ')[0];

    if (cmd === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'uptime') {
      out = ` 16:35:12 up 18 days,  6:42,  2 users,  load average: 0.24, 0.38, 0.42`;
    } else if (cmd === 'free -h' || cmd === 'free -m') {
      out = `               total        used        free      shared  buff/cache   available\nMem:            16Gi       4.3Gi       8.9Gi       142Mi       2.8Gi        11Gi\nSwap:          4.0Gi          0B       4.0Gi`;
    } else if (cmd === 'docker ps') {
      out = `CONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS        PORTS                    NAMES\ne4a18bc92f10   hendy/api-gateway     "node src/index.js"      2 weeks ago    Up 2 weeks    0.0.0.0:3000->3000/tcp   hendy-api\n8190d7ca02c1   redis:7-alpine        "docker-entrypoint.s…"   2 weeks ago    Up 2 weeks    127.0.0.1:6379->6379/tcp hendy-redis`;
    } else if (cmd === 'releases') {
      out = `Hendy Tools Platform Releases:\n- Windows: v${windowsLatest?.version || 'N/A'} (Build ${windowsLatest?.build || 'N/A'})\n- Android: v${androidLatest?.version || 'N/A'} (Build ${androidLatest?.build || 'N/A'})\n- iOS: v${iosLatest?.version || 'N/A'} (TestFlight Store)`;
    } else if (cmd.startsWith('ping')) {
      out = `PING cloudflare.com (104.16.132.229) 56(84) bytes of data.\n64 bytes from 104.16.132.229: icmp_seq=1 ttl=58 time=8.12 ms\n64 bytes from 104.16.132.229: icmp_seq=2 ttl=58 time=7.94 ms\n--- cloudflare.com ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
    } else {
      out = `[exec] ${cmd}\nCommand executed successfully with exit code 0.`;
    }

    setTerminalHistory((prev) => [...prev, { cmd, out, time: now }]);
    setTerminalInput('');
  };

  const handleDownload = (platform: Platform) => {
    const rel = platform === 'windows' ? windowsLatest : platform === 'android' ? androidLatest : null;
    if (rel?.artifact) {
      ReleaseStore.triggerSimulatedDownload(platform, rel.version, rel.artifact.fileName);
      setToastMessage(`Đang tải gói ${rel.artifact.fileName}...`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có muốn đặt lại dữ liệu phát hành về mặc định ban đầu không?')) {
      ReleaseStore.resetToDefaults();
      syncReleases();
      setToastMessage('Đã khôi phục dữ liệu phát hành về mặc định.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const filteredHistory = historyList.filter(
    (item) => activeFilter === 'all' || item.platform === activeFilter
  );

  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase()) ||
      p.pid.toString().includes(processSearch) ||
      p.user.toLowerCase().includes(processSearch.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <div className="admin-ambient ambient-a" aria-hidden="true" />
      <div className="admin-ambient ambient-b" aria-hidden="true" />

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #102948, #0a1b32)',
            border: '1px solid #73e4d0',
            color: '#e5f8f5',
            padding: '14px 18px',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ color: '#73e4d0', fontSize: 18 }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar: Unified Navigation for Server Infrastructure & Release Management */}
      <aside className="admin-sidebar" style={{ width: 260 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 7px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="admin-brand-mark">
            H<span>+</span>
          </span>
          <div>
            <b>HENDY<span>SERVER</span></b>
            <small style={{ color: '#73e4d0', display: 'block', font: '8px var(--mono)', letterSpacing: '0.1em' }}>
              MANAGEMENT PANEL PLUS
            </small>
          </div>
        </div>

        {/* Back to Public Portal Button */}
        <button
          type="button"
          onClick={onBackToPublic}
          style={{
            marginTop: 12,
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 8,
            background: 'rgba(115, 228, 208, 0.08)',
            border: '1px solid rgba(115, 228, 208, 0.25)',
            color: '#73e4d0',
            fontSize: 10,
            fontWeight: 700,
            textAlign: 'left',
            width: '100%',
            transition: 'all 0.2s',
          }}
        >
          <span>←</span>
          <span>Cổng tải công khai (Public Site)</span>
        </button>

        {/* Section 1: Server Infrastructure */}
        <div className="sidebar-label" style={{ paddingTop: 14 }}>HẠ TẦNG MÁY CHỦ</div>
        <nav className="sidebar-nav" aria-label="Quản trị máy chủ">
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'server-overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('server-overview')}
          >
            <span className="nav-icon">◫</span>
            <span>Tài nguyên phần cứng</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <span className="nav-icon">⚙</span>
            <span>Dịch vụ hệ thống</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'processes' ? 'active' : ''}`}
            onClick={() => setActiveTab('processes')}
          >
            <span className="nav-icon">◈</span>
            <span>Tiến trình & Task</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'ports' ? 'active' : ''}`}
            onClick={() => setActiveTab('ports')}
          >
            <span className="nav-icon">▤</span>
            <span>Cổng mạng & Firewall</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <span className="nav-icon">⌘</span>
            <span>Cloud Shell Terminal</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'env' ? 'active' : ''}`}
            onClick={() => setActiveTab('env')}
          >
            <span className="nav-icon">≋</span>
            <span>Cấu hình môi trường (.env)</span>
            <i />
          </button>
        </nav>

        {/* Section 2: Release Control (merged from Release Console) */}
        <div className="sidebar-label" style={{ paddingTop: 18 }}>QUẢN LÝ PHÁT HÀNH</div>
        <nav className="sidebar-nav" aria-label="Quản lý phát hành">
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'release-overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('release-overview')}
          >
            <span className="nav-icon">◷</span>
            <span>Kênh & Bản phát hành</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="nav-icon">🗂</span>
            <span>Lịch sử Changelog</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'publish' ? 'active' : ''}`}
            onClick={() => setActiveTab('publish')}
          >
            <span className="nav-icon">↗</span>
            <span>Build & Xuất bản</span>
            <i />
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom" style={{ marginTop: 'auto', paddingTop: 14 }}>
          <div className="sidebar-health">
            <span className="health-indicator" />
            <div>
              <b>Server Node Status</b>
              <small>HENDY-CORE-01 · ONLINE</small>
            </div>
          </div>
          <div className="sidebar-version" style={{ marginTop: 8 }}>
            UNIFIED PANEL <span>PLUS V2.5</span>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="admin-main" style={{ marginLeft: 260 }}>
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>Hendy Tools</span>
            <i>/</i>
            <b>Bảng quản trị máy chủ & Quản lý phát hành Plus</b>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <i /> PRODUCTION NODE
            </span>
            <button
              type="button"
              className="topbar-public"
              style={{ color: '#73e4d0', fontWeight: 700 }}
              onClick={onBackToPublic}
            >
              Cổng tải công khai (Public Site) <span>↗</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="admin-content">
          {/* Quick Stats Summary Bar (Unified across server and releases) */}
          <section className="summary-grid" style={{ marginTop: 0 }}>
            <article className="summary-card" onClick={() => setActiveTab('server-overview')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>CPU & MEMORY</span>
                <span className="summary-icon icon-blue">⌁</span>
              </div>
              <div className="summary-value">{cpuUsage}% <span style={{ fontSize: 13, color: '#73e4d0', fontWeight: 500 }}>/ {ramUsage}GB</span></div>
              <div className="summary-bottom">
                <span>8 vCPU · 16 GB RAM</span>
                <b>Ổn định</b>
              </div>
              <div className="summary-rail">
                <i style={{ width: `${cpuUsage}%` }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('release-overview')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>WINDOWS RELEASE</span>
                <span className="summary-icon icon-teal">⊞</span>
              </div>
              <div className="summary-value">
                {windowsLatest ? `v${windowsLatest.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Pro</span>
                <b>{windowsLatest?.mandatory ? 'Cần cập nhật' : 'Đã công bố'}</b>
              </div>
              <div className="summary-rail teal-rail">
                <i style={{ width: '85%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('release-overview')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>ANDROID RELEASE</span>
                <span className="summary-icon icon-violet">◉</span>
              </div>
              <div className="summary-value">
                {androidLatest ? `v${androidLatest.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Mobile</span>
                <b>{androidLatest?.mandatory ? 'Cần cập nhật' : 'Đã công bố'}</b>
              </div>
              <div className="summary-rail violet-rail">
                <i style={{ width: '85%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('history')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>RELEASE ARCHIVE</span>
                <span className="summary-icon icon-green">🗂</span>
              </div>
              <div className="summary-value">{historyList.length}</div>
              <div className="summary-bottom">
                <span>Bản ghi R2 Archive</span>
                <b>Đã lưu trữ</b>
              </div>
              <div className="summary-rail green-rail">
                <i style={{ width: '100%' }} />
              </div>
            </article>
          </section>

          {/* TAB: SERVER OVERVIEW */}
          {activeTab === 'server-overview' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> TÀI NGUYÊN PHẦN CỨNG</div>
                  <h2>Tài nguyên máy chủ & Kết nối Cloudflare</h2>
                  <p>Giám sát thời gian thực các thông số phần cứng, băng thông và trạng thái liên kết đám mây.</p>
                </div>
                <button
                  type="button"
                  className="button button-soft"
                  onClick={() => {
                    setToastMessage('Đang quét lại toàn bộ tài nguyên phần cứng…');
                    setTimeout(() => setToastMessage(null), 2500);
                  }}
                >
                  <span>↻</span> Quét lại phần cứng
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                {/* Hardware Specs Card */}
                <div style={{ background: '#0a1a2e', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 12 }}>THÔNG SỐ PHẦN CỨNG & HỆ ĐIỀU HÀNH</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>NODE IDENTIFIER</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>hendy-core-node-01</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>OPERATING SYSTEM</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>Ubuntu 24.04 LTS (x86_64)</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>CPU CORES</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>8 vCPU · 3.4 GHz</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>SYSTEM UPTIME</small>
                      <div style={{ color: '#73e4d0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>18 ngày 06 giờ 42 phút</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>NVMe DISK STORAGE</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>{diskUsage} GB / 250 GB (23%)</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>TRAFFIC REALTIME</small>
                      <div style={{ color: '#73e4d0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>↓ {netDown} MB/s · ↑ {netUp} MB/s</div>
                    </div>
                  </div>
                </div>

                {/* Cloudflare & R2 Integration Status Card */}
                <div style={{ background: '#0a1a2e', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 12 }}>KẾT NỐI CLOUDFLARE & R2 OBJECT STORAGE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ color: '#eaf3ff', fontSize: 12, fontWeight: 700 }}>R2 Storage Bucket</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>hendy-tool-releases</small>
                      </div>
                      <span className="state-chip state-ok">ĐÃ KẾT NỐI</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ color: '#eaf3ff', fontSize: 12, fontWeight: 700 }}>SSL/TLS Certificate</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>Cloudflare Managed Edge CA</small>
                      </div>
                      <span className="state-chip state-ok">HỢP LỆ (ACTIVE)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#eaf3ff', fontSize: 12, fontWeight: 700 }}>WAF & Anti-DDoS</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>Enterprise Edge Protection</small>
                      </div>
                      <span className="state-chip state-ok">BẢO VỆ TỐI ĐA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM SERVICES */}
          {activeTab === 'services' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> SYSTEM SERVICES</div>
                  <h2>Quản lý dịch vụ máy chủ</h2>
                  <p>Khởi động lại, dừng hoặc bật các tiến trình dịch vụ cốt lõi của nền tảng Hendy Tools.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: '#0a1a2e',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 240 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 9,
                          background: svc.status === 'running' ? 'rgba(115,228,208,0.1)' : 'rgba(255,156,168,0.1)',
                          color: svc.status === 'running' ? '#73e4d0' : '#ff9ca8',
                          fontSize: 16,
                          border: `1px solid ${svc.status === 'running' ? 'rgba(115,228,208,0.2)' : 'rgba(255,156,168,0.2)'}`,
                        }}
                      >
                        ⚙
                      </span>
                      <div>
                        <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700 }}>
                          {svc.name} {svc.port ? <span style={{ color: '#82baff', fontSize: 10, font: 'var(--mono)' }}>:{svc.port}</span> : null}
                        </div>
                        <small style={{ color: '#748eaa', fontSize: 10 }}>{svc.description}</small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <div>
                        <small style={{ color: '#687f9d', font: '8px var(--mono)', display: 'block' }}>UPTIME</small>
                        <b style={{ color: '#cde1fa', font: '10px var(--mono)' }}>{svc.uptime}</b>
                      </div>
                      <div>
                        <small style={{ color: '#687f9d', font: '8px var(--mono)', display: 'block' }}>CPU / RAM</small>
                        <b style={{ color: '#cde1fa', font: '10px var(--mono)' }}>{svc.cpu}% / {svc.memory}</b>
                      </div>
                      <span className={`state-chip ${svc.status === 'running' ? 'state-ok' : svc.status === 'restarting' ? 'state-loading' : 'state-error'}`}>
                        {svc.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="button button-soft"
                        style={{ minHeight: 32, padding: '0 10px', fontSize: 9 }}
                        disabled={svc.status === 'restarting'}
                        onClick={() => handleServiceAction(svc.id, 'restart')}
                      >
                        Khởi động lại
                      </button>
                      {svc.status === 'running' ? (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: 32, padding: '0 10px', fontSize: 9, color: '#ff9ca8' }}
                          onClick={() => handleServiceAction(svc.id, 'stop')}
                        >
                          Dừng
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: 32, padding: '0 10px', fontSize: 9, color: '#73e4d0' }}
                          onClick={() => handleServiceAction(svc.id, 'start')}
                        >
                          Bật
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROCESSES */}
          {activeTab === 'processes' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> PROCESS MONITOR</div>
                  <h2>Tiến trình đang chạy trên hệ thống</h2>
                  <p>Theo dõi mức tiêu thụ RAM, CPU của các process và ngắt tiến trình khi cần.</p>
                </div>
                <div style={{ width: 220 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo tên hoặc PID..."
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="history-shell">
                <div className="history-table-head" style={{ gridTemplateColumns: '0.8fr 2.2fr 0.8fr 0.8fr 0.8fr 1fr' }}>
                  <span>PID</span>
                  <span>COMMAND / NAME</span>
                  <span>USER</span>
                  <span>CPU %</span>
                  <span>MEM (MB)</span>
                  <span>ACTION</span>
                </div>
                <div>
                  {filteredProcesses.map((p) => (
                    <div
                      key={p.pid}
                      className="history-row"
                      style={{ gridTemplateColumns: '0.8fr 2.2fr 0.8fr 0.8fr 0.8fr 1fr', alignItems: 'center' }}
                    >
                      <div style={{ color: '#8bbaff', font: '11px var(--mono)' }}>{p.pid}</div>
                      <div style={{ color: '#e5f0ff', fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: '#7d99bc', fontSize: 10, font: 'var(--mono)' }}>{p.user}</div>
                      <div style={{ color: '#73e4d0', font: '10px var(--mono)' }}>{p.cpu}%</div>
                      <div style={{ color: '#c9dcfa', font: '10px var(--mono)' }}>{p.memoryMb} MB</div>
                      <div>
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: 26, padding: '0 8px', fontSize: 9, color: '#ff9ca8' }}
                          onClick={() => handleKillProcess(p.pid, p.name)}
                        >
                          Kill ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PORTS */}
          {activeTab === 'ports' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> PORTS & NETSTAT</div>
                  <h2>Cổng kết nối mở & Tường lửa</h2>
                  <p>Bảng liệt kê các cổng TCP/UDP đang lắng nghe các kết nối từ client.</p>
                </div>
              </div>

              <div className="history-shell">
                <div className="history-table-head" style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 1fr' }}>
                  <span>PORT</span>
                  <span>PROTOCOL</span>
                  <span>SERVICE</span>
                  <span>BINDING</span>
                  <span>STATE</span>
                </div>
                <div>
                  {ports.map((pt, idx) => (
                    <div
                      key={idx}
                      className="history-row"
                      style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 1fr', alignItems: 'center' }}
                    >
                      <div style={{ color: '#73e4d0', font: '12px var(--mono)', fontWeight: 700 }}>:{pt.port}</div>
                      <div>
                        <span className="platform-badge">{pt.protocol}</span>
                      </div>
                      <div style={{ color: '#e5f0ff', fontSize: 11 }}>{pt.service}</div>
                      <div style={{ color: '#7ea4d0', font: '10px var(--mono)' }}>{pt.binding}</div>
                      <div>
                        <span className="state-chip state-ok">{pt.state}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TERMINAL */}
          {activeTab === 'terminal' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> SERVER TERMINAL</div>
                  <h2>Giao diện dòng lệnh máy chủ (Cloud Shell CLI)</h2>
                  <p>Thực thi các lệnh quản trị và kiểm tra hệ thống trên máy chủ Hendy Cloud Node.</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['uptime', 'free -h', 'df -h', 'docker ps', 'releases', 'clear'].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      className="filter"
                      onClick={() => setTerminalInput(cmd)}
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: '#040c17',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 18,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  minHeight: 340,
                  maxHeight: 460,
                  overflowY: 'auto',
                }}
              >
                <div style={{ color: '#6885a8', marginBottom: 14 }}>
                  Hendy Tools Cloud Shell [Version 2.5.0-release] — Connected to root@hendy-core-01
                </div>

                {terminalHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#73e4d0' }}>
                      <span style={{ color: '#88a3cb' }}>[{h.time}]</span>
                      <span>root@hendy-node:~$</span>
                      <b style={{ color: '#fff' }}>{h.cmd}</b>
                    </div>
                    <pre
                      style={{
                        margin: '6px 0 0',
                        color: '#b0c4de',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        fontFamily: 'inherit',
                      }}
                    >
                      {h.out}
                    </pre>
                  </div>
                ))}

                <form onSubmit={handleRunCommand} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <span style={{ color: '#73e4d0' }}>root@hendy-node:~$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Nhập lệnh (ví dụ: uptime, df -h, free -h, releases, ping, clear)..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontFamily: 'inherit',
                      fontSize: 11,
                    }}
                    autoFocus
                  />
                  <button type="submit" className="button button-soft" style={{ minHeight: 28, padding: '0 10px', fontSize: 9 }}>
                    Chạy ⏎
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: ENV */}
          {activeTab === 'env' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> CONFIGURATION</div>
                  <h2>Biến môi trường hệ thống (.env.example)</h2>
                  <p>Mẫu cấu hình tham chiếu phục vụ quá trình triển khai máy chủ và worker.</p>
                </div>
              </div>

              <div style={{ background: '#0a1a2e', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                <pre
                  style={{
                    color: '#9cb5d6',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    lineHeight: 1.8,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
{`# Hendy Tools Server & Release Management Panel Plus Configuration
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Cloudflare & R2 Object Storage
CLOUDFLARE_ACCOUNT_ID=ae9f204859a1098bca4810283c7d6100
R2_BUCKET_NAME=hendy-tool-releases
R2_ACCESS_KEY_ID=sec_r2_access_key_placeholder
R2_SECRET_ACCESS_KEY=sec_r2_secret_key_placeholder

# Security & CORS Configuration
CORS_ORIGIN=*
API_RATE_LIMIT=120
SECRET_SESSION_KEY=hendy_super_secret_session_key_2026

# Distribution Channels
DEFAULT_CHANNEL=stable
ENABLE_BETA_DOWNLOADS=true`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: RELEASE OVERVIEW & CHANNELS (from Release Console) */}
          {activeTab === 'release-overview' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> KÊNH THEO NỀN TẢNG</div>
                  <h2>Các kênh phát hành ứng dụng</h2>
                  <p>Manifest mới nhất và đường dẫn tải được đọc trực tiếp từ Hendy Update Server.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setIsModalOpen(true)}
                  >
                    + Tạo bản phát hành mới <span>↗</span>
                  </button>
                  <button
                    className="button button-soft button-refresh"
                    type="button"
                    disabled={isSyncingReleases}
                    onClick={syncReleases}
                  >
                    <span>↻</span> {isSyncingReleases ? 'Đang đồng bộ…' : 'Đồng bộ dữ liệu'}
                  </button>
                </div>
              </div>

              <div className="release-grid">
                {/* Windows Card */}
                <article className="release-card release-windows">
                  <div className="release-card-top">
                    <span className="release-app-icon windows-app-icon">⊞</span>
                    <span className={`state-chip ${windowsLatest?.mandatory ? 'state-loading' : 'state-ok'}`}>
                      {windowsLatest?.mandatory ? 'CẬP NHẬT BẮT BUỘC' : 'ĐÃ CÔNG BỐ'}
                    </span>
                  </div>
                  <div className="release-platform-label">DESKTOP SOFTWARE / 01</div>
                  <h3>Hendy Tools <span>Pro</span></h3>
                  <div className="release-version">
                    {windowsLatest ? `v${windowsLatest.version}` : '—'}
                  </div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{windowsLatest?.build ?? '—'}</b>
                    </div>
                    <div>
                      <small>FILE SIZE</small>
                      <b>{windowsLatest?.artifact ? formatFileSize(windowsLatest.artifact.size) : '—'}</b>
                    </div>
                  </div>
                  <div className="release-date">
                    {windowsLatest ? `Phát hành ${formatReleaseDate(windowsLatest.publishedAt)}` : 'Đang tải ngày phát hành…'}
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>RECENT CHANGES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {windowsLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                        <li key={idx}>{note}</li>
                      )) || <li>Không có ghi chú phát hành.</li>}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="button button-soft release-download"
                    onClick={() => handleDownload('windows')}
                  >
                    Tải bộ cài Windows <span>↓</span>
                  </button>
                </article>

                {/* Android Card */}
                <article className="release-card release-android">
                  <div className="release-card-top">
                    <span className="release-app-icon android-app-icon">◉</span>
                    <span className={`state-chip ${androidLatest?.mandatory ? 'state-loading' : 'state-ok'}`}>
                      {androidLatest?.mandatory ? 'CẬP NHẬT BẮT BUỘC' : 'ĐÃ CÔNG BỐ'}
                    </span>
                  </div>
                  <div className="release-platform-label">MOBILE SOFTWARE / 02</div>
                  <h3>Hendy Tools <span>Mobile</span></h3>
                  <div className="release-version">
                    {androidLatest ? `v${androidLatest.version}` : '—'}
                  </div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{androidLatest?.build ?? '—'}</b>
                    </div>
                    <div>
                      <small>FILE SIZE</small>
                      <b>{androidLatest?.artifact ? formatFileSize(androidLatest.artifact.size) : '—'}</b>
                    </div>
                  </div>
                  <div className="release-date">
                    {androidLatest ? `Phát hành ${formatReleaseDate(androidLatest.publishedAt)}` : 'Đang tải ngày phát hành…'}
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>RECENT CHANGES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {androidLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                        <li key={idx}>{note}</li>
                      )) || <li>Không có ghi chú phát hành.</li>}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="button button-soft release-download"
                    onClick={() => handleDownload('android')}
                  >
                    Tải APK Android <span>↓</span>
                  </button>
                </article>

                {/* iOS Card */}
                <article className="release-card release-ios">
                  <div className="release-card-top">
                    <span className="release-app-icon ios-app-icon">✳</span>
                    <span className="state-chip state-muted">PHỤ THUỘC APPLE</span>
                  </div>
                  <div className="release-platform-label">MOBILE SOFTWARE / 03</div>
                  <h3>Hendy Tools <span>iOS</span></h3>
                  <div className="release-version">
                    {iosLatest ? `v${iosLatest.version}` : 'Chưa phát hành'}
                  </div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{iosLatest?.build ?? '—'}</b>
                    </div>
                    <div>
                      <small>DISTRIBUTION</small>
                      <b>Apple</b>
                    </div>
                  </div>
                  <div className="release-date">
                    Cần cấu hình phương thức phân phối hợp lệ.
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>DISTRIBUTION NOTES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {iosLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                        <li key={idx}>{note}</li>
                      )) || <li>iOS cần chữ ký và phương thức phân phối được Apple cho phép.</li>}
                    </ul>
                  </div>
                  {iosLatest?.storeUrl ? (
                    <a
                      className="button button-soft release-download"
                      href={iosLatest.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở trang phân phối iOS <span>↗</span>
                    </a>
                  ) : (
                    <a
                      className="button button-soft release-download"
                      href="https://developer.apple.com/programs/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Thông tin phân phối iOS <span>↗</span>
                    </a>
                  )}
                </article>
              </div>
            </div>
          )}

          {/* TAB: HISTORY & CHANGELOG (from Release Console) */}
          {activeTab === 'history' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> CHANGELOG ARCHIVE</div>
                  <h2>Lịch sử các phiên bản phát hành</h2>
                  <p>Theo dõi từng phiên bản, số hiệu build và nội dung thay đổi đã được lưu trong R2.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="history-filters" role="group" aria-label="Lọc nền tảng">
                    <button
                      type="button"
                      className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('all')}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`filter ${activeFilter === 'windows' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('windows')}
                    >
                      Windows
                    </button>
                    <button
                      type="button"
                      className={`filter ${activeFilter === 'android' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('android')}
                    >
                      Android
                    </button>
                  </div>
                  <button
                    type="button"
                    className="filter"
                    style={{ color: '#829ab8' }}
                    onClick={handleResetDefaults}
                    title="Khôi phục dữ liệu ban đầu"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>

              <div className="history-shell">
                <div className="history-table-head">
                  <span>VERSION / BUILD</span>
                  <span>PLATFORM</span>
                  <span>PUBLISHED</span>
                  <span>RELEASE NOTES</span>
                </div>
                <div id="history-list">
                  {filteredHistory.length === 0 ? (
                    <div className="empty-state">
                      Không có phiên bản nào cho bộ lọc này.
                    </div>
                  ) : (
                    filteredHistory.map((item, index) => (
                      <div key={index} className="history-row">
                        <div>
                          <div className="history-version">v{item.version}</div>
                          <span className="history-build">BUILD {item.build}</span>
                        </div>
                        <div>
                          <span className="platform-badge">{item.platform.toUpperCase()}</span>
                        </div>
                        <div className="history-date">
                          {formatReleaseDate(item.publishedAt)}
                        </div>
                        <div className="history-notes">
                          <ul>
                            {item.releaseNotes.slice(0, 3).map((note, noteIdx) => (
                              <li key={noteIdx}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: BUILD & PUBLISH (from Release Console) */}
          {activeTab === 'publish' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> CI/CD WORKFLOWS</div>
                  <h2>Chuẩn bị & Công bố bản phát hành</h2>
                  <p>Mở workflow tự động trên GitHub Actions hoặc tạo manifest trực tiếp vào máy chủ.</p>
                </div>
              </div>

              <section className="publish-section" style={{ marginTop: 0 }}>
                <div className="publish-symbol">
                  <span>↗</span>
                </div>
                <div className="publish-copy">
                  <div className="section-index">01 <span>/</span> BUILD & PUBLISH PIPELINE</div>
                  <h2>Quy trình build có xác thực</h2>
                  <p>
                    Build Windows installer, Android APK, tính checksum SHA-256 và cập nhật manifest. Khóa ký Authenticode và Android signing key được bảo vệ trong GitHub Secrets.
                  </p>
                  <div className="publish-steps">
                    <span><b>01</b> Build trên cloud</span>
                    <span><b>02</b> Upload R2</span>
                    <span><b>03</b> Publish manifest</span>
                  </div>
                </div>
                <div className="publish-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setIsModalOpen(true)}
                  >
                    + Xuất bản manifest trực tiếp <span>↗</span>
                  </button>
                  <a
                    className="button button-soft"
                    href="https://github.com/ngogiaidy56-eng/HendyToolsApp/actions/workflows/build-and-publish-release.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mở release workflow <span>↗</span>
                  </a>
                  <a
                    className="button button-soft"
                    href="https://github.com/ngogiaidy56-eng/HendyToolsApp/actions/workflows/deploy-cloudflare.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Deploy website / API <span>↗</span>
                  </a>
                </div>
              </section>

              <section className="security-note" style={{ marginTop: 18 }}>
                <span className="security-icon">◇</span>
                <div>
                  <b>Quyền phát hành được bảo vệ</b>
                  <p>
                    Trang này chỉ đọc metadata công khai. Các thao tác ghi lên R2 và tạo bản phát hành thật chạy trong GitHub Actions với quyền truy cập đã cấu hình an toàn.
                  </p>
                </div>
                <span className="security-badge">NO PUBLIC WRITE TOKEN</span>
              </section>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="admin-brand-mark" style={{ width: 30, height: 30, fontSize: 13 }}>
              H<span>+</span>
            </span>
            <span>Hendy Server Management Panel Plus · Unified Release Platform</span>
          </div>
          <span style={{ fontSize: 9, color: '#687f9d' }}>Tất cả dữ liệu phiên bản và hạ tầng đã được đồng bộ hóa.</span>
          <button type="button" onClick={onBackToPublic} style={{ color: '#73e4d0', fontSize: 11, fontWeight: 700 }}>
            Về Cổng tải công khai ↗
          </button>
        </footer>
      </div>

      {/* Modal for creating a new release manifest */}
      <NewReleaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          syncReleases();
          setToastMessage('Bản phát hành mới đã được công bố thành công vào hệ thống!');
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};
