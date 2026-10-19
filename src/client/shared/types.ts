export type Platform = 'windows' | 'android' | 'ios';
export type Channel = 'stable' | 'beta';

export interface Artifact {
  key: string;
  fileName: string;
  sha256: string;
  size: number;
  contentType: string;
  signerThumbprint?: string;
  architecture?: 'x64' | 'arm64' | 'universal';
}

export interface ReleaseManifest {
  schemaVersion: number;
  appId: string;
  platform: Platform;
  channel: Channel;
  version: string;
  build: number;
  publishedAt: string;
  mandatory: boolean;
  minSupportedVersion: string;
  releaseNotes: string[];
  storeUrl?: string | null;
  artifact?: Artifact | null;
  downloadUrl?: string | null;
}

export interface UpdateCheckResult {
  appId: string;
  platform: Platform;
  channel: Channel;
  version: string;
  build: number;
  publishedAt: string;
  updateAvailable: boolean;
  mandatory: boolean;
  minSupportedVersion: string;
  releaseNotes: string[];
  storeUrl: string | null;
  artifact: {
    fileName: string;
    sha256: string;
    size: number;
    contentType: string;
    signerThumbprint: string | null;
  } | null;
  downloadUrl: string | null;
}

export interface SystemService {
  id: string;
  name: string;
  displayName: string;
  category: 'core' | 'web' | 'storage' | 'security';
  port: number | null;
  status: 'running' | 'stopped' | 'restarting';
  uptime: string;
  cpu: number;
  memory: string;
  description: string;
}

export interface ProcessMetric {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  status: 'running' | 'sleeping' | 'idle';
  command: string;
}

export interface NetworkPort {
  port: number;
  protocol: 'TCP' | 'UDP';
  service: string;
  binding: string;
  state: 'LISTEN' | 'ESTABLISHED';
  policy: 'ALLOWED' | 'PROTECTED' | 'INTERNAL';
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
}
