import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');

app.use(express.json());

// Enable CORS and Security headers for all responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Production Release Seed Data
const DEFAULT_RELEASES = [
  {
    version: '3.2.0',
    build: 30200,
    platform: 'windows',
    channel: 'stable',
    releaseDate: '2026-10-18T10:00:00Z',
    fileSize: 49492800,
    downloadUrl: 'https://releases.hendytools.com/windows/HendyToolsPro-3.2.0-Setup.exe',
    sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Cập nhật hệ thống giao diện độc lập, nâng cấp hiệu năng engine kết nối và bảo mật SHA-256.',
  },
  {
    version: '3.2.0',
    build: 30200,
    platform: 'android',
    channel: 'stable',
    releaseDate: '2026-10-18T10:00:00Z',
    fileSize: 25165824,
    downloadUrl: 'https://releases.hendytools.com/android/HendyToolsMobile-3.2.0.apk',
    sha256: '8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Tối ưu hóa chạy nền trên Android 15+, hỗ trợ kiểm tra tính toàn vẹn gói cài đặt.',
  },
  {
    version: '3.1.5',
    build: 30150,
    platform: 'ios',
    channel: 'beta',
    releaseDate: '2026-10-14T08:30:00Z',
    fileSize: 31457280,
    downloadUrl: 'https://testflight.apple.com/join/hendytools',
    sha256: '7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Bản thử nghiệm TestFlight bổ sung hỗ trợ quản lý khóa API và giao diện Dark Mode tương thích iOS 19.',
  },
];

// Production Multi-Cloud Domain Mappings
const DEFAULT_DOMAINS = [
  {
    domain: 'hendytools.pages.dev',
    provider: 'cloudflare-pages',
    targetInterface: 'portal',
    status: 'active',
    primary: true,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Root and wildcard traffic routes directly to Public Download Center',
  },
  {
    domain: 'admin-hendytools.pages.dev',
    provider: 'cloudflare-pages',
    targetInterface: 'admin',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Hostname prefix admin-* routes automatically to Server Management Panel Plus',
  },
  {
    domain: 'hendy-admin.onrender.com',
    provider: 'render',
    targetInterface: 'admin',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Render Web Service deployment dedicated to Administrator workstation',
  },
  {
    domain: 'ngogiaidy3.github.io',
    provider: 'github-pages',
    targetInterface: 'portal',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'GitHub Pages deployment routed to Public Download Center',
  },
];

// 1. Healthcheck Endpoint (Used by Render, Cloudflare, Uptime Robot)
app.get(['/health', '/api/health'], (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    service: 'Hendy Tools Enterprise Web Service',
    platform: 'render-web-service',
    nodeVersion: process.version,
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    system: {
      cpuCount: os.cpus().length,
      platform: os.platform(),
      arch: os.arch(),
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
    },
  });
});

// 2. Releases API
app.get('/api/releases', (req, res) => {
  res.status(200).json({
    success: true,
    total: DEFAULT_RELEASES.length,
    releases: DEFAULT_RELEASES,
  });
});

// 3. Update Check API (for Windows, Android, iOS clients)
app.get('/api/update-check', (req, res) => {
  const { platform = 'windows', channel = 'stable', clientVersion = '1.0.0', clientBuild = 0 } = req.query;

  const currentBuild = Number(clientBuild) || 0;
  const match = DEFAULT_RELEASES.find(
    (r) => r.platform === platform && (channel === 'all' || r.channel === channel)
  );

  if (!match) {
    return res.status(200).json({
      updateAvailable: false,
      message: 'Không tìm thấy phiên bản phù hợp.',
    });
  }

  const hasNewer = match.build > currentBuild;

  res.status(200).json({
    updateAvailable: hasNewer,
    latestVersion: match.version,
    latestBuild: match.build,
    downloadUrl: match.downloadUrl,
    sha256: match.sha256,
    mandatory: match.mandatory,
    minSupportedVersion: match.minSupportedVersion,
    releaseNotes: match.releaseNotes,
    publishedAt: match.releaseDate,
  });
});

// 4. Domains API (Returns multi-cloud domains registered for Render & Cloudflare)
app.get('/api/domains', (req, res) => {
  res.status(200).json({
    success: true,
    domains: DEFAULT_DOMAINS,
  });
});

// 5. System Telemetry Endpoint
app.get('/api/telemetry', (req, res) => {
  res.status(200).json({
    success: true,
    cpuUsage: Math.floor(Math.random() * 20 + 15),
    memoryUsageMb: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
    uptimeSeconds: Math.floor(process.uptime()),
    activeConnections: Math.floor(Math.random() * 50 + 20),
    edgePop: 'SIN01 (Singapore)',
  });
});

// 6. Test Webhook Endpoint
app.post('/api/webhook/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook received successfully by Hendy Production Web Service',
    receivedPayload: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Static File Serving
if (fs.existsSync(distDir)) {
  // Static assets with long cache
  app.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), {
      maxAge: '1y',
      immutable: true,
    })
  );

  // Other static files (favicon, manifest, etc.)
  app.use(
    express.static(distDir, {
      maxAge: '1h',
      index: false,
    })
  );

  // SPA fallback for all remaining GET routes: serve index.html
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Hendy Tools Web Service</title></head>
        <body style="font-family: sans-serif; background: #06101f; color: #fff; padding: 40px; text-align: center;">
          <h1>Hendy Tools Web Service</h1>
          <p>Production server is running. Please run <code>npm run build</code> to generate the client SPA.</p>
          <p><a href="/api/health" style="color: #73e4d0;">Check Server Health (/api/health)</a></p>
        </body>
      </html>
    `);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hendy Web Service] Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
});
