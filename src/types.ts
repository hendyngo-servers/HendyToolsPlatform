export type Platform = 'windows' | 'android' | 'ios';
export type Channel = 'stable' | 'beta';

export interface Artifact {
  key: string;
  fileName: string;
  sha256: string;
  size: number;
  contentType?: string;
  signerThumbprint?: string;
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
