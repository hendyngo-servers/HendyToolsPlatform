interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
  text(): Promise<string>;
}
interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
}
interface AssetsBindingLike {
  fetch(request: Request): Promise<Response>;
}
interface Env {
  RELEASES: R2BucketLike;
  ASSETS: AssetsBindingLike;
}

type Platform = "windows" | "android" | "ios";
type Channel = "stable" | "beta";
interface Artifact {
  key: string;
  fileName: string;
  sha256: string;
  size: number;
  contentType?: string;
  signerThumbprint?: string;
}
interface ReleaseManifest {
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
  storeUrl?: string;
  artifact?: Artifact | null;
}
const PLATFORMS = new Set<Platform>(["windows", "android", "ios"]);
const CHANNELS = new Set<Channel>(["stable", "beta"]);
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const THUMBPRINT_RE = /^[a-f0-9]{40,64}$/i;

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(data), { status, headers });
}
function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}
function validPlatform(value: string | null): value is Platform {
  return value !== null && PLATFORMS.has(value as Platform);
}
function validChannel(value: string | null): value is Channel {
  return value !== null && CHANNELS.has(value as Channel);
}
function parseVersion(version: string): number[] {
  return version.split("-")[0].split(".").map((part) => Number.parseInt(part, 10) || 0);
}
function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  if (a.includes("-") !== b.includes("-")) return a.includes("-") ? -1 : 1;
  return 0;
}
async function loadManifest(env: Env, platform: Platform, channel: Channel): Promise<ReleaseManifest | null> {
  const object = await env.RELEASES.get(`manifests/${platform}-${channel}.json`);
  if (!object) return null;
  let candidate: unknown;
  try { candidate = JSON.parse(await object.text()); }
  catch { throw new Error("Release manifest is not valid JSON"); }
  if (!candidate || typeof candidate !== "object") throw new Error("Release manifest is not an object");
  const m = candidate as Partial<ReleaseManifest>;
  if (m.schemaVersion !== 1 || m.platform !== platform || m.channel !== channel) {
    throw new Error("Release manifest schema/platform/channel mismatch");
  }
  if (typeof m.version !== "string" || !VERSION_RE.test(m.version)) throw new Error("Invalid release version");
  if (typeof m.build !== "number" || !Number.isSafeInteger(m.build) || m.build < 1) throw new Error("Invalid release build");
  if (typeof m.minSupportedVersion !== "string" || !VERSION_RE.test(m.minSupportedVersion)) throw new Error("Invalid minSupportedVersion");
  if (typeof m.mandatory !== "boolean" || !Array.isArray(m.releaseNotes) || m.releaseNotes.some((item) => typeof item !== "string")) {
    throw new Error("Invalid release metadata");
  }
  if (platform === "windows" || platform === "android") {
    const a = m.artifact;
    const prefix = `packages/${platform}/`;
    const extOk = platform === "windows"
      ? typeof a?.fileName === "string" && /\.(exe|msi)$/i.test(a.fileName)
      : typeof a?.fileName === "string" && /\.apk$/i.test(a.fileName);
    if (!a || typeof a !== "object" || typeof a.key !== "string" ||
        !a.key.startsWith(prefix) || !new RegExp(`^packages/${platform}/[A-Za-z0-9._-]+$`).test(a.key) || a.key.includes("..") ||
        typeof a.fileName !== "string" || !/^[A-Za-z0-9._-]+$/.test(a.fileName) || !extOk ||
        typeof a.sha256 !== "string" || !SHA256_RE.test(a.sha256) ||
        typeof a.size !== "number" || !Number.isSafeInteger(a.size) || a.size <= 0) {
      throw new Error(`Invalid ${platform} artifact metadata`);
    }
    if (a.signerThumbprint && !THUMBPRINT_RE.test(a.signerThumbprint)) throw new Error("Invalid signer thumbprint");
  } else {
    if (typeof m.storeUrl !== "string") throw new Error("iOS release requires storeUrl or an approved distribution URL");
    const store = new URL(m.storeUrl);
    if (store.protocol !== "https:") throw new Error("storeUrl must use HTTPS");
  }
  return m as ReleaseManifest;
}
function versionIsBelowMinimum(current: string, minimum: string): boolean {
  if (!VERSION_RE.test(current)) return true;
  return compareVersions(current, minimum) < 0;
}
async function handleLatest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const platformValue = url.searchParams.get("platform");
  const channelValue = url.searchParams.get("channel") ?? "stable";
  if (!validPlatform(platformValue)) return errorResponse("platform must be windows, android, or ios", 400);
  if (!validChannel(channelValue)) return errorResponse("channel must be stable or beta", 400);
  let release: ReleaseManifest | null;
  try { release = await loadManifest(env, platformValue, channelValue); }
  catch (error) { return errorResponse(`Invalid manifest: ${error instanceof Error ? error.message : "unknown error"}`, 500); }
  if (!release) return errorResponse(`No release published for ${platformValue}/${channelValue}`, 404);

  const currentVersion = url.searchParams.get("current") ?? "0.0.0";
  const currentBuild = Number.parseInt(url.searchParams.get("build") ?? "0", 10) || 0;
  const versionDelta = VERSION_RE.test(currentVersion) ? compareVersions(release.version, currentVersion) : 1;
  const updateAvailable = versionDelta > 0 || (versionDelta === 0 && currentBuild < release.build);
  const mandatory = Boolean(release.mandatory && updateAvailable && versionIsBelowMinimum(currentVersion, release.minSupportedVersion));
  const hasDirectArtifact = (platformValue === "windows" || platformValue === "android") && Boolean(release.artifact);
  return json({
    appId: release.appId,
    platform: release.platform,
    channel: release.channel,
    version: release.version,
    build: release.build,
    publishedAt: release.publishedAt,
    updateAvailable,
    mandatory,
    minSupportedVersion: release.minSupportedVersion,
    releaseNotes: release.releaseNotes,
    storeUrl: release.storeUrl ?? null,
    artifact: hasDirectArtifact && release.artifact ? {
      fileName: release.artifact.fileName,
      sha256: release.artifact.sha256,
      size: release.artifact.size,
      contentType: release.artifact.contentType ?? "application/octet-stream",
      signerThumbprint: release.artifact.signerThumbprint ?? null,
    } : null,
    downloadUrl: hasDirectArtifact ? `${url.origin}/api/v1/releases/download?platform=${platformValue}&channel=${release.channel}` : null,
  });
}
async function handleDownload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const platformValue = url.searchParams.get("platform");
  const channelValue = url.searchParams.get("channel") ?? "stable";
  if (platformValue !== "windows" && platformValue !== "android") {
    return errorResponse("Direct binary downloads are supported for Windows and Android APK only", 400);
  }
  if (!validChannel(channelValue)) return errorResponse("channel must be stable or beta", 400);
  let manifest: ReleaseManifest | null;
  try { manifest = await loadManifest(env, platformValue, channelValue); }
  catch (error) { return errorResponse(`Invalid manifest: ${error instanceof Error ? error.message : "unknown error"}`, 500); }
  if (!manifest?.artifact) return errorResponse(`No ${platformValue} artifact is published`, 404);
  const artifact = manifest.artifact;
  const object = await env.RELEASES.get(artifact.key);
  if (!object) return errorResponse("Release artifact not found in R2", 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", artifact.contentType ?? "application/octet-stream");
  headers.set("Content-Length", String(artifact.size));
  headers.set("Content-Disposition", `attachment; filename="${artifact.fileName}"`);
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("ETag", object.httpEtag);
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(object.body, { status: 200, headers });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    }});
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
      return json({ ok: true, service: "hendy-tools-download", time: new Date().toISOString() });
    }
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/api/v1/releases/latest") return handleLatest(request, env);
      if (url.pathname === "/api/v1/releases/download") return handleDownload(request, env);
    }
    if (request.method !== "GET" && request.method !== "HEAD") return errorResponse("Method not allowed", 405);
    return env.ASSETS.fetch(request);
  },
};
