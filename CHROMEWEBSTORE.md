# Chrome Web Store Listing — TableSnap

> Last Updated: 2026-09-10

## Store Listing

**Extension Name** [REQUIRED]
TableSnap - Instant Web Table & Data Scraper

**Short Description** [REQUIRED]
Extract tables, lists, and repeated card grids from any webpage into CSV, Excel, or JSON with 1 click. 100% private and client-side.

**Detailed Description** [REQUIRED]
TableSnap is the fastest, cleanest way to extract tables, lists, and repeated card grids from any website directly into Excel, CSV, or Google Sheets with a single click.

Whether you are conducting market research, gathering lead lists, analyzing financial tables, comparing e-commerce product prices, or archiving data, TableSnap removes the friction of manual copy-pasting.

KEY FEATURES
- Hover-to-Inspect: Simply hover your cursor over any table or list to see an instant bounding outline, then click to extract.
- Universal Extraction: Seamlessly works with standard HTML tables (thead/tbody), ordered/unordered lists, and complex repeated card grids (like Amazon product cards or job board listings).
- Clean Spreadsheet Formats: 1-click export to CSV (RFC 4180 compliant), Excel (.tsv format with UTF-8 BOM that opens cleanly in Excel without formatting errors), or JSON.
- Direct Clipboard Copy: Copy formatted tabular data with a single button and paste directly into Google Sheets or Microsoft Excel with intact columns.
- Live Data Preview: Filter and search through extracted rows before downloading.
- 100% Private & Client-Side: Zero server uploads. Extracted data never leaves your computer.

HOW TO USE
1. Navigate to any webpage containing a table, catalog, or list.
2. Click the TableSnap extension icon from your browser toolbar.
3. Click "Inspect & Click Element on Page" and click any table or grid.
4. Preview the structured data in TableSnap and click "Export CSV" or "Copy".

PRIVACY & PERMISSIONS
TableSnap runs entirely on your local machine. It does not send any page content, personal data, or URLs to external servers. Permissions are requested strictly to read DOM elements on the active tab when you explicitly trigger the scraper.

SUPPORT & FEEDBACK
Questions or feature requests? Contact support@tablesnap.dev.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Extracts tabular data and lists from web pages into CSV, Excel, and JSON formats directly on the user's local device.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ To capture | Store screenshot of hovering table on test-page.html |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To capture | Store screenshot of preview table & CSV export |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To capture | Store screenshot of Pro upgrade modal & features |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ To capture | Promo banner with TableSnap logo |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Required to inspect DOM elements and extract table contents only on the tab currently focused by the user. |
| `storage` | permissions | Required to store user license preferences and temporarily cache active table previews locally on the device. |
| `scripting` | permissions | Required to programmatically attach the visual hover-inspector outline to the webpage when the user clicks Inspect. |
| `<all_urls>` | host_permissions | Required so users can inspect and scrape tables across any public website they visit. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

TableSnap runs 100% client-side. No user data, web history, page content, or credentials are collected or transmitted off-device.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**: Host `privacy-policy.html` on GitHub Pages (e.g., `https://your-username.github.io/tablesnap/privacy-policy.html`) or your custom domain.

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free to install (Freemium with in-app Pro upgrade via Stripe/ExtensionPay or Gumroad)

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-10 | Initial release: table inspector, card parser, CSV/Excel/JSON export, Pro monetization engine | Ready to Publish |
