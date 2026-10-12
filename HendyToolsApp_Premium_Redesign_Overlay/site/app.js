(() => {
  const $ = (id) => document.getElementById(id);
  const fmtSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes, index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
  };
  const fmtDate = (value) => {
    if (!value) return 'Ngày phát hành không có sẵn';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ngày phát hành không có sẵn';
    return new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  };
  function setDownload(platform, release) {
    const prefix = platform;
    const button = $(`${prefix}-download`);
    if (!release) {
      $(`${prefix}-version`).textContent = 'Chưa phát hành';
      button.textContent = 'Chưa có bản tải xuống';
      button.classList.add('disabled'); button.setAttribute('aria-disabled', 'true'); button.removeAttribute('href');
      return;
    }
    $(`${prefix}-version`).textContent = `v${release.version}`;
    $(`${prefix}-size`).textContent = release.artifact ? fmtSize(release.artifact.size) : 'Theo nhà phân phối';
    $(`${prefix}-channel`).textContent = (release.channel || 'stable').toUpperCase();
    $(`${prefix}-published`).textContent = `Phát hành ${fmtDate(release.publishedAt)}`;
    $(`${prefix}-notes-version`).textContent = `VERSION ${release.version} · BUILD ${release.build}`;
    const notes = $(`${prefix}-notes`); notes.replaceChildren();
    const rows = Array.isArray(release.releaseNotes) && release.releaseNotes.length ? release.releaseNotes : ['Cập nhật và cải thiện độ ổn định.'];
    for (const note of rows.slice(0, 8)) { const li = document.createElement('li'); li.textContent = note; notes.appendChild(li); }

    if (prefix === 'ios') {
      const url = release.storeUrl;
      if (typeof url === 'string' && url.startsWith('https://')) {
        button.href = url; button.target = '_blank'; button.rel = 'noopener noreferrer'; button.classList.remove('disabled'); button.removeAttribute('aria-disabled');
        button.innerHTML = 'Mở trang phân phối iOS <span>↗</span>';
        $('ios-status').textContent = 'Có liên kết phân phối được cấu hình. Khả năng cài đặt trực tiếp phụ thuộc phê duyệt và khu vực Apple hỗ trợ.';
      } else {
        button.href = '#help'; button.classList.add('disabled'); button.setAttribute('aria-disabled', 'true');
        $('ios-status').textContent = 'Chưa có liên kết phân phối iOS. Phân phối trực tiếp trên web cần được Apple phê duyệt và chỉ khả dụng ở khu vực đủ điều kiện.';
      }
      return;
    }

    const url = release.downloadUrl;
    if (typeof url === 'string' && url.startsWith('https://')) {
      button.href = url; button.classList.remove('disabled'); button.removeAttribute('aria-disabled');
      button.innerHTML = prefix === 'windows' ? 'Tải bộ cài Windows <span>↓</span>' : 'Tải APK Android <span>↓</span>';
      if (release.artifact?.sha256 && $(`${prefix}-build`)) {
        $(`${prefix}-build`).textContent = `SHA-256: ${release.artifact.sha256}`;
        $(`${prefix}-build`).title = release.artifact.sha256;
      }
    } else {
      button.href = '#help'; button.classList.add('disabled'); button.setAttribute('aria-disabled', 'true'); button.textContent = 'Chưa có liên kết tải';
    }
  }

  async function fetchRelease(platform) {
    const params = new URLSearchParams({ platform, channel: 'stable', current: '0.0.0', build: '0' });
    const response = await fetch(`/api/v1/releases/latest?${params}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${platform}: HTTP ${response.status}`);
    return response.json();
  }

  async function refresh() {
    $('refresh-button').disabled = true; $('refresh-button').textContent = '↻ Đang tải…';
    $('server-error').hidden = true;
    const results = await Promise.allSettled([fetchRelease('windows'), fetchRelease('android'), fetchRelease('ios')]);
    let anySuccess = false;
    if (results[0].status === 'fulfilled') { setDownload('windows', results[0].value); anySuccess = true; }
    else { setDownload('windows', null); }
    if (results[1].status === 'fulfilled') { setDownload('android', results[1].value); anySuccess = true; }
    else { setDownload('android', null); }
    if (results[2].status === 'fulfilled') { setDownload('ios', results[2].value); anySuccess = true; }
    else { $('ios-status').textContent = 'Chưa có manifest iOS. Dùng phương thức phân phối được Apple cho phép.'; }
    const now = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    $('last-checked').textContent = `Làm mới lúc ${now}`;
    $('release-state').textContent = anySuccess ? 'ĐÃ ĐỒNG BỘ' : 'CHƯA CÓ BẢN PHÁT HÀNH';
    $('footer-health').innerHTML = anySuccess ? '<i class="pulse-dot"></i> Máy chủ phát hành phản hồi' : '<i class="pulse-dot" style="background:#ffbf69;box-shadow:0 0 0 4px #ffbf6919"></i> Cần cấu hình manifest phát hành';
    $('server-error').hidden = anySuccess;
    $('refresh-button').disabled = false; $('refresh-button').textContent = '↻ Làm mới';
  }
  $('refresh-button').addEventListener('click', refresh);
  refresh().catch(() => { $('server-error').hidden = false; $('refresh-button').disabled = false; $('refresh-button').textContent = '↻ Làm mới'; });
})();
