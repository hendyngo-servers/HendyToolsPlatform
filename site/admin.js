(() => {
  const $ = (id) => document.getElementById(id);
  const platforms = ['windows', 'android', 'ios'];
  let cachedHistory = [];
  let activeFilter = 'all';
  const fmtSize = (value) => {
    if (!Number.isFinite(value) || value <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return `${size.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
  };
  const fmtDate = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return 'Không có dữ liệu ngày';
    return new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  };
  const platformName = (value) => value === 'windows' ? 'WINDOWS' : value === 'android' ? 'ANDROID' : 'IOS';
  async function api(path) {
    const response = await fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  function showUnavailable(platform, message) {
    $(`${platform}-version`).textContent = 'Chưa có bản phát hành';
    $(`${platform}-state`).textContent = 'CHƯA PHÁT HÀNH';
    $(`${platform}-state`).className = 'state-chip state-muted';
    $(`${platform}-date`).textContent = message || 'Chưa có manifest trên Update Server.';
    $(`${platform}-notes`).replaceChildren();
    const li = document.createElement('li'); li.textContent = 'Khi công bố phiên bản đầu tiên, thông tin sẽ hiển thị tại đây.';
    $(`${platform}-notes`).appendChild(li);
    const link = $(`${platform}-download`);
    link.href = '/'; link.setAttribute('aria-disabled', 'true'); link.textContent = 'Chưa có bản tải xuống';
  }
  function renderRelease(platform, release) {
    if (!release) { showUnavailable(platform); return; }
    $(`${platform}-version`).textContent = `v${release.version || '—'}`;
    $(`${platform}-build`).textContent = release.build ?? '—';
    $(`${platform}-size`).textContent = release.artifact ? fmtSize(release.artifact.size) : (platform === 'ios' ? 'Theo Apple' : '—');
    $(`${platform}-date`).textContent = `Phát hành ${fmtDate(release.publishedAt)}`;
    $(`${platform}-state`).textContent = release.mandatory ? 'CẬP NHẬT BẮT BUỘC' : 'ĐÃ CÔNG BỐ';
    $(`${platform}-state`).className = `state-chip ${release.mandatory ? 'state-loading' : 'state-ok'}`;
    const notes = $(`${platform}-notes`); notes.replaceChildren();
    for (const note of (Array.isArray(release.releaseNotes) ? release.releaseNotes : []).slice(0, 4)) {
      const li = document.createElement('li'); li.textContent = String(note); notes.appendChild(li);
    }
    if (!notes.childElementCount) { const li = document.createElement('li'); li.textContent = 'Không có ghi chú phát hành.'; notes.appendChild(li); }
    const link = $(`${platform}-download`);
    if (platform === 'ios') {
      const url = typeof release.storeUrl === 'string' && release.storeUrl.startsWith('https://') ? release.storeUrl : null;
      link.href = url || 'https://developer.apple.com/programs/';
      link.textContent = url ? 'Mở trang phân phối ↗' : 'Thông tin phân phối iOS ↗';
      link.removeAttribute('aria-disabled');
    } else if (release.downloadUrl) {
      link.href = new URL(release.downloadUrl, location.origin).toString();
      link.textContent = platform === 'windows' ? 'Tải bộ cài Windows ↓' : 'Tải APK Android ↓';
      link.removeAttribute('aria-disabled');
    } else {
      link.href = '/'; link.textContent = 'Chưa có bản tải xuống'; link.setAttribute('aria-disabled', 'true');
    }
  }
  function renderHistory() {
    const list = $('history-list'); list.replaceChildren();
    const rows = cachedHistory.filter((item) => activeFilter === 'all' || item.platform === activeFilter);
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state';
      empty.textContent = cachedHistory.length ? 'Không có phiên bản cho bộ lọc này.' : 'Chưa có manifest lịch sử. Publish phiên bản mới để bắt đầu lưu changelog.';
      list.appendChild(empty); return;
    }
    for (const item of rows) {
      const row = document.createElement('div'); row.className = 'history-row';
      const version = document.createElement('div');
      const v = document.createElement('div'); v.className = 'history-version'; v.textContent = `v${item.version}`;
      const b = document.createElement('span'); b.className = 'history-build'; b.textContent = `BUILD ${item.build}`; version.append(v, b);
      const platform = document.createElement('div'); const badge = document.createElement('span'); badge.className = 'platform-badge'; badge.textContent = platformName(item.platform); platform.appendChild(badge);
      const date = document.createElement('div'); date.className = 'history-date'; date.textContent = fmtDate(item.publishedAt);
      const notes = document.createElement('div'); notes.className = 'history-notes'; const ul = document.createElement('ul');
      for (const text of (Array.isArray(item.releaseNotes) ? item.releaseNotes : []).slice(0, 3)) { const li = document.createElement('li'); li.textContent = String(text); ul.appendChild(li); }
      if (!ul.childElementCount) { const li = document.createElement('li'); li.textContent = 'Không có ghi chú.'; ul.appendChild(li); }
      notes.appendChild(ul); row.append(version, platform, date, notes); list.appendChild(row);
    }
  }
  async function refresh() {
    const button = $('refresh'); button.disabled = true; button.textContent = 'Đang tải…';
    $('history-error').hidden = true;
    const status = $('api-status'); status.textContent = 'Đang kiểm tra API…';
    const health = await api('/healthz').catch((e) => ({ ok: false, error: e.message }));
    if (health.ok) status.textContent = `API hoạt động · ${health.service || 'Hendy Update Server'}`;
    else status.textContent = `API lỗi · ${health.error || 'Không thể kết nối'}`;
    const results = await Promise.allSettled(platforms.map((platform) => api(`/api/v1/releases/history?platform=${platform}&channel=stable&limit=20`)));
    cachedHistory = [];
    let successCount = 0;
    results.forEach((result, index) => {
      const platform = platforms[index];
      if (result.status === 'fulfilled') {
        successCount += 1;
        const releases = Array.isArray(result.value.releases) ? result.value.releases : [];
        const latest = releases[0] || null;
        if (latest) renderRelease(platform, latest); else showUnavailable(platform);
        cachedHistory.push(...releases);
      } else {
        showUnavailable(platform, result.reason?.message || 'Không thể đọc manifest.');
      }
    });
    const unique = new Map();
    for (const item of cachedHistory) unique.set(`${item.platform}:${item.version}+${item.build}`, item);
    cachedHistory = [...unique.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    renderHistory();
    $('history-error').hidden = cachedHistory.length > 0;
    $('api-last-checked').textContent = `Kiểm tra lúc ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}`;
    if (!successCount) $('history-error').hidden = false;
    button.disabled = false; button.textContent = '↻ Làm mới';
  }
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderHistory();
  }));
  $('refresh').addEventListener('click', () => refresh().catch(() => { $('refresh').disabled = false; $('refresh').textContent = '↻ Làm mới'; }));
  refresh().catch(() => { $('api-status').textContent = 'Không thể kết nối Update Server.'; $('history-error').hidden = false; $('refresh').disabled = false; $('refresh').textContent = '↻ Làm mới'; });
})();
