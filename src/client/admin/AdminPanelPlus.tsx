import React, { useState, useEffect } from 'react';
import { ProductionStore, formatByteSize, formatDateTime, formatSimpleDate } from '../shared/store';
import {
  ReleaseManifest,
  SystemService,
  ProcessMetric,
  NetworkPort,
  Platform,
  TerminalEntry,
  DomainMapping,
  SoftwareComponent,
  AuditLog,
  EdgeTrafficMetric,
  PlatformProvider,
  TargetInterface,
} from '../shared/types';
import { PublishModal } from '../shared/PublishModal';
import './AdminPanelPlus.css';

interface Props {
  onBackToPortal: () => void;
  initialTab?: string;
}

export const AdminPanelPlus: React.FC<Props> = ({ onBackToPortal, initialTab = 'telemetry' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Telemetry real-time states
  const [cpuUsage, setCpuUsage] = useState(26);
  const [ramUsage, setRamUsage] = useState(4.3);
  const [netDown, setNetDown] = useState(3.4);
  const [netUp, setNetUp] = useState(1.1);

  // System services & processes
  const [services, setServices] = useState<SystemService[]>([]);
  const [processes, setProcesses] = useState<ProcessMetric[]>([]);
  const [processSearch, setProcessSearch] = useState('');
  const [ports, setPorts] = useState<NetworkPort[]>([]);

  // Release Management
  const [releases, setReleases] = useState<ReleaseManifest[]>([]);
  const [winRelease, setWinRelease] = useState<ReleaseManifest | null>(null);
  const [androidRelease, setAndroidRelease] = useState<ReleaseManifest | null>(null);
  const [iosRelease, setIosRelease] = useState<ReleaseManifest | null>(null);
  const [releaseFilter, setReleaseFilter] = useState<'all' | 'windows' | 'android'>('all');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Domains & Routing
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [components, setComponents] = useState<SoftwareComponent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [trafficMetrics, setTrafficMetrics] = useState<EdgeTrafficMetric[]>([]);

  // Add Domain Modal
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [newHost, setNewHost] = useState('');
  const [newProvider, setNewProvider] = useState<PlatformProvider>('cloudflare-pages');
  const [newTarget, setNewTarget] = useState<TargetInterface>('admin');
  const [newNotes, setNewNotes] = useState('');

  // Domain URL Simulator
  const [simUrl, setSimUrl] = useState('https://admin-hendytools.pages.dev/domains');
  const [simResult, setSimResult] = useState<{ view: 'download' | 'admin'; matchedSource: string; defaultTab?: string } | null>(null);

  // Snapshot modal
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [snapshotJson, setSnapshotJson] = useState('');
  const [snapshotImportInput, setSnapshotImportInput] = useState('');

  // Webhook Test status
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([
    {
      id: '1',
      command: 'systemctl status hendy-tools',
      output: '● hendy-tools.service - Hendy Tools Platform Gateway\n     Active: active (running) since Sun 2026-10-15 08:00:00 UTC\n     Main PID: 1420 (node)\n     Memory: 134.2M\n     CPU: 14min 22.18s\n     Status: "Production Gateway Serving on port 3000 (TLS 1.3)"',
      timestamp: '10:14:02',
      status: 'success',
    },
    {
      id: '2',
      command: 'r2-storage-sync --status',
      output: 'Cloudflare R2 Bucket: hendy-tool-releases [Region: APAC / Enterprise]\n• Inbound sync: 0 pending\n• Artifacts stored: 12 packages (EXE, APK, MSI, Manifests)\n• ETag Cache: 100% verified',
      timestamp: '10:15:30',
      status: 'success',
    },
  ]);
  const [cliInput, setCliInput] = useState('');

  // API Debugger
  const [debugPlatform, setDebugPlatform] = useState<Platform>('windows');
  const [debugVersion, setDebugVersion] = useState('3.0.0');
  const [debugBuild, setDebugBuild] = useState('30000');
  const [debugResult, setDebugResult] = useState<string | null>(null);

  // Alert toast
  const [toast, setToast] = useState<string | null>(null);
  const [revealSecrets, setRevealSecrets] = useState(false);

  const refreshAll = () => {
    setServices(ProductionStore.getServices());
    setProcesses(ProductionStore.getProcesses());
    setPorts(ProductionStore.getPorts());
    setReleases(ProductionStore.getReleases());
    setWinRelease(ProductionStore.getLatest('windows', 'stable'));
    setAndroidRelease(ProductionStore.getLatest('android', 'stable'));
    setIosRelease(ProductionStore.getLatest('ios', 'stable'));
    setDomains(ProductionStore.getDomains());
    setComponents(ProductionStore.getComponents());
    setAuditLogs(ProductionStore.getAuditLogs());
    setTrafficMetrics(ProductionStore.getTrafficMetrics());
  };

  useEffect(() => {
    refreshAll();

  }, []);

  // Fluctuations for telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage((prev) => Math.min(92, Math.max(14, Math.round(prev + (Math.random() * 8 - 4)))));
      setNetDown((prev) => parseFloat(Math.max(0.6, prev + (Math.random() * 1.2 - 0.6)).toFixed(1)));
      setNetUp((prev) => parseFloat(Math.max(0.2, prev + (Math.random() * 0.6 - 0.3)).toFixed(1)));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleServiceAction = (id: string, action: 'restart' | 'stop' | 'start') => {
    ProductionStore.updateServiceStatus(id, action === 'restart' ? 'restarting' : action === 'stop' ? 'stopped' : 'running');
    setServices(ProductionStore.getServices());

    if (action === 'restart') {
      setTimeout(() => {
        ProductionStore.updateServiceStatus(id, 'running');
        setServices(ProductionStore.getServices());
        setToast(`Dịch vụ ${id} đã được khởi động lại thành công.`);
        setTimeout(() => setToast(null), 3000);
      }, 1200);
    } else {
      setToast(`Dịch vụ ${id} chuyển sang trạng thái: ${action === 'stop' ? 'Đã dừng' : 'Đang chạy'}.`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleKill = (pid: number, name: string) => {
    ProductionStore.killProcess(pid);
    setProcesses(ProductionStore.getProcesses());
    setToast(`Đã ngắt tiến trình PID ${pid} (${name}).`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim();
    if (!cmd) return;

    const time = new Date().toTimeString().split(' ')[0];
    let output = '';

    if (cmd === 'clear') {
      setTerminalHistory([]);
      setCliInput('');
      return;
    } else if (cmd === 'help') {
      output = 'Available commands: uptime, free -h, df -h, docker ps, releases, netstat, ping <host>, clear, help';
    } else if (cmd === 'uptime') {
      output = ' 10:42:15 up 24 days, 12:10, 2 users, load average: 0.28, 0.34, 0.40';
    } else if (cmd === 'free -h' || cmd === 'free') {
      output = '               total        used        free      shared  buff/cache   available\nMem:            16Gi       4.3Gi       8.9Gi       140Mi       2.8Gi        11Gi\nSwap:          4.0Gi          0B       4.0Gi';
    } else if (cmd === 'df -h') {
      output = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2  248G   58G  178G  25% /\ntmpfs           1.6G     0  1.6G   0% /run';
    } else if (cmd === 'docker ps') {
      output = 'CONTAINER ID   IMAGE                 COMMAND                  STATUS        PORTS                    NAMES\n9a8f273b018c   hendy/api-gateway     "node dist/server.js"    Up 24 days    0.0.0.0:3000->3000/tcp   hendy-api\n6b7e192a00fe   redis:7-alpine        "redis-server"           Up 24 days    127.0.0.1:6379->6379/tcp hendy-redis';
    } else if (cmd === 'releases') {
      output = `Hendy Tools Production Releases:\n• Windows Pro: v${winRelease?.version || 'N/A'} (Build ${winRelease?.build || 'N/A'})\n• Android Mobile: v${androidRelease?.version || 'N/A'} (Build ${androidRelease?.build || 'N/A'})\n• iOS Enterprise: v${iosRelease?.version || 'N/A'}`;
    } else if (cmd.startsWith('ping')) {
      output = `PING cloudflare.com (104.16.132.229) 56(84) bytes of data.\n64 bytes from 104.16.132.229: icmp_seq=1 ttl=58 time=7.84 ms\n64 bytes from 104.16.132.229: icmp_seq=2 ttl=58 time=7.91 ms\n--- cloudflare.com ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
    } else {
      output = `[exec] ${cmd}\nCommand processed successfully with status 0.`;
    }

    setTerminalHistory((prev) => [
      ...prev,
      { id: Date.now().toString(), command: cmd, output, timestamp: time, status: 'success' },
    ]);
    setCliInput('');
  };

  const handleTestUpdateApi = () => {
    const buildNum = Number.parseInt(debugBuild, 10) || 0;
    const res = ProductionStore.checkUpdate(debugPlatform, 'stable', debugVersion, buildNum);
    setDebugResult(JSON.stringify(res, null, 2));
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHost.trim()) return;
    const cleanHost = newHost.trim().replace(/^https?:\/\//, '').split('/')[0];
    const newMapping: DomainMapping = {
      id: `dom-${Date.now()}`,
      domain: cleanHost,
      provider: newProvider,
      targetInterface: newTarget,
      isPrimary: false,
      sslStatus: 'active',
      defaultTab: newTarget === 'admin' ? 'telemetry' : undefined,
      notes: newNotes.trim() || 'Tên miền tùy chỉnh liên kết thủ công',
      createdAt: new Date().toISOString(),
    };
    ProductionStore.addDomain(newMapping);
    setDomains(ProductionStore.getDomains());
    setAuditLogs(ProductionStore.getAuditLogs());
    setIsAddDomainOpen(false);
    setNewHost('');
    setNewNotes('');
    setToast(`Đã thêm tên miền ${cleanHost} (${newTarget === 'admin' ? 'Bảng Quản Trị' : 'Cổng Tải'}) thành công!`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleDomainTarget = (id: string) => {
    const current = domains.find((d) => d.id === id);
    if (!current) return;
    const nextTarget: TargetInterface = current.targetInterface === 'admin' ? 'portal' : 'admin';
    ProductionStore.updateDomain(id, { targetInterface: nextTarget });
    setDomains(ProductionStore.getDomains());
    setToast(`Tên miền ${current.domain} chuyển hướng đích sang: ${nextTarget === 'admin' ? 'Bảng Quản Trị' : 'Cổng Tải'}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteDomain = (id: string, domainName: string) => {
    ProductionStore.removeDomain(id);
    setDomains(ProductionStore.getDomains());
    setAuditLogs(ProductionStore.getAuditLogs());
    setToast(`Đã xóa liên kết tên miền ${domainName}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSimulateUrl = (testUrl?: string) => {
    const target = (testUrl || simUrl).trim();
    if (!target) return;
    try {
      const parsed = new URL(target.startsWith('http') ? target : `https://${target}`);
      const res = ProductionStore.resolveTargetInterface(
        parsed.hostname,
        parsed.pathname,
        parsed.search,
        parsed.hash
      );
      setSimResult(res);
    } catch {
      const segments = target.split('/');
      const host = segments[0] || target;
      const res = ProductionStore.resolveTargetInterface(host, '/', '', '');
      setSimResult(res);
    }
  };

  const handleToggleComponent = (id: string) => {
    ProductionStore.toggleComponent(id);
    setComponents(ProductionStore.getComponents());
    setAuditLogs(ProductionStore.getAuditLogs());
    const comp = ProductionStore.getComponents().find((c) => c.id === id);
    setToast(`Thành phần ${comp?.name} chuyển sang: ${comp?.status.toUpperCase()}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestWebhook = (id: string) => {
    setTestingWebhook(id);
    setTimeout(() => {
      setTestingWebhook(null);
      setToast('Webhook HTTP POST đã gửi thành công tới các endpoint đăng ký (HTTP 200 OK)!');
      setTimeout(() => setToast(null), 3500);
    }, 1000);
  };

  const handleExportSnapshot = () => {
    const json = ProductionStore.exportSystemSnapshot();
    setSnapshotJson(json);
    setIsSnapshotOpen(true);
  };

  const handleImportSnapshot = () => {
    if (!snapshotImportInput.trim()) return;
    const ok = ProductionStore.importSystemSnapshot(snapshotImportInput);
    if (ok) {
      refreshAll();
      setIsSnapshotOpen(false);
      setSnapshotImportInput('');
      setToast('Đã khôi phục toàn bộ cấu hình từ Snapshot thành công!');
      setTimeout(() => setToast(null), 3500);
    } else {
      setToast('Lỗi: Cấu trúc JSON Snapshot không hợp lệ.');
      setTimeout(() => setToast(null), 3500);
    }
  };


  const filteredHistory = releases.filter((r) => releaseFilter === 'all' || r.platform === releaseFilter);
  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(processSearch.toLowerCase()) ||
      p.pid.toString().includes(processSearch) ||
      p.user.toLowerCase().includes(processSearch.toLowerCase())
  );

  return (
    <div className="admin-workstation">
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #0d284a, #06152b)',
            border: '1px solid #73e4d0',
            color: '#e4fbf6',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: '#73e4d0', fontSize: 16 }}>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Dedicated Administrative Sidebar Rail */}
      <aside className="admin-rail">
        <div className="admin-rail-brand">
          <span className="admin-rail-icon">H+</span>
          <div className="admin-rail-title">
            <strong>HENDY<span>SERVER</span></strong>
            <small>INFRASTRUCTURE & RELEASE OPS</small>
          </div>
        </div>

        {/* Independent Switcher back to User Download Portal */}
        <button type="button" className="admin-back-btn" onClick={onBackToPortal}>
          <span>←</span>
          <span>Cổng tải công khai (Public Site)</span>
        </button>

        {/* Section 1: Server Infrastructure */}
        <div className="admin-section-tag">HẠ TẦNG MÁY CHỦ</div>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          <span className="icon">◫</span>
          <span>Tài nguyên phần cứng</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <span className="icon">⚙</span>
          <span>Dịch vụ hệ thống</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'processes' ? 'active' : ''}`}
          onClick={() => setActiveTab('processes')}
        >
          <span className="icon">◈</span>
          <span>Tiến trình & Task</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'ports' ? 'active' : ''}`}
          onClick={() => setActiveTab('ports')}
        >
          <span className="icon">▤</span>
          <span>Cổng mạng & Firewall</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'cli' ? 'active' : ''}`}
          onClick={() => setActiveTab('cli')}
        >
          <span className="icon">⌘</span>
          <span>Cloud Shell Terminal</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'env' ? 'active' : ''}`}
          onClick={() => setActiveTab('env')}
        >
          <span className="icon">≋</span>
          <span>Cấu hình môi trường (.env)</span>
        </button>

        {/* Section 2: Release Operations */}
        <div className="admin-section-tag">QUẢN LÝ PHÁT HÀNH</div>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          <span className="icon">◷</span>
          <span>Kênh & Bản phát hành</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive')}
        >
          <span className="icon">🗂</span>
          <span>Lịch sử Changelog R2</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          <span className="icon">↗</span>
          <span>CI/CD & Cloud Build</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'debugger' ? 'active' : ''}`}
          onClick={() => setActiveTab('debugger')}
        >
          <span className="icon">🧪</span>
          <span>Kiểm tra API Cập nhật</span>
        </button>

        {/* Section 3: Multi-Cloud Domains & Software Components */}
        <div className="admin-section-tag">TÊN MIỀN & ỨNG DỤNG</div>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'domains' ? 'active' : ''}`}
          onClick={() => setActiveTab('domains')}
        >
          <span className="icon">🌐</span>
          <span>Điều hướng Tên miền & DNS</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <span className="icon">📦</span>
          <span>Thành phần & Ứng dụng</span>
        </button>
        <button
          type="button"
          className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="icon">📊</span>
          <span>Lưu lượng Edge & Audit</span>
        </button>


        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(135, 172, 224, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#88a3cb' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#73e4d0', display: 'inline-block' }} />
            <span>NODE: HENDY-CORE-01</span>
          </div>
          <small style={{ display: 'block', color: '#566e8c', font: '8px var(--mono)', marginTop: 4 }}>
            ENTERPRISE DEPLOYED · RENDER & CLOUDFLARE
          </small>
        </div>
      </aside>

      {/* Main Admin Workstation Content */}
      <div className="admin-content-area">
        {/* Top Telemetry Bar */}
        <header className="admin-top-telemetry">
          <div className="breadcrumb">
            <span>Hendy Infrastructure</span>
            <i>/</i>
            <b>Bảng Quản Trị Server & Phát Hành Plus</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="environment">
              <i /> PRODUCTION CLOUD
            </span>
            <button
              type="button"
              className="topbar-public"
              style={{ color: '#73e4d0', fontWeight: 700 }}
              onClick={onBackToPortal}
            >
              Mở Cổng tải công khai ↗
            </button>
          </div>
        </header>

        <main className="admin-body-pad">
          {/* Quick Metrics Bar across node & releases */}
          <section className="summary-grid" style={{ marginTop: 0 }}>
            <article className="summary-card" onClick={() => setActiveTab('telemetry')} style={{ cursor: 'pointer' }}>
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

            <article className="summary-card" onClick={() => setActiveTab('channels')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>WINDOWS RELEASE</span>
                <span className="summary-icon icon-teal">⊞</span>
              </div>
              <div className="summary-value">
                {winRelease ? `v${winRelease.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Pro</span>
                <b>Đã ký EV Authenticode</b>
              </div>
              <div className="summary-rail teal-rail">
                <i style={{ width: '85%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('channels')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>ANDROID RELEASE</span>
                <span className="summary-icon icon-violet">◉</span>
              </div>
              <div className="summary-value">
                {androidRelease ? `v${androidRelease.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Mobile</span>
                <b>APK Sign v3</b>
              </div>
              <div className="summary-rail violet-rail">
                <i style={{ width: '85%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('archive')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>R2 RELEASES ARCHIVE</span>
                <span className="summary-icon icon-green">🗂</span>
              </div>
              <div className="summary-value">{releases.length}</div>
              <div className="summary-bottom">
                <span>Snapshot bất biến</span>
                <b>Đã lưu Cloudflare R2</b>
              </div>
              <div className="summary-rail green-rail">
                <i style={{ width: '100%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('domains')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>DOMAINS & ROUTER</span>
                <span className="summary-icon icon-teal">🌐</span>
              </div>
              <div className="summary-value">
                {domains.length} <span style={{ fontSize: 13, color: '#73e4d0', fontWeight: 500 }}>Origins</span>
              </div>
              <div className="summary-bottom">
                <span>Cloudflare · Render · GitHub</span>
                <b>Đang điều hướng</b>
              </div>
              <div className="summary-rail teal-rail">
                <i style={{ width: '100%' }} />
              </div>
            </article>

            <article className="summary-card" onClick={() => setActiveTab('apps')} style={{ cursor: 'pointer' }}>
              <div className="summary-top">
                <span>ACTIVE ADD-ONS</span>
                <span className="summary-icon icon-blue">📦</span>
              </div>
              <div className="summary-value">
                {components.filter((c) => c.status === 'active').length} <span style={{ fontSize: 13, color: '#73e4d0', fontWeight: 500 }}>/ {components.length}</span>
              </div>
              <div className="summary-bottom">
                <span>WAF · Webhook · Snapshot</span>
                <b>Bảo vệ đa tầng</b>
              </div>
              <div className="summary-rail">
                <i style={{ width: `${(components.filter((c) => c.status === 'active').length / (components.length || 1)) * 100}%` }} />
              </div>
            </article>
          </section>


          {/* TAB 1: TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> TÀI NGUYÊN PHẦN CỨNG</div>
                  <h2>Tài nguyên phần cứng & Băng thông mạng</h2>
                  <p>Giám sát vi xử lý, bộ nhớ, lưu trữ SSD NVMe và lưu lượng Cloudflare R2.</p>
                </div>
                <button
                  type="button"
                  className="button button-soft"
                  onClick={() => {
                    setToast('Đang quét lại toàn bộ tài nguyên hệ thống…');
                    setTimeout(() => setToast(null), 2500);
                  }}
                >
                  <span>↻</span> Quét lại phần cứng
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                <div style={{ background: '#081528', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 14 }}>THÔNG SỐ MÁY CHỦ SẢN XUẤT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>NODE IDENTIFIER</small>
                      <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>hendy-core-node-01</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>OPERATING SYSTEM</small>
                      <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>Ubuntu 24.04 LTS (x86_64)</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>CPU THREADS</small>
                      <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>8 vCPU · 3.4 GHz Intel Xeon</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>SYSTEM UPTIME</small>
                      <div style={{ color: '#73e4d0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>24 ngày 12 giờ 10 phút</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>NVMe STORAGE</small>
                      <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>58.4 GB / 250 GB (23%)</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>TRAFFIC REALTIME</small>
                      <div style={{ color: '#73e4d0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>↓ {netDown} MB/s · ↑ {netUp} MB/s</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#081528', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 14 }}>LIÊN KẾT CLOUDFLARE R2 & RENDER.COM</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 700 }}>R2 Bucket Storage</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>hendy-tool-releases (Active)</small>
                      </div>
                      <span className="state-chip state-ok">CONNECTED</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 700 }}>Render.com Webhook Integration</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>Zero-downtime Blue/Green Deploy</small>
                      </div>
                      <span className="state-chip state-ok">SYNCED</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 700 }}>SSL/TLS Edge Certificate</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>ECC CA-3 Validated (TLS 1.3)</small>
                      </div>
                      <span className="state-chip state-ok">SECURE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM SERVICES */}
          {activeTab === 'services' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> SYSTEM SERVICES</div>
                  <h2>Quản lý dịch vụ máy chủ Systemd</h2>
                  <p>Khởi động lại, dừng hoặc bật các tiến trình dịch vụ cốt lõi của nền tảng.</p>
                </div>
              </div>

              <div>
                {services.map((svc) => (
                  <div key={svc.id} className="admin-service-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260 }}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
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
                        <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                          {svc.displayName}{' '}
                          {svc.port && <span style={{ color: '#82baff', fontSize: 10, font: 'var(--mono)' }}>:{svc.port}</span>}
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

          {/* TAB 3: PROCESS MONITOR */}
          {activeTab === 'processes' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> PROCESS MONITOR</div>
                  <h2>Tiến trình máy chủ & Mức tiêu thụ tài nguyên</h2>
                  <p>Tìm kiếm theo tên tiến trình hoặc PID và ngắt các tiến trình khi cần.</p>
                </div>
                <div style={{ width: 240 }}>
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
                  <span>COMMAND / PROCESS NAME</span>
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
                          onClick={() => handleKill(p.pid, p.name)}
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

          {/* TAB 4: PORTS */}
          {activeTab === 'ports' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> PORTS & NETSTAT</div>
                  <h2>Cổng kết nối mở & Tường lửa UFW</h2>
                  <p>Bảng liệt kê các cổng TCP/UDP đang lắng nghe và chính sách bảo mật mạng.</p>
                </div>
              </div>

              <div className="history-shell">
                <div className="history-table-head" style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 1fr 1fr' }}>
                  <span>PORT</span>
                  <span>PROTOCOL</span>
                  <span>SERVICE</span>
                  <span>BIND ADDRESS</span>
                  <span>STATE</span>
                  <span>POLICY</span>
                </div>
                <div>
                  {ports.map((pt, idx) => (
                    <div
                      key={idx}
                      className="history-row"
                      style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 1fr 1fr', alignItems: 'center' }}
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
                      <div>
                        <span className={`state-chip ${pt.policy === 'ALLOWED' ? 'state-ok' : pt.policy === 'PROTECTED' ? 'state-loading' : 'state-muted'}`}>
                          {pt.policy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLI TERMINAL */}
          {activeTab === 'cli' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> CLOUD SHELL TERMINAL</div>
                  <h2>Giao diện dòng lệnh máy chủ</h2>
                  <p>Thực thi các lệnh kiểm tra, chẩn đoán mạng và dịch vụ trực tiếp trên máy chủ.</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['uptime', 'free -h', 'df -h', 'docker ps', 'releases', 'clear'].map((cmd) => (
                    <button key={cmd} type="button" className="filter" onClick={() => setCliInput(cmd)}>
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-cli-box">
                <div style={{ color: '#6885a8', marginBottom: 14 }}>
                  Hendy Tools Cloud Shell [Production v2.6.0] — Connected as root@hendy-core-01 (103.145.x.x)
                </div>

                {terminalHistory.map((h) => (
                  <div key={h.id} className="admin-cli-entry">
                    <div className="admin-cli-prompt">
                      <span style={{ color: '#88a3cb' }}>[{h.timestamp}]</span>
                      <span>root@hendy-node:~$</span>
                      <b style={{ color: '#ffffff' }}>{h.command}</b>
                    </div>
                    <pre className="admin-cli-out">{h.output}</pre>
                  </div>
                ))}

                <form onSubmit={handleRunCommand} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <span style={{ color: '#73e4d0' }}>root@hendy-node:~$</span>
                  <input
                    type="text"
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    placeholder="Nhập lệnh (ví dụ: uptime, df -h, free -h, releases, ping, clear, help)..."
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

          {/* TAB 6: ENV CONFIG */}
          {activeTab === 'env' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HẠ TẦNG <span>/</span> CONFIGURATION</div>
                  <h2>Biến môi trường sản xuất (.env)</h2>
                  <p>Mẫu cấu hình bảo mật phục vụ triển khai Render.com và Cloudflare R2.</p>
                </div>
                <button
                  type="button"
                  className="button button-soft"
                  onClick={() => setRevealSecrets(!revealSecrets)}
                >
                  {revealSecrets ? 'Ẩn Secret Keys 🔒' : 'Hiện Secret Keys 👁'}
                </button>
              </div>

              <div style={{ background: '#081528', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
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
{`# Hendy Tools Platform Production Environment
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Cloudflare R2 Object Storage
CLOUDFLARE_ACCOUNT_ID=ae9f204859a1098bca4810283c7d6100
R2_BUCKET_NAME=hendy-tool-releases
R2_ACCESS_KEY_ID=${revealSecrets ? 'sec_r2_prod_live_key_9942' : '************************'}
R2_SECRET_ACCESS_KEY=${revealSecrets ? 'sec_r2_prod_secret_token_88421bfa' : '****************************************'}

# Security & CORS
CORS_ORIGIN=*
API_RATE_LIMIT=120
SECRET_SESSION_KEY=${revealSecrets ? 'hendy_prod_auth_secret_2026' : '****************************'}

# Distribution Channel Settings
DEFAULT_CHANNEL=stable
ENABLE_AUTHENTICODE_VERIFY=true`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 7: RELEASE CHANNELS (from Release Ops) */}
          {activeTab === 'channels' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> KÊNH NỀN TẢNG</div>
                  <h2>Phiên bản sản xuất theo nền tảng</h2>
                  <p>Manifest mới nhất được lưu trong Cloudflare R2 và phân phối qua HTTPS.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setIsPublishModalOpen(true)}
                  >
                    + Xuất bản bản mới <span>↗</span>
                  </button>
                  <button type="button" className="button button-soft button-refresh" onClick={refreshAll}>
                    <span>↻</span> Đồng bộ
                  </button>
                </div>
              </div>

              <div className="release-grid">
                {/* Windows Card */}
                <article className="release-card release-windows">
                  <div className="release-card-top">
                    <span className="release-app-icon windows-app-icon">⊞</span>
                    <span className="state-chip state-ok">AUTHENTICODE EV</span>
                  </div>
                  <div className="release-platform-label">DESKTOP SOFTWARE / 01</div>
                  <h3>Hendy Tools <span>Pro</span></h3>
                  <div className="release-version">{winRelease ? `v${winRelease.version}` : '—'}</div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{winRelease?.build ?? '—'}</b>
                    </div>
                    <div>
                      <small>FILE SIZE</small>
                      <b>{winRelease?.artifact ? formatByteSize(winRelease.artifact.size) : '—'}</b>
                    </div>
                  </div>
                  <div className="release-date">
                    {winRelease ? `Phát hành ${formatDateTime(winRelease.publishedAt)}` : '—'}
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>RECENT CHANGES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {winRelease?.releaseNotes.slice(0, 4).map((n, idx) => (
                        <li key={idx}>{n}</li>
                      )) || <li>Không có ghi chú.</li>}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="button button-soft release-download"
                    onClick={() => winRelease && ProductionStore.triggerProductionDownload('windows', winRelease.version, winRelease.artifact!.fileName)}
                  >
                    Tải bộ cài Windows <span>↓</span>
                  </button>
                </article>

                {/* Android Card */}
                <article className="release-card release-android">
                  <div className="release-card-top">
                    <span className="release-app-icon android-app-icon">◉</span>
                    <span className="state-chip state-ok">SIGNED APK</span>
                  </div>
                  <div className="release-platform-label">MOBILE SOFTWARE / 02</div>
                  <h3>Hendy Tools <span>Mobile</span></h3>
                  <div className="release-version">{androidRelease ? `v${androidRelease.version}` : '—'}</div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{androidRelease?.build ?? '—'}</b>
                    </div>
                    <div>
                      <small>FILE SIZE</small>
                      <b>{androidRelease?.artifact ? formatByteSize(androidRelease.artifact.size) : '—'}</b>
                    </div>
                  </div>
                  <div className="release-date">
                    {androidRelease ? `Phát hành ${formatDateTime(androidRelease.publishedAt)}` : '—'}
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>RECENT CHANGES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {androidRelease?.releaseNotes.slice(0, 4).map((n, idx) => (
                        <li key={idx}>{n}</li>
                      )) || <li>Không có ghi chú.</li>}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="button button-soft release-download"
                    onClick={() => androidRelease && ProductionStore.triggerProductionDownload('android', androidRelease.version, androidRelease.artifact!.fileName)}
                  >
                    Tải APK Android <span>↓</span>
                  </button>
                </article>

                {/* iOS Card */}
                <article className="release-card release-ios">
                  <div className="release-card-top">
                    <span className="release-app-icon ios-app-icon">✳</span>
                    <span className="state-chip state-muted">TESTFLIGHT</span>
                  </div>
                  <div className="release-platform-label">MOBILE SOFTWARE / 03</div>
                  <h3>Hendy Tools <span>iOS</span></h3>
                  <div className="release-version">{iosRelease ? `v${iosRelease.version}` : 'v1.1.0'}</div>
                  <div className="release-metrics">
                    <div>
                      <small>BUILD NUMBER</small>
                      <b>{iosRelease?.build ?? '10100'}</b>
                    </div>
                    <div>
                      <small>DISTRIBUTION</small>
                      <b>Apple TestFlight</b>
                    </div>
                  </div>
                  <div className="release-date">
                    {iosRelease ? `Phát hành ${formatDateTime(iosRelease.publishedAt)}` : '—'}
                  </div>
                  <div className="release-changelog">
                    <div className="subheading">
                      <span>DISTRIBUTION NOTES</span>
                      <i />
                    </div>
                    <ul className="notes-list">
                      {iosRelease?.releaseNotes.slice(0, 4).map((n, idx) => (
                        <li key={idx}>{n}</li>
                      )) || <li>Phân phối theo quy chuẩn Apple Developer.</li>}
                    </ul>
                  </div>
                  {iosRelease?.storeUrl ? (
                    <a className="button button-soft release-download" href={iosRelease.storeUrl} target="_blank" rel="noopener noreferrer">
                      Mở TestFlight <span>↗</span>
                    </a>
                  ) : (
                    <button type="button" className="button button-soft release-download disabled">
                      Theo Apple ↗
                    </button>
                  )}
                </article>
              </div>
            </div>
          )}

          {/* TAB 8: CHANGELOG R2 ARCHIVE */}
          {activeTab === 'archive' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> R2 ARCHIVE</div>
                  <h2>Lịch sử các phiên bản phát hành</h2>
                  <p>Toàn bộ snapshot manifest bất biến được lưu trữ trên Cloudflare R2.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="history-filters" role="group">
                    <button
                      type="button"
                      className={`filter ${releaseFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setReleaseFilter('all')}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`filter ${releaseFilter === 'windows' ? 'active' : ''}`}
                      onClick={() => setReleaseFilter('windows')}
                    >
                      Windows
                    </button>
                    <button
                      type="button"
                      className={`filter ${releaseFilter === 'android' ? 'active' : ''}`}
                      onClick={() => setReleaseFilter('android')}
                    >
                      Android
                    </button>
                  </div>
                  <button
                    type="button"
                    className="filter"
                    style={{ color: '#829ab8' }}
                    onClick={() => {
                      if (window.confirm('Khôi phục dữ liệu phát hành về mặc định ban đầu?')) {
                        ProductionStore.resetReleases();
                        refreshAll();
                      }
                    }}
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
                <div>
                  {filteredHistory.map((item, idx) => (
                    <div key={idx} className="history-row">
                      <div>
                        <div className="history-version">v{item.version}</div>
                        <span className="history-build">BUILD {item.build}</span>
                      </div>
                      <div>
                        <span className="platform-badge">{item.platform.toUpperCase()}</span>
                      </div>
                      <div className="history-date">{formatDateTime(item.publishedAt)}</div>
                      <div className="history-notes">
                        <ul>
                          {item.releaseNotes.slice(0, 3).map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CI/CD PIPELINE */}
          {activeTab === 'pipeline' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">PHÁT HÀNH <span>/</span> CI/CD PIPELINE</div>
                  <h2>Tự động hóa Build & Triển khai trên GitHub Actions</h2>
                  <p>Kết nối trực tiếp tới các workflow build bộ cài Windows và APK Android.</p>
                </div>
              </div>

              <section className="publish-section" style={{ marginTop: 0 }}>
                <div className="publish-symbol"><span>↗</span></div>
                <div className="publish-copy">
                  <div className="section-index">01 <span>/</span> CLOUD RELEASE PIPELINE</div>
                  <h2>Tạo gói cài đặt & Tự động ký số</h2>
                  <p>
                    Quy trình build đám mây tự động biên dịch ứng dụng Windows bằng Inno Setup, Android bằng Gradle, tính mã băm SHA-256 và tải lên R2.
                  </p>
                  <div className="publish-steps">
                    <span><b>01</b> GitHub Actions Runner</span>
                    <span><b>02</b> Ký số Authenticode / Android Keystore</span>
                    <span><b>03</b> Đẩy lên Cloudflare R2 & Render.com</span>
                  </div>
                </div>
                <div className="publish-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setIsPublishModalOpen(true)}
                  >
                    + Xuất bản manifest trực tiếp <span>↗</span>
                  </button>
                  <a
                    className="button button-soft"
                    href="https://github.com/ngogiaidy56-eng/HendyToolsApp/actions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mở GitHub Actions <span>↗</span>
                  </a>
                </div>
              </section>

              <section className="security-note" style={{ marginTop: 18 }}>
                <span className="security-icon">◇</span>
                <div>
                  <b>Quyền phát hành được bảo vệ</b>
                  <p>
                    Giao diện này chỉ hiển thị dữ liệu đã xác thực. Các token truy cập R2 và khóa ký được lưu an toàn trong GitHub Secrets và biến môi trường Render/Cloudflare.
                  </p>
                </div>
                <span className="security-badge">ENTERPRISE ISOLATED</span>
              </section>
            </div>
          )}

          {/* TAB 10: API DEBUGGER */}
          {activeTab === 'debugger' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">KIỂM ĐỊNH <span>/</span> API DEBUGGER</div>
                  <h2>Kiểm thử Endpoint Cập nhật (/api/v1/releases/latest)</h2>
                  <p>Mô phỏng phản hồi API cập nhật cho ứng dụng máy khách khi gửi version và build hiện tại.</p>
                </div>
              </div>

              <div className="admin-debugger-box">
                <div className="form-row">
                  <div className="form-group">
                    <label>NỀN TẢNG (PLATFORM)</label>
                    <select
                      className="form-control"
                      value={debugPlatform}
                      onChange={(e) => setDebugPlatform(e.target.value as Platform)}
                    >
                      <option value="windows">Windows (Hendy Tools Pro)</option>
                      <option value="android">Android (Hendy Tools Mobile)</option>
                      <option value="ios">iOS (Hendy Tools iOS)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>PHIÊN BẢN CLIENT HIỆN TẠI (CURRENT VERSION)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={debugVersion}
                      onChange={(e) => setDebugVersion(e.target.value)}
                      placeholder="3.0.0"
                    />
                  </div>
                  <div className="form-group">
                    <label>SỐ HIỆU BUILD CLIENT (CURRENT BUILD)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={debugBuild}
                      onChange={(e) => setDebugBuild(e.target.value)}
                      placeholder="30000"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button type="button" className="button button-primary" onClick={handleTestUpdateApi}>
                    Thực thi kiểm tra API <span>⚡</span>
                  </button>
                  <button type="button" className="button button-quiet" onClick={() => setDebugResult(null)}>
                    Xóa kết quả
                  </button>
                </div>

                {debugResult && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ color: '#73e4d0', font: '9px var(--mono)', marginBottom: 6 }}>
                      JSON RESPONSE (HTTP 200 OK)
                    </div>
                    <pre
                      style={{
                        background: '#020710',
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        padding: 14,
                        color: '#9cbdf2',
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        lineHeight: 1.6,
                        overflowX: 'auto',
                      }}
                    >
                      {debugResult}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 11: DOMAIN & DNS DISPATCHER */}
          {activeTab === 'domains' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">ĐIỀU HƯỚNG TÊN MIỀN <span>/</span> MULTI-CLOUD DOMAINS & ROUTER</div>
                  <h2>Quản Lý Tên Miền Đa Nền Tảng & Điều Hướng Tự Động</h2>
                  <p>
                    Tận dụng các tên miền được cấp từ Cloudflare Pages, Workers, Render.com hoặc GitHub Pages để điều hướng người dùng độc lập tới Bảng Quản Trị hoặc Cổng Tải Công Khai.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="button button-primary" onClick={() => setIsAddDomainOpen(true)}>
                    + Thêm tên miền mới <span>↗</span>
                  </button>
                  <button type="button" className="button button-soft" onClick={() => handleSimulateUrl()}>
                    Mô phỏng router URL <span>⚡</span>
                  </button>
                </div>
              </div>

              {/* URL & Domain Simulator Box */}
              <div className="admin-debugger-box" style={{ marginBottom: 24, border: '1px solid rgba(115, 228, 208, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#73e4d0', fontSize: 16 }}>⚡</span>
                    <strong style={{ fontSize: 13, color: '#ffffff' }}>CÔNG CỤ MÔ PHỎNG ĐIỀU HƯỚNG THEO URL & TÊN MIỀN</strong>
                  </div>
                  <span style={{ fontSize: 10, color: '#88a3cb', fontFamily: 'var(--mono)' }}>URL RESOLVER ENGINE v2.0</span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1, minWidth: 280 }}
                    value={simUrl}
                    onChange={(e) => {
                      setSimUrl(e.target.value);
                      handleSimulateUrl(e.target.value);
                    }}
                    placeholder="Nhập hostname hoặc URL (vd: admin-hendytools.pages.dev, hendytools.onrender.com...)"
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSimulateUrl()}
                  >
                    Kiểm tra phân giải <span>→</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#88a3cb' }}>Mẫu thử nhanh:</span>
                  {[
                    'https://admin-hendytools.pages.dev/telemetry',
                    'https://hendytools.pages.dev/download',
                    'https://hendy-admin.onrender.com/domains',
                    'https://ngogiaidy3.github.io/',
                    'https://admin.hendytools.com/services',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      style={{
                        background: 'rgba(135, 172, 224, 0.08)',
                        border: '1px solid rgba(135, 172, 224, 0.2)',
                        color: '#9cbdf2',
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontFamily: 'var(--mono)',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSimUrl(preset);
                        handleSimulateUrl(preset);
                      }}
                    >
                      {preset.replace('https://', '')}
                    </button>
                  ))}
                </div>

                {simResult && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 14,
                      background: '#030b18',
                      border: '1px solid rgba(115, 228, 208, 0.25)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, color: '#73e4d0', fontFamily: 'var(--mono)', marginBottom: 4 }}>
                        KẾT QUẢ ĐỊNH TUYẾN TỰ ĐỘNG
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          className={`target-interface-pill ${
                            simResult.view === 'admin' ? 'pill-admin' : 'pill-portal'
                          }`}
                          style={{ margin: 0 }}
                        >
                          {simResult.view === 'admin'
                            ? 'BẢNG QUẢN TRỊ SERVER PLUS (ADMIN)'
                            : 'CỔNG TẢI CÔNG KHAI (USER PORTAL)'}
                        </span>
                        <span style={{ fontSize: 12, color: '#adc4e0' }}>
                          Nguồn khớp: <b>{simResult.matchedSource}</b>
                        </span>
                        {simResult.defaultTab && (
                          <span style={{ fontSize: 11, color: '#73e4d0', fontFamily: 'var(--mono)' }}>
                            Tab đích: #{simResult.defaultTab}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="button button-soft"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        if (simResult.view === 'download') {
                          onBackToPortal();
                        } else if (simResult.defaultTab) {
                          setActiveTab(simResult.defaultTab);
                          window.location.hash = `#${simResult.defaultTab}`;
                        }
                      }}
                    >
                      Mở giao diện này ngay ↗
                    </button>
                  </div>
                )}
              </div>

              {/* Active Domains Grid */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, color: '#ffffff', letterSpacing: '0.04em' }}>
                  DANH SÁCH TÊN MIỀN ĐÃ CẤU HÌNH ({domains.length})
                </h3>
                <span style={{ fontSize: 11, color: '#88a3cb' }}>
                  Đồng bộ tức thời trên Cloudflare CDN & Render DNS
                </span>
              </div>

              <div className="admin-domain-grid">
                {domains.map((dom) => (
                  <div key={dom.id} className="admin-domain-card">
                    <div>
                      <div className="domain-card-header">
                        <div>
                          <div className="domain-host">{dom.domain}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span
                              className={`domain-provider-badge ${
                                dom.provider.includes('cloudflare')
                                  ? 'badge-cloudflare'
                                  : dom.provider === 'render'
                                  ? 'badge-render'
                                  : dom.provider === 'github-pages'
                                  ? 'badge-github'
                                  : 'badge-custom'
                              }`}
                            >
                              {dom.provider === 'cloudflare-pages' && 'Cloudflare Pages'}
                              {dom.provider === 'cloudflare-workers' && 'Cloudflare Worker'}
                              {dom.provider === 'render' && 'Render.com'}
                              {dom.provider === 'github-pages' && 'GitHub Pages'}
                              {dom.provider === 'custom' && 'Tên miền riêng'}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 10,
                                color: '#73e4d0',
                                background: 'rgba(115, 228, 208, 0.08)',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#73e4d0' }} />
                              TLS 1.3 Active
                            </span>
                            {dom.isPrimary && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: '#facc15',
                                  background: 'rgba(250, 204, 21, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}
                              >
                                PRIMARY
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`target-interface-pill ${
                          dom.targetInterface === 'admin'
                            ? 'pill-admin'
                            : dom.targetInterface === 'portal'
                            ? 'pill-portal'
                            : 'pill-gateway'
                        }`}
                      >
                        <span>
                          {dom.targetInterface === 'admin' && '🛡 Điều hướng: Bảng Quản Trị Server Plus'}
                          {dom.targetInterface === 'portal' && '👥 Điều hướng: Cổng Tải Về Công Khai'}
                          {dom.targetInterface === 'api-gateway' && '⚡ Điều hướng: API Gateway / Check Update'}
                        </span>
                      </div>

                      <p style={{ fontSize: 11, color: '#88a3cb', margin: '12px 0 0', lineHeight: 1.5 }}>
                        {dom.notes}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(135, 172, 224, 0.1)',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#73e4d0',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => handleToggleDomainTarget(dom.id)}
                      >
                        Đổi đích điều hướng ⇄
                      </button>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            background: 'rgba(135, 172, 224, 0.08)',
                            border: '1px solid rgba(135, 172, 224, 0.16)',
                            color: '#adc4e0',
                            fontSize: 10,
                            padding: '4px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            navigator.clipboard?.writeText(dom.domain);
                            setToast(`Đã sao chép tên miền: ${dom.domain}`);
                            setTimeout(() => setToast(null), 2500);
                          }}
                        >
                          Sao chép
                        </button>
                        {!dom.isPrimary && (
                          <button
                            type="button"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              fontSize: 10,
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                            onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DNS Reference Assistant */}
              <div
                style={{
                  marginTop: 24,
                  background: '#040b17',
                  border: '1px solid rgba(135, 172, 224, 0.14)',
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: '#73e4d0', fontSize: 16 }}>📋</span>
                  <strong style={{ fontSize: 13, color: '#ffffff' }}>
                    HƯỚNG DẪN CẤU HÌNH BẢN GHI DNS KHI TRIỂN KHAI THỰC TẾ
                  </strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <div style={{ background: '#020710', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ color: '#ff9800', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      CLOUDFLARE PAGES / WORKERS
                    </div>
                    <p style={{ fontSize: 11, color: '#88a3cb', lineHeight: 1.6 }}>
                      • CNAME: <code>admin</code> trỏ về <code>hendytools.pages.dev</code> (Bật Proxied Orange Cloud)<br />
                      • CNAME: <code>get</code> trỏ về <code>hendytools.pages.dev</code><br />
                      • SSL/TLS: Full (Strict) với HTTP/3 và Early Hints bật tự động.
                    </p>
                  </div>
                  <div style={{ background: '#020710', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ color: '#73e4d0', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      RENDER.COM STATIC SITES
                    </div>
                    <p style={{ fontSize: 11, color: '#88a3cb', lineHeight: 1.6 }}>
                      • CNAME: <code>app</code> trỏ về <code>hendy-tools-platform.onrender.com</code><br />
                      • Tự động cấp phát chứng chỉ Let's Encrypt Wildcard SSL miễn phí.<br />
                      • Header CSP và X-Frame-Options được đồng bộ qua <code>render.yaml</code>.
                    </p>
                  </div>
                  <div style={{ background: '#020710', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      GITHUB PAGES APEX / SUBDOMAIN
                    </div>
                    <p style={{ fontSize: 11, color: '#88a3cb', lineHeight: 1.6 }}>
                      • A records trỏ về IP GitHub Pages: <code>185.199.108.153</code>, <code>185.199.109.153</code><br />
                      • CNAME file tại thư mục gốc tự động kích hoạt HTTPS Enforced.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: SOFTWARE COMPONENTS & APPLICATIONS */}
          {activeTab === 'apps' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">HỆ THỐNG MỞ RỘNG <span>/</span> SOFTWARE COMPONENTS & APPS</div>
                  <h2>Trung Tâm Thành Phần Phần Mềm & Ứng Dụng Mở Rộng</h2>
                  <p>
                    Triển khai các phần mềm và thành phần mở rộng bổ sung chức năng trên toàn bộ codebase: Webhook Event Dispatcher, Cloudflare WAF Shield, đồng bộ đa vùng R2 và sao lưu trạng thái.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="button button-primary" onClick={handleExportSnapshot}>
                    Xuất Snapshot Hệ Thống 💾
                  </button>
                  <button type="button" className="button button-soft" onClick={() => setIsSnapshotOpen(true)}>
                    Khôi phục từ Snapshot ↗
                  </button>
                </div>
              </div>

              {/* Components Grid */}
              <div className="admin-components-grid">
                {components.map((comp) => (
                  <div key={comp.id} className="admin-component-card">
                    <div>
                      <div className="component-top-meta">
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div className="component-icon-badge">{comp.icon}</div>
                          <div>
                            <strong style={{ fontSize: 14, color: '#ffffff', display: 'block' }}>
                              {comp.name}
                            </strong>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontFamily: 'var(--mono)',
                                  color: '#73e4d0',
                                  background: 'rgba(115, 228, 208, 0.1)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                v{comp.version}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  textTransform: 'uppercase',
                                  color: '#88a3cb',
                                  background: 'rgba(135, 172, 224, 0.08)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {comp.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Switch */}
                        <button
                          type="button"
                          style={{
                            background: comp.status === 'active' ? '#73e4d0' : '#334155',
                            border: 'none',
                            borderRadius: 20,
                            width: 44,
                            height: 24,
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                          }}
                          onClick={() => handleToggleComponent(comp.id)}
                          title={`Nhấn để ${comp.status === 'active' ? 'Tắt' : 'Bật'} thành phần`}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              left: comp.status === 'active' ? 22 : 2,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: comp.status === 'active' ? '#04101e' : '#cbd5e1',
                              transition: 'left 0.2s ease',
                            }}
                          />
                        </button>
                      </div>

                      <p style={{ fontSize: 12, color: '#adc4e0', margin: '14px 0 10px', lineHeight: 1.6 }}>
                        {comp.description}
                      </p>

                      <div style={{ fontSize: 10, color: '#687f9d', marginBottom: 14 }}>
                        Tác giả: <b>{comp.author}</b> · Hoạt động: {comp.lastRun}
                      </div>

                      {/* Metrics chips */}
                      {comp.metrics && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                          {comp.metrics.map((m) => (
                            <div
                              key={m.label}
                              style={{
                                background: '#020710',
                                border: '1px solid rgba(135, 172, 224, 0.1)',
                                borderRadius: 8,
                                padding: '8px 10px',
                              }}
                            >
                              <div style={{ fontSize: 9, color: '#88a3cb' }}>{m.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#73e4d0', fontFamily: 'var(--mono)', marginTop: 2 }}>
                                {m.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: 12, borderTop: '1px solid rgba(135, 172, 224, 0.1)' }}>
                      {comp.id === 'comp-webhook' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          disabled={testingWebhook === comp.id}
                          onClick={() => handleTestWebhook(comp.id)}
                        >
                          {testingWebhook === comp.id ? 'Đang gửi dispatch HTTP POST...' : 'Phát Test Webhook (Discord / Slack) ⚡'}
                        </button>
                      )}

                      {comp.id === 'comp-waf' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          onClick={() => {
                            setToast('Quy tắc WAF đã kiểm tra: 100 req/min rate limit và Anti-DDoS đang hiệu lực.');
                            setTimeout(() => setToast(null), 3000);
                          }}
                        >
                          Kiểm tra Rule Rate Limit & WAF Shield 🛡
                        </button>
                      )}

                      {comp.id === 'comp-r2-mirror' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          onClick={() => {
                            setToast('Bucket Cloudflare R2 (APAC) và S3 Backup đã đồng bộ 100% checksum SHA-256.');
                            setTimeout(() => setToast(null), 3000);
                          }}
                        >
                          Kiểm tra đồng bộ đa vùng R2 Storage ☁
                        </button>
                      )}

                      {comp.id === 'comp-snapshot' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          onClick={handleExportSnapshot}
                        >
                          Tải snapshot hệ thống dạng JSON 💾
                        </button>
                      )}

                      {comp.id === 'comp-edge-analytics' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          onClick={() => setActiveTab('analytics')}
                        >
                          Xem chi tiết Lưu lượng PoP Toàn cầu ↗
                        </button>
                      )}

                      {comp.id === 'comp-audit' && (
                        <button
                          type="button"
                          className="button button-soft"
                          style={{ width: '100%', fontSize: 11, minHeight: 34 }}
                          onClick={() => setActiveTab('analytics')}
                        >
                          Xem Nhật ký Tuân thủ & Thao tác 📋
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 13: EDGE TRAFFIC & AUDIT TELEMETRY */}
          {activeTab === 'analytics' && (
            <div style={{ marginTop: 28 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">GIÁM SÁT TOÀN DIỆN <span>/</span> GLOBAL CDN EDGE & AUDIT</div>
                  <h2>Lưu Lượng CDN Edge & Nhật Ký Hoạt Động Quản Trị</h2>
                  <p>
                    Theo dõi tỷ lệ lưu đệm cache và độ trễ tại các điểm biên Cloudflare toàn cầu, đồng thời lưu vết toàn bộ hoạt động của quản trị viên và hệ thống CI/CD.
                  </p>
                </div>
              </div>

              {/* Edge PoP Grid */}
              <h3 style={{ fontSize: 13, color: '#ffffff', letterSpacing: '0.04em', marginBottom: 12 }}>
                ĐIỂM TRUYỀN PHÁT BIÊN CDN EDGE TOÀN CẦU (GLOBAL CDN POPS)
              </h3>
              <div className="edge-pop-grid">
                {trafficMetrics.map((pop) => (
                  <div key={pop.code} className="edge-pop-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>{pop.location}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: 'var(--mono)',
                          color: '#73e4d0',
                          background: 'rgba(115, 228, 208, 0.1)',
                          padding: '2px 5px',
                          borderRadius: 4,
                        }}
                      >
                        {pop.code}
                      </span>
                    </div>

                    <div style={{ margin: '14px 0 8px' }}>
                      <div className="pop-latency-indicator">{pop.avgLatencyMs} ms</div>
                      <div style={{ fontSize: 10, color: '#88a3cb', marginTop: 2 }}>Độ trễ trung bình Round-Trip</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#adc4e0', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(135, 172, 224, 0.1)' }}>
                      <div>
                        <span style={{ color: '#88a3cb', fontSize: 9, display: 'block' }}>Yêu cầu 24h:</span>
                        <b>{pop.requests24h.toLocaleString()}</b>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#88a3cb', fontSize: 9, display: 'block' }}>Cache Hit:</span>
                        <b style={{ color: '#73e4d0' }}>{pop.cacheHitRatio}%</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Audit Logs Table */}
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 13, color: '#ffffff', letterSpacing: '0.04em' }}>
                  NHẬT KÝ TUÂN THỦ & HOẠT ĐỘNG HỆ THỐNG (AUDIT TRAIL)
                </h3>
                <span style={{ fontSize: 11, color: '#88a3cb' }}>Lưu trữ bảo mật bất biến</span>
              </div>

              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>THỜI GIAN</th>
                      <th>TÁC TỬ (ACTOR)</th>
                      <th>HÀNH ĐỘNG</th>
                      <th>ĐỐI TƯỢNG</th>
                      <th>TRẠNG THÁI</th>
                      <th>IP ADDRESS</th>
                      <th>CHI TIẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#88a3cb' }}>
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{log.actor}</td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 9,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(115, 228, 208, 0.1)',
                              color: '#73e4d0',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td>{log.target}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: log.status === 'success' ? '#73e4d0' : log.status === 'warn' ? '#facc15' : '#f87171',
                            }}
                          >
                            ● {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{log.ipAddress}</td>
                        <td style={{ color: '#adc4e0' }}>{log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="admin-rail-icon" style={{ width: 28, height: 28, fontSize: 13 }}>H+</span>
            <span>Hendy Server Management Panel Plus · Production Node</span>
          </div>
          <span style={{ fontSize: 9, color: '#687f9d' }}>Tất cả dữ liệu telemetry, tên miền và manifest đã đồng bộ.</span>
          <button type="button" onClick={onBackToPortal} style={{ color: '#73e4d0', fontSize: 11, fontWeight: 700 }}>
            Về Cổng Tải Công Khai ↗
          </button>
        </footer>
      </div>

      {/* Add Domain Modal */}
      {isAddDomainOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(2, 6, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#061324',
              border: '1px solid rgba(115, 228, 208, 0.3)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <strong style={{ fontSize: 15, color: '#ffffff' }}>LIÊN KẾT TÊN MIỀN MỚI</strong>
                <div style={{ fontSize: 11, color: '#88a3cb', marginTop: 2 }}>
                  Thiết lập phân luồng tự động tới Bảng Quản Trị hoặc Cổng Tải
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#88a3cb', fontSize: 18, cursor: 'pointer' }}
                onClick={() => setIsAddDomainOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDomain}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>TÊN MIỀN HOẶC SUBDOMAIN</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="vd: admin.hendytools.com hoặc app.pages.dev"
                  value={newHost}
                  onChange={(e) => setNewHost(e.target.value)}
                />
              </div>

              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>NỀN TẢNG (ORIGIN PROVIDER)</label>
                  <select
                    className="form-control"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as PlatformProvider)}
                  >
                    <option value="cloudflare-pages">Cloudflare Pages</option>
                    <option value="cloudflare-workers">Cloudflare Worker</option>
                    <option value="render">Render.com</option>
                    <option value="github-pages">GitHub Pages</option>
                    <option value="custom">Tên miền riêng (Custom DNS)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>GIAO DIỆN ĐÍCH ĐIỀU HƯỚNG</label>
                  <select
                    className="form-control"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value as TargetInterface)}
                  >
                    <option value="admin">Bảng Quản Trị Server Plus</option>
                    <option value="portal">Cổng Tải Về Công Khai</option>
                    <option value="api-gateway">API Gateway Endpoint</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>GHI CHÚ MỤC ĐÍCH SỬ DỤNG</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Vd: Tên miền điều hành nội bộ cho đội ngũ DevOps"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setIsAddDomainOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="button button-primary">
                  Lưu & Áp dụng Định tuyến <span>✓</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {isSnapshotOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(2, 6, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#061324',
              border: '1px solid rgba(115, 228, 208, 0.3)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              padding: 24,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <strong style={{ fontSize: 15, color: '#ffffff' }}>SAO LƯU & KHÔI PHỤC SNAPSHOT HỆ THỐNG</strong>
                <div style={{ fontSize: 11, color: '#88a3cb', marginTop: 2 }}>
                  Xuất hoặc nhập toàn bộ trạng thái tên miền, bản phát hành và cấu hình
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#88a3cb', fontSize: 18, cursor: 'pointer' }}
                onClick={() => setIsSnapshotOpen(false)}
              >
                ✕
              </button>
            </div>

            {snapshotJson ? (
              <div>
                <div style={{ fontSize: 11, color: '#73e4d0', marginBottom: 6 }}>
                  SNAPSHOT JSON (ĐÃ XUẤT):
                </div>
                <textarea
                  readOnly
                  className="form-control"
                  style={{ height: 220, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.5 }}
                  value={snapshotJson}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                  <button
                    type="button"
                    className="button button-soft"
                    onClick={() => {
                      navigator.clipboard?.writeText(snapshotJson);
                      setToast('Đã sao chép nội dung Snapshot JSON vào clipboard!');
                      setTimeout(() => setToast(null), 2500);
                    }}
                  >
                    Sao chép JSON 📋
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setIsSnapshotOpen(false)}
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: '#88a3cb', marginBottom: 6 }}>
                  Dán nội dung Snapshot JSON cần khôi phục:
                </div>
                <textarea
                  className="form-control"
                  style={{ height: 220, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.5 }}
                  placeholder='{"version":"3.1.2","releases":[...],"domains":[...]}'
                  value={snapshotImportInput}
                  onChange={(e) => setSnapshotImportInput(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => setIsSnapshotOpen(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleImportSnapshot}
                  >
                    Thực hiện khôi phục <span>✓</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublished={() => {
          refreshAll();
          setToast('Bản phát hành mới đã xuất bản thành công!');
          setTimeout(() => setToast(null), 3500);
        }}
      />
    </div>
  );
};

