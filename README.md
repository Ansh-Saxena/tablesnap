# TableSnap ⚡ — Web Table & Data Scraper Chrome Extension

TableSnap is a production-ready, Manifest V3 Chrome Extension that scrapes HTML tables, lists, and repeated card grids from any webpage into CSV, Excel, or JSON with 1 click.

It is engineered with a **zero-server-cost architecture** ($0/month hosting bills) and built-in **freemium monetization** (Free vs. $19 Pro license) for automated passive income.

---

## 🚀 Quick Start: Load into Google Chrome in 30 Seconds

1. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```
2. In the top right corner, switch on **Developer mode**.
3. Click the **Load unpacked** button in the top left.
4. Select the TableSnap folder:
   ```
   C:\Users\XRIG\.gemini\antigravity\scratch\tablesnap-extension
   ```
5. Pin **TableSnap** to your Chrome toolbar by clicking the puzzle icon.

---

## 🧪 Testing with the Built-in Testbench

1. In Chrome, press `Ctrl + O` (or drag and drop into Chrome) to open:
   ```
   C:\Users\XRIG\.gemini\antigravity\scratch\tablesnap-extension\test-page.html
   ```
2. Click the **TableSnap** extension icon in your browser toolbar.
3. Click **"Inspect & Click Element on Page"**:
   - Hover over the **S&P 500 Market Movers table** — notice the emerald highlight box and item count badge.
   - Click to extract the table!
4. Reopen TableSnap:
   - See the structured table preview, column headers, and row statistics.
   - Notice the **Free Tier Limit banner** (showing the first 25 of 35 rows).
   - Test **Export CSV** (downloads clean RFC 4180 CSV) or **Copy** (paste directly into Google Sheets or Excel).
5. Test **Instant Pro Unlock**:
   - Go to the **Pro Plan** tab in TableSnap.
   - Switch on the **Developer Sandbox** toggle (or type license key `TEST-PRO` and click Activate).
   - Return to the **Data** tab — notice all 35 rows are instantly unlocked!

---

## 💰 How Monetization & Passive Income Works

TableSnap has a pre-wired freemium monetization system:
* **Free Users**: Limited to 25 rows per export and 5 exports per day.
* **Pro Users (₹1,499 lifetime)**: Unlimited rows, card grid recognition, and priority export.

### Connected Payment Integration:

Your extension is now connected to your live Lemon Squeezy checkout:
**Product Checkout:** [TableSnap Pro Checkout](https://hopelessiam07.lemonsqueezy.com/checkout/buy/918af369-03bc-40d2-8018-711bf68cbd29)
* Payments are collected in USD (with automatic global currency conversion).
* License keys are issued automatically upon purchase.
* Payouts are routed directly to your Indian bank account via Lemon Squeezy!

---

## 📦 How to Publish to the Chrome Web Store

1. Review `CHROMEWEBSTORE.md` in this directory — it contains the pre-written store listing title, description, privacy policy, and permissions justification ready to paste into the Chrome Developer Dashboard.
2. Zip the extension contents:
   - Exclude `.git`, `test-page.html`, and `README.md`.
   - Include `manifest.json`, `service-worker.js`, `icons/`, `popup/`, `content/`, and `lib/`.
3. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Pay the one-time $5 Google developer registration fee.
5. Click **New Item**, upload your `.zip` file, paste the copy from `CHROMEWEBSTORE.md`, and click **Submit for Review**.
