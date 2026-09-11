/**
 * TableSnap Content Script
 * Handles table & list inspection, element highlighting, and structured DOM parsing.
 */

(function () {
  let isInspectorActive = false;
  let hoveredElement = null;
  let highlightOverlay = null;
  let elementBadge = null;
  let inspectorBanner = null;
  let rafId = null;

  // Initialize overlay DOM nodes
  function initOverlays() {
    if (!highlightOverlay) {
      highlightOverlay = document.createElement('div');
      highlightOverlay.className = 'tablesnap-overlay-highlight';
      highlightOverlay.style.display = 'none';

      elementBadge = document.createElement('div');
      elementBadge.className = 'tablesnap-element-badge';
      highlightOverlay.appendChild(elementBadge);

      document.documentElement.appendChild(highlightOverlay);
    }
  }

  // Find best data container for an element
  function findDataContainer(target) {
    if (!target || target === document.body || target === document.documentElement) {
      return null;
    }

    // 1. Table element (or ancestor table)
    const table = target.closest('table');
    if (table) return { element: table, type: 'Table' };

    // 2. Standard lists
    const list = target.closest('ul, ol');
    if (list && list.children.length >= 2) {
      return { element: list, type: 'List' };
    }

    // 3. Repeated card container detection
    // Find parent container where multiple siblings share similar tag/class structure
    let current = target;
    for (let depth = 0; depth < 4 && current && current !== document.body; depth++) {
      const parent = current.parentElement;
      if (parent && parent.children.length >= 3) {
        // Check if siblings have similar class names or tag names
        const tag = current.tagName;
        const matchingSiblings = Array.from(parent.children).filter(c => c.tagName === tag);
        if (matchingSiblings.length >= 3) {
          return { element: parent, type: 'Card Grid' };
        }
      }
      current = parent;
    }

    return null;
  }

  // Update highlight position over element
  function updateHighlight(el, typeName) {
    if (!highlightOverlay) initOverlays();
    if (!el) {
      highlightOverlay.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    highlightOverlay.style.display = 'block';
    highlightOverlay.style.width = `${Math.max(rect.width, 20)}px`;
    highlightOverlay.style.height = `${Math.max(rect.height, 20)}px`;
    highlightOverlay.style.left = `${rect.left + scrollX}px`;
    highlightOverlay.style.top = `${rect.top + scrollY}px`;

    const rowCount = countItems(el, typeName);
    elementBadge.textContent = `${typeName} detected (${rowCount} items) — Click to extract`;
  }

  function countItems(el, typeName) {
    if (typeName === 'Table') {
      return el.querySelectorAll('tr').length;
    }
    if (typeName === 'List') {
      return el.children.length;
    }
    return el.children.length;
  }

  // Mousemove handler for inspector
  function onMouseMove(e) {
    if (!isInspectorActive) return;
    if (e.target.closest('#tablesnap-inspector-banner, .tablesnap-overlay-highlight')) {
      return;
    }

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const containerInfo = findDataContainer(e.target);
      if (containerInfo) {
        hoveredElement = containerInfo;
        updateHighlight(containerInfo.element, containerInfo.type);
      } else {
        hoveredElement = null;
        if (highlightOverlay) highlightOverlay.style.display = 'none';
      }
    });
  }

  // Click handler to select element
  function onClick(e) {
    if (!isInspectorActive) return;
    if (e.target.closest('#tablesnap-inspector-banner')) return;

    e.preventDefault();
    e.stopPropagation();

    if (hoveredElement) {
      const extracted = parseElementData(hoveredElement.element, hoveredElement.type);
      saveAndNotifyCapture(extracted);
      stopInspector();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && isInspectorActive) {
      stopInspector();
      showToast('TableSnap: Inspector cancelled.');
    }
  }

  // Parse HTML Table
  function parseTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return { headers: [], data: [] };

    let headers = [];
    let dataRows = [];

    // Extract headers
    const thElements = Array.from(table.querySelectorAll('th'));
    if (thElements.length > 0) {
      headers = thElements.map(th => cleanText(th.innerText) || 'Column');
    }

    // Process rows
    rows.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      // If this row is pure headers and we already have headers, skip it
      const isHeaderRow = cells.every(c => c.tagName.toLowerCase() === 'th');
      if (isHeaderRow && headers.length > 0) return;

      const rowValues = cells.map(cell => {
        // Also capture links if cell contains a link
        const link = cell.querySelector('a');
        const text = cleanText(cell.innerText);
        if (link && link.href && !text.includes(link.href)) {
          return `${text} (${link.href})`;
        }
        return text;
      });

      if (rowValues.some(v => v !== '')) {
        dataRows.push(rowValues);
      }
    });

    // If no explicit <th> headers found, use first row as headers
    if (headers.length === 0 && dataRows.length > 0) {
      headers = dataRows.shift();
    }

    // Normalize column count
    const maxCols = Math.max(headers.length, ...dataRows.map(r => r.length), 1);
    while (headers.length < maxCols) {
      headers.push(`Column ${headers.length + 1}`);
    }

    return { headers, data: dataRows };
  }

  // Parse Lists / Card Grids
  function parseCardsOrList(container, typeName) {
    const items = Array.from(container.children);
    if (items.length === 0) return { headers: ['Item'], data: [] };

    if (typeName === 'List') {
      const headers = ['Item'];
      const data = items.map(li => [cleanText(li.innerText)]).filter(r => r[0] !== '');
      return { headers, data };
    }

    // Card grid: extract structured attributes across items
    const sample = items[0];
    const propertyExtractors = [];

    // Check for title/heading
    if (sample.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]')) {
      propertyExtractors.push({
        name: 'Title/Name',
        selector: 'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]'
      });
    }

    // Check for price
    if (sample.querySelector('[class*="price"], [class*="cost"], [class*="amount"]')) {
      propertyExtractors.push({
        name: 'Price',
        selector: '[class*="price"], [class*="cost"], [class*="amount"]'
      });
    }

    // Check for link
    if (sample.querySelector('a[href]')) {
      propertyExtractors.push({
        name: 'Link',
        selector: 'a[href]',
        attr: 'href'
      });
    }

    // Check for image
    if (sample.querySelector('img[src]')) {
      propertyExtractors.push({
        name: 'Image',
        selector: 'img[src]',
        attr: 'src'
      });
    }

    // Fallback: If no recognized structure, just grab primary text
    if (propertyExtractors.length === 0) {
      return {
        headers: ['Content'],
        data: items.map(c => [cleanText(c.innerText)]).filter(r => r[0] !== '')
      };
    }

    const headers = propertyExtractors.map(p => p.name);
    const data = items.map(item => {
      return propertyExtractors.map(prop => {
        const target = item.querySelector(prop.selector);
        if (!target) return '';
        if (prop.attr) return target.getAttribute(prop.attr) || '';
        return cleanText(target.innerText);
      });
    });

    return { headers, data };
  }

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  function parseElementData(element, typeName) {
    let result;
    if (typeName === 'Table') {
      result = parseTable(element);
    } else {
      result = parseCardsOrList(element, typeName);
    }

    return {
      title: document.title || 'Extracted Data',
      sourceUrl: window.location.href,
      type: typeName,
      extractedAt: new Date().toISOString(),
      headers: result.headers,
      data: result.data,
      rowCount: result.data.length,
      colCount: result.headers.length
    };
  }

  // Save extracted data to local storage and trigger notifications
  async function saveAndNotifyCapture(captureData) {
    await chrome.storage.local.set({ tablesnap_active_capture: captureData });
    showToast(`✅ Captured ${captureData.rowCount} rows & ${captureData.colCount} columns! Click TableSnap to export.`);
    chrome.runtime.sendMessage({ action: 'CAPTURE_SAVED', count: captureData.rowCount }).catch(() => {});
  }

  // Toast feedback element
  function showToast(message) {
    let toast = document.getElementById('tablesnap-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tablesnap-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'flex';

    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.style.display = 'none';
      }
    }, 4500);
  }

  // Start Inspector mode
  function startInspector() {
    if (isInspectorActive) return;
    isInspectorActive = true;
    initOverlays();

    // Create top floating banner
    if (!inspectorBanner) {
      inspectorBanner = document.createElement('div');
      inspectorBanner.id = 'tablesnap-inspector-banner';
      inspectorBanner.innerHTML = `
        <span class="tablesnap-pulse-dot"></span>
        <span><strong>TableSnap Inspector:</strong> Hover over any table or list, then click to grab.</span>
        <button id="tablesnap-cancel-btn">Cancel (ESC)</button>
      `;
      document.body.appendChild(inspectorBanner);

      document.getElementById('tablesnap-cancel-btn').addEventListener('click', () => {
        stopInspector();
      });
    } else {
      inspectorBanner.style.display = 'flex';
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('click', onClick, { capture: true });
    window.addEventListener('keydown', onKeyDown);
  }

  // Stop Inspector mode
  function stopInspector() {
    isInspectorActive = false;
    hoveredElement = null;
    if (highlightOverlay) highlightOverlay.style.display = 'none';
    if (inspectorBanner) inspectorBanner.style.display = 'none';

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onClick, { capture: true });
    window.removeEventListener('keydown', onKeyDown);
  }

  // Scan current page for all tables and data containers
  function scanPage() {
    const tables = Array.from(document.querySelectorAll('table')).map((t, idx) => {
      const rows = t.querySelectorAll('tr').length;
      const headers = Array.from(t.querySelectorAll('th')).map(th => cleanText(th.innerText)).filter(Boolean);
      return {
        id: `table-${idx}`,
        type: 'Table',
        name: headers.slice(0, 3).join(', ') || `Table #${idx + 1}`,
        rowCount: rows,
        selector: `table:nth-of-type(${idx + 1})`
      };
    });

    const lists = Array.from(document.querySelectorAll('ul, ol'))
      .filter(l => l.children.length >= 4)
      .slice(0, 5)
      .map((l, idx) => ({
        id: `list-${idx}`,
        type: 'List',
        name: `List (${l.children.length} items)`,
        rowCount: l.children.length,
        selector: `${l.tagName.toLowerCase()}:nth-of-type(${idx + 1})`
      }));

    return [...tables, ...lists];
  }

  // Auto-scan on load to update extension badge if tables exist
  const initialTables = document.querySelectorAll('table').length;
  if (initialTables > 0) {
    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', count: initialTables }).catch(() => {});
  }

  // Message listener for popup commands
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        if (message.action === 'START_INSPECTOR') {
          startInspector();
          sendResponse({ success: true });
          return;
        }

        if (message.action === 'STOP_INSPECTOR') {
          stopInspector();
          sendResponse({ success: true });
          return;
        }

        if (message.action === 'SCAN_PAGE') {
          const items = scanPage();
          sendResponse({ success: true, items });
          return;
        }

        if (message.action === 'EXTRACT_SELECTOR') {
          const el = document.querySelector(message.selector);
          if (el) {
            const containerInfo = findDataContainer(el) || { element: el, type: el.tagName === 'TABLE' ? 'Table' : 'List' };
            const extracted = parseElementData(containerInfo.element, containerInfo.type);
            await saveAndNotifyCapture(extracted);
            sendResponse({ success: true, extracted });
          } else {
            sendResponse({ success: false, error: 'Element not found' });
          }
          return;
        }

        sendResponse({ success: false, error: 'Unknown action' });
      } catch (err) {
        console.error('Content script message error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep channel open for async response
  });
})();
