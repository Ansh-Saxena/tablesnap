/**
 * TableSnap Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  let currentCapture = null;
  let currentStatus = null;
  let activeTab = null;

  // Cache DOM elements
  const proBadge = document.getElementById('pro-badge');
  const dataCountBadge = document.getElementById('data-count-badge');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Tab 1 Elements
  const btnStartInspector = document.getElementById('btn-start-inspector');
  const btnRefreshScan = document.getElementById('btn-refresh-scan');
  const detectedList = document.getElementById('detected-list');

  // Tab 2 Elements
  const noDataMsg = document.getElementById('no-data-msg');
  const dataPreviewContainer = document.getElementById('data-preview-container');
  const proLimitBanner = document.getElementById('pro-limit-banner');
  const limitShown = document.getElementById('limit-shown');
  const limitTotal = document.getElementById('limit-total');
  const btnBannerUnlock = document.getElementById('btn-banner-unlock');
  const previewRowCount = document.getElementById('preview-row-count');
  const previewColCount = document.getElementById('preview-col-count');
  const previewSearch = document.getElementById('preview-search');
  const previewThead = document.getElementById('preview-thead');
  const previewTbody = document.getElementById('preview-tbody');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopyClipboard = document.getElementById('btn-copy-clipboard');
  const btnSwitchToCapture = document.getElementById('btn-switch-to-capture');

  // Tab 3 Elements
  const btnUpgradeCheckout = document.getElementById('btn-upgrade-checkout');
  const inputLicenseKey = document.getElementById('input-license-key');
  const btnActivateLicense = document.getElementById('btn-activate-license');
  const licenseMsg = document.getElementById('license-msg');
  const toggleSandbox = document.getElementById('toggle-sandbox');

  // 1. Initialize State
  async function init() {
    // Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;

    await refreshLicenseStatus();
    await loadActiveCapture();
    await scanCurrentTab();
    setupEventListeners();
  }

  // Refresh and render Pro / Free state
  async function refreshLicenseStatus() {
    currentStatus = await window.monetization.getStatus();
    
    if (currentStatus.isPro) {
      proBadge.textContent = 'PRO ⚡';
      proBadge.className = 'badge badge-pro';
      proLimitBanner.style.display = 'none';
      if (toggleSandbox) toggleSandbox.checked = currentStatus.isSandboxPro;
    } else {
      proBadge.textContent = 'FREE';
      proBadge.className = 'badge badge-free';
      if (toggleSandbox) toggleSandbox.checked = false;
    }

    if (currentStatus.licenseKey && inputLicenseKey) {
      inputLicenseKey.value = currentStatus.licenseKey;
    }
  }

  // Load cached capture from storage
  async function loadActiveCapture() {
    const data = await chrome.storage.local.get('tablesnap_active_capture');
    if (data.tablesnap_active_capture) {
      currentCapture = data.tablesnap_active_capture;
      renderPreview(currentCapture);
    } else {
      showNoData();
    }
  }

  // Scan current webpage for tables
  async function scanCurrentTab() {
    if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://')) {
      detectedList.innerHTML = '<div class="empty-state">Cannot inspect system chrome pages.</div>';
      return;
    }

    try {
      detectedList.innerHTML = '<div class="empty-state">Scanning page...</div>';
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'SCAN_PAGE' });
      
      if (response && response.items && response.items.length > 0) {
        renderDetectedItems(response.items);
      } else {
        detectedList.innerHTML = '<div class="empty-state">No tables or lists detected on this page. Use the inspector above to select any custom element.</div>';
      }
    } catch (err) {
      detectedList.innerHTML = `
        <div class="empty-state">
          <p>Please refresh the webpage to enable TableSnap inspector.</p>
        </div>`;
    }
  }

  // Render detected tables in Tab 1
  function renderDetectedItems(items) {
    detectedList.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'detected-item';
      el.innerHTML = `
        <div class="item-info">
          <span class="item-title">${escapeHtml(item.name)}</span>
          <span class="item-meta">${item.type} &bull; ${item.rowCount} rows</span>
        </div>
        <button class="btn btn-secondary btn-sm btn-extract-item" data-selector="${escapeHtml(item.selector)}">
          Extract
        </button>
      `;

      el.querySelector('.btn-extract-item').addEventListener('click', async (e) => {
        const selector = e.currentTarget.getAttribute('data-selector');
        await extractBySelector(selector);
      });

      detectedList.appendChild(el);
    });
  }

  // Extract table by CSS selector
  async function extractBySelector(selector) {
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'EXTRACT_SELECTOR',
        selector
      });

      if (response && response.success && response.extracted) {
        currentCapture = response.extracted;
        renderPreview(currentCapture);
        switchTab('tab-preview');
      }
    } catch (err) {
      console.error('Extraction error:', err);
    }
  }

  // Render Data Preview in Tab 2
  function renderPreview(capture) {
    if (!capture || !capture.data || capture.data.length === 0) {
      showNoData();
      return;
    }

    noDataMsg.style.display = 'none';
    dataPreviewContainer.style.display = 'flex';

    dataCountBadge.textContent = String(capture.data.length);
    previewRowCount.textContent = String(capture.data.length);
    previewColCount.textContent = String(capture.headers.length);

    // Limit check for free users
    if (!currentStatus.isPro && capture.data.length > window.MONETIZATION_CONFIG.FREE_ROW_LIMIT) {
      proLimitBanner.style.display = 'flex';
      limitShown.textContent = String(window.MONETIZATION_CONFIG.FREE_ROW_LIMIT);
      limitTotal.textContent = String(capture.data.length);
    } else {
      proLimitBanner.style.display = 'none';
    }

    renderTableRows(capture.headers, capture.data);
  }

  function renderTableRows(headers, data, filterQuery = '') {
    previewThead.innerHTML = '';
    previewTbody.innerHTML = '';

    // Headers
    const trHead = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trHead.appendChild(th);
    });
    previewThead.appendChild(trHead);

    // Effective rows to display
    const q = filterQuery.toLowerCase().trim();
    let displayRows = data;
    if (q) {
      displayRows = data.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)));
    }

    // Free limit preview
    const maxPreview = currentStatus.isPro ? displayRows.length : Math.min(displayRows.length, window.MONETIZATION_CONFIG.FREE_ROW_LIMIT);

    for (let i = 0; i < maxPreview; i++) {
      const row = displayRows[i];
      const tr = document.createElement('tr');
      headers.forEach((_, colIdx) => {
        const td = document.createElement('td');
        td.textContent = row[colIdx] !== undefined ? row[colIdx] : '';
        td.title = td.textContent;
        tr.appendChild(td);
      });
      previewTbody.appendChild(tr);
    }
  }

  function showNoData() {
    noDataMsg.style.display = 'flex';
    dataPreviewContainer.style.display = 'none';
    dataCountBadge.textContent = '0';
  }

  // Tab switching helper
  function switchTab(targetTabId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    if (btnSwitchToCapture) {
      btnSwitchToCapture.addEventListener('click', () => switchTab('tab-capture'));
    }

    if (btnBannerUnlock) {
      btnBannerUnlock.addEventListener('click', () => switchTab('tab-pro'));
    }

    // Inspector
    btnStartInspector.addEventListener('click', async () => {
      if (!activeTab || !activeTab.id) return;
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'START_INSPECTOR' });
        window.close(); // Close popup so user can freely click on the page
      } catch (err) {
        alert('Please refresh the web page to activate the inspector.');
      }
    });

    // Refresh Page Scan
    btnRefreshScan.addEventListener('click', () => scanCurrentTab());

    // Search filter
    previewSearch.addEventListener('input', (e) => {
      if (currentCapture) {
        renderTableRows(currentCapture.headers, currentCapture.data, e.target.value);
      }
    });

    // Exports
    btnExportCsv.addEventListener('click', () => handleExport('csv'));
    btnExportExcel.addEventListener('click', () => handleExport('excel'));
    btnExportJson.addEventListener('click', () => handleExport('json'));
    btnCopyClipboard.addEventListener('click', () => handleExport('clipboard'));

    // Upgrade CTA
    btnUpgradeCheckout.addEventListener('click', () => {
      // Directs to your live Lemon Squeezy checkout link
      chrome.tabs.create({
        url: window.MONETIZATION_CONFIG.CHECKOUT_URL
      });
    });

    // License Key Activation
    btnActivateLicense.addEventListener('click', async () => {
      const key = inputLicenseKey.value;
      const res = await window.monetization.activateLicenseKey(key);
      licenseMsg.textContent = res.message;
      licenseMsg.className = `status-msg ${res.success ? 'success' : 'error'}`;
      if (res.success) {
        await refreshLicenseStatus();
        if (currentCapture) renderPreview(currentCapture);
      }
    });

    // Sandbox Toggle for instant testing
    toggleSandbox.addEventListener('change', async (e) => {
      await window.monetization.toggleSandboxPro(e.target.checked);
      await refreshLicenseStatus();
      if (currentCapture) renderPreview(currentCapture);
    });
  }

  // Export Data Execution
  async function handleExport(format) {
    if (!currentCapture || !currentCapture.data || currentCapture.data.length === 0) return;

    // Pro Format Check: Excel & JSON are premium formats
    if (!currentStatus.isPro && (format === 'excel' || format === 'json')) {
      alert(`⚡ Direct ${format.toUpperCase()} export is a Pro feature!\n\nFree tier exports standard CSV. Upgrade to Pro for lifetime Excel & JSON downloads for only $9.99 USD (~₹799)!`);
      switchTab('tab-pro');
      return;
    }

    const exportCheck = await window.monetization.checkAndRecordExport(currentCapture.data.length);
    if (!exportCheck.allowed) {
      alert(exportCheck.reason);
      switchTab('tab-pro');
      return;
    }

    const headers = currentCapture.headers;
    const effectiveLimit = exportCheck.effectiveRowCount || currentCapture.data.length;
    const exportData = currentCapture.data.slice(0, effectiveLimit);

    const safeTitle = (currentCapture.title || 'tablesnap-export')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    const filename = `${safeTitle}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csv = toCsv(headers, exportData);
      downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'excel') {
      // Excel-ready TSV format with UTF-8 BOM
      const tsv = toTsv(headers, exportData);
      downloadBlob('\uFEFF' + tsv, `${filename}.tsv`, 'text/tab-separated-values;charset=utf-8;');
    } else if (format === 'json') {
      const json = toJson(headers, exportData);
      downloadBlob(json, `${filename}.json`, 'application/json;charset=utf-8;');
    } else if (format === 'clipboard') {
      const tsv = toTsv(headers, exportData);
      await navigator.clipboard.writeText(tsv);
      btnCopyClipboard.textContent = 'Copied! ✅';
      setTimeout(() => { btnCopyClipboard.textContent = 'Copy'; }, 2000);
    }
  }

  // CSV Formatter (RFC 4180 compliant)
  function toCsv(headers, rows) {
    const escapeCsv = (str) => {
      const s = String(str ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headerLine = headers.map(escapeCsv).join(',');
    const bodyLines = rows.map(r => r.map(escapeCsv).join(','));
    return [headerLine, ...bodyLines].join('\r\n');
  }

  // TSV Formatter (Ideal for direct paste into Excel / Sheets)
  function toTsv(headers, rows) {
    const escapeTsv = (str) => String(str ?? '').replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
    const headerLine = headers.map(escapeTsv).join('\t');
    const bodyLines = rows.map(r => r.map(escapeTsv).join('\t'));
    return [headerLine, ...bodyLines].join('\n');
  }

  // JSON Formatter
  function toJson(headers, rows) {
    const arr = rows.map(row => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h || `col_${idx}`] = row[idx] !== undefined ? row[idx] : '';
      });
      return obj;
    });
    return JSON.stringify(arr, null, 2);
  }

  // Trigger browser file download
  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  init();
});
