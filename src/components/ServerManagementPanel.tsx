import React, { useState, useEffect } from 'react';

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
  onBackToDownload: () => void;
  onOpenConsole: () => void;
}

export const ServerManagementPanel: React.FC<Props> = ({ onBackToDownload, onOpenConsole }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'processes' | 'ports' | 'terminal' | 'env'>('overview');
  
  // Real-time server stats
  const [cpuUsage, setCpuUsage] = useState(28);
  const [ramUsage, setRamUsage] = useState(4.3);
  const [diskUsage] = useState(58.4);
  const [netDown, setNetDown] = useState(3.4);
  const [netUp, setNetUp] = useState(1.1);

  // Services state
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

  // Processes state
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

  // Ports
  const ports: PortItem[] = [
    { port: 80, protocol: 'TCP', service: 'HTTP (Nginx)', binding: '0.0.0.0:80', state: 'LISTEN' },
    { port: 443, protocol: 'TCP', service: 'HTTPS (SSL/TLS)', binding: '0.0.0.0:443', state: 'LISTEN' },
    { port: 3000, protocol: 'TCP', service: 'Hendy Release API', binding: '0.0.0.0:3000', state: 'LISTEN' },
    { port: 22, protocol: 'TCP', service: 'OpenSSH Server', binding: '0.0.0.0:22', state: 'LISTEN' },
    { port: 6379, protocol: 'TCP', service: 'Redis Cache', binding: '127.0.0.1:6379', state: 'LISTEN' },
  ];

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; out: string; time: string }>>([
    {
      cmd: 'hendy-tools status',
      out: '✓ Hendy Tools Server Plus v3.1.2\n• Host: hendy-core-node-01.local\n• Architecture: x86_64 Linux 6.8.0-generic\n• Release Services: Active (healthy)\n• R2 Sync: Connected (0 pending jobs)',
      time: '16:32:01',
    },
    {
      cmd: 'df -h /',
      out: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2  248G   58G  178G  25% /',
      time: '16:33:15',
    },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Simulate subtle real-time fluctuation
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
          if (action === 'restart') {
            return { ...s, status: 'restarting' };
          }
          if (action === 'stop') {
            return { ...s, status: 'stopped', cpu: 0 };
          }
          if (action === 'start') {
            return { ...s, status: 'running', cpu: 0.8 };
          }
        }
        return s;
      })
    );

    if (action === 'restart') {
      setTimeout(() => {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: 'running', uptime: '1m' } : s))
        );
        setActionNotice(`Dịch vụ ${id} đã được khởi động lại thành công.`);
        setTimeout(() => setActionNotice(null), 3000);
      }, 1200);
    } else {
      setActionNotice(`Dịch vụ ${id} đã được chuyển sang trạng thái ${action === 'stop' ? 'dừng' : 'chạy'}.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleKillProcess = (pid: number, name: string) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    setActionNotice(`Đã kết thúc tiến trình PID ${pid} (${name}).`);
    setTimeout(() => setActionNotice(null), 3500);
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
    } else if (cmd === 'systemctl status hendy-tools') {
      out = `● hendy-tools.service - Hendy Tools Platform Service Plus\n     Loaded: loaded (/etc/systemd/system/hendy-tools.service; enabled)\n     Active: active (running) since Sun 2026-10-12 14:30:00 UTC; 7 days ago\n   Main PID: 1420 (node)\n      Tasks: 18 (limit: 18942)\n     Memory: 128.4M\n        CPU: 12min 42.102s`;
    } else if (cmd.startsWith('ping')) {
      out = `PING cloudflare.com (104.16.132.229) 56(84) bytes of data.\n64 bytes from 104.16.132.229: icmp_seq=1 ttl=58 time=8.12 ms\n64 bytes from 104.16.132.229: icmp_seq=2 ttl=58 time=7.94 ms\n--- cloudflare.com ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
    } else {
      out = `[exec] ${cmd}\nCommand executed successfully with exit code 0.`;
    }

    setTerminalHistory((prev) => [...prev, { cmd, out, time: now }]);
    setTerminalInput('');
  };

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

      {actionNotice && (
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
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <button
          type="button"
          className="admin-brand"
          onClick={onBackToDownload}
          aria-label="Về trang chủ Hendy Tools"
        >
          <span className="admin-brand-mark">
            H<span>+</span>
          </span>
          <span>
            <b>HENDY<span>SERVER</span></b>
            <small>MANAGEMENT PANEL PLUS</small>
          </span>
        </button>

        <div className="sidebar-label">SERVER CONTROL</div>
        <nav className="sidebar-nav" aria-label="Quản trị server">
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">◫</span>
            <span>Tổng quan tài nguyên</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <span className="nav-icon">⚙</span>
            <span>Quản lý dịch vụ</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'processes' ? 'active' : ''}`}
            onClick={() => setActiveTab('processes')}
          >
            <span className="nav-icon">◈</span>
            <span>Tiến trình hệ thống</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'ports' ? 'active' : ''}`}
            onClick={() => setActiveTab('ports')}
          >
            <span className="nav-icon">▤</span>
            <span>Cổng & Tường lửa</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <span className="nav-icon">⌘</span>
            <span>Terminal dòng lệnh</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'env' ? 'active' : ''}`}
            onClick={() => setActiveTab('env')}
          >
            <span className="nav-icon">≋</span>
            <span>Cấu hình & Biến môi trường</span>
            <i />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-link"
            style={{ marginBottom: 8, color: '#82baff', background: 'rgba(52, 125, 255, 0.1)' }}
            onClick={onOpenConsole}
          >
            <span className="nav-icon">↗</span>
            <span>Mở Release Console</span>
          </button>
          <div className="sidebar-health">
            <span className="health-indicator" />
            <div>
              <b>Server Node Status</b>
              <small>HENDY-CORE-01 · ONLINE</small>
            </div>
          </div>
          <div className="sidebar-version">
            SERVER PANEL <span>PLUS V2.4</span>
          </div>
        </div>
      </aside>

      {/* Main Server Panel Area */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>Hendy Tools</span>
            <i>/</i>
            <b>Server Management Panel Plus</b>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <i /> PRODUCTION NODE
            </span>
            <button type="button" className="topbar-public" onClick={onOpenConsole}>
              Release Console <span>↗</span>
            </button>
            <button type="button" className="topbar-public" onClick={onBackToDownload}>
              Trang tải ứng dụng <span>↗</span>
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="admin-content">
          {/* Header Banner */}
          <section className="admin-hero" style={{ padding: '24px 28px' }}>
            <div>
              <div className="admin-eyebrow">
                <span className="eyebrow-line" /> SERVER INFRASTRUCTURE PLUS
                <span className="eyebrow-tag">DEDICATED NODE</span>
              </div>
              <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 36px)', margin: '12px 0 8px' }}>
                Hệ thống máy chủ <span>Hendy Cloud Node.</span>
              </h1>
              <p>
                Giám sát hiệu năng phần cứng thời gian thực, quản lý các dịch vụ nền, tiến trình mạng và thực thi lệnh trực tiếp trên máy chủ phân phối Hendy Tools.
              </p>
            </div>
            <div className="admin-hero-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setActionNotice('Đang đồng bộ lại toàn bộ trạng thái tài nguyên hệ thống…');
                  setTimeout(() => setActionNotice(null), 2500);
                }}
              >
                <span>↻</span> Làm mới số liệu
              </button>
              <button
                type="button"
                className="button button-soft"
                onClick={() => setActiveTab('terminal')}
              >
                Mở Terminal dòng lệnh <span>⌘</span>
              </button>
            </div>
          </section>

          {/* Quick Metrics Bar */}
          <section className="summary-grid" style={{ marginTop: 20 }}>
            <article className="summary-card">
              <div className="summary-top">
                <span>CPU UTILIZATION</span>
                <span className="summary-icon icon-blue">⌁</span>
              </div>
              <div className="summary-value">{cpuUsage}%</div>
              <div className="summary-bottom">
                <span>8 vCPU · 3.4 GHz</span>
                <b>{cpuUsage > 80 ? 'Cao' : 'Ổn định'}</b>
              </div>
              <div className="summary-rail">
                <i style={{ width: `${cpuUsage}%` }} />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>RAM (MEMORY)</span>
                <span className="summary-icon icon-teal">◈</span>
              </div>
              <div className="summary-value">{ramUsage} GB</div>
              <div className="summary-bottom">
                <span>Đã dùng / 16 GB</span>
                <b>{Math.round((ramUsage / 16) * 100)}%</b>
              </div>
              <div className="summary-rail teal-rail">
                <i style={{ width: `${(ramUsage / 16) * 100}%` }} />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>NVMe STORAGE</span>
                <span className="summary-icon icon-violet">▤</span>
              </div>
              <div className="summary-value">{diskUsage} GB</div>
              <div className="summary-bottom">
                <span>Đã dùng / 250 GB</span>
                <b>23%</b>
              </div>
              <div className="summary-rail violet-rail">
                <i style={{ width: '23%' }} />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>NETWORK TRAFFIC</span>
                <span className="summary-icon icon-green">≋</span>
              </div>
              <div className="summary-value server-summary-value">{netDown} MB/s</div>
              <div className="summary-bottom">
                <span>↓ {netDown}M / ↑ {netUp}M</span>
                <b>10 Gbps Link</b>
              </div>
              <div className="summary-rail green-rail">
                <i style={{ width: '65%' }} />
              </div>
            </article>
          </section>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">01 <span>/</span> SYSTEM OVERVIEW</div>
                  <h2>Thông tin nút hạ tầng & Trạng thái phần cứng</h2>
                  <p>Báo cáo thông số chi tiết của máy chủ phân phối Hendy Tools Platform.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                {/* Node Specifications */}
                <div style={{ background: '#0a1a2e', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 12 }}>THÔNG SỐ PHẦN CỨNG & HỆ ĐIỀU HÀNH</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>HOSTNAME</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>hendy-core-node-01</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>OPERATING SYSTEM</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>Ubuntu 24.04 LTS (x86_64)</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>LINUX KERNEL</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>6.8.0-45-generic</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>SYSTEM UPTIME</small>
                      <div style={{ color: '#73e4d0', fontSize: 13, fontWeight: 700, marginTop: 4 }}>18 ngày 06 giờ 42 phút</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>NODE.JS RUNTIME</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>v22.12.0 LTS</div>
                    </div>
                    <div>
                      <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>VIRTUALIZATION</small>
                      <div style={{ color: '#e5f0ff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>KVM / Proxmox Dedicated</div>
                    </div>
                  </div>
                </div>

                {/* Cloudflare & R2 Integration Status */}
                <div style={{ background: '#0a1a2e', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
                  <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 12 }}>KẾT NỐI CLOUDFLARE & R2 STORAGE</div>
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
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>Cloudflare Managed ECC CA-3</small>
                      </div>
                      <span className="state-chip state-ok">HỢP LỆ (90 NGÀY)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#eaf3ff', fontSize: 12, fontWeight: 700 }}>DDOS Protection & WAF</div>
                        <small style={{ color: '#7088a9', font: '9px var(--mono)' }}>Cloudflare Enterprise Proxy</small>
                      </div>
                      <span className="state-chip state-ok">BẢO VỆ TỐI ĐA</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Tab 2: Services */}
          {activeTab === 'services' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">02 <span>/</span> SYSTEM SERVICES</div>
                  <h2>Quản lý dịch vụ máy chủ</h2>
                  <p>Theo dõi, khởi động lại hoặc dừng các dịch vụ phân phối phần mềm Hendy Tools.</p>
                </div>
                <button
                  type="button"
                  className="button button-soft"
                  onClick={() => {
                    setActionNotice('Đang kiểm tra trạng thái tất cả các systemd services…');
                    setTimeout(() => setActionNotice(null), 2500);
                  }}
                >
                  <span>↻</span> Quét lại dịch vụ
                </button>
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
            </section>
          )}

          {/* Tab 3: Processes */}
          {activeTab === 'processes' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">03 <span>/</span> PROCESS MONITOR</div>
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
                <div id="process-list">
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
            </section>
          )}

          {/* Tab 4: Ports & Firewall */}
          {activeTab === 'ports' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">04 <span>/</span> PORTS & NETSTAT</div>
                  <h2>Cổng kết nối mở & Trạng thái mạng</h2>
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
            </section>
          )}

          {/* Tab 5: Terminal */}
          {activeTab === 'terminal' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">05 <span>/</span> SERVER TERMINAL</div>
                  <h2>Giao diện dòng lệnh máy chủ (CLI)</h2>
                  <p>Thực thi các lệnh chẩn đoán nhanh trên máy chủ Hendy Cloud Node.</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['uptime', 'free -h', 'df -h', 'docker ps', 'systemctl status hendy-tools', 'clear'].map((cmd) => (
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
                  Hendy Tools Cloud Shell [Version 2.4.0-release] — Connected to root@hendy-core-01
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
                    placeholder="Nhập lệnh (ví dụ: uptime, df -h, free -h, ping, clear)..."
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
            </section>
          )}

          {/* Tab 6: Env & Config */}
          {activeTab === 'env' && (
            <section className="content-section" style={{ paddingTop: 35 }}>
              <div className="section-heading">
                <div>
                  <div className="section-index">06 <span>/</span> CONFIGURATION</div>
                  <h2>Biến môi trường (.env.example)</h2>
                  <p>Mẫu cấu hình tham chiếu từ gói server-management-panel-plus.</p>
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
{`# Hendy Tools & Server Management Panel Plus Environment
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
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          <button
            type="button"
            className="admin-brand footer-admin-brand"
            onClick={onBackToDownload}
          >
            <span className="admin-brand-mark">
              H<span>+</span>
            </span>
            <span>
              <b>HENDY<span>SERVER</span></b>
              <small>PANEL PLUS</small>
            </span>
          </button>
          <span>Server Management Panel Plus · Hendy Infrastructure Node</span>
          <button type="button" onClick={onOpenConsole}>
            Mở Release Console ↗
          </button>
        </footer>
      </div>
    </div>
  );
};
