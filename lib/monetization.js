/**
 * TableSnap Monetization & License Engine
 * Connected to Lemon Squeezy Checkout & License Keys
 */

const MONETIZATION_CONFIG = {
  FREE_ROW_LIMIT: 15,
  FREE_DAILY_EXPORT_LIMIT: 3,
  PRO_PRICE_ONE_TIME: '$9.99 USD (~₹799)',
  CHECKOUT_URL: 'https://hopelessiam07.lemonsqueezy.com/checkout/buy/918af369-03bc-40d2-8018-711bf68cbd29',
  SUPPORT_EMAIL: 'support@tablesnap.dev'
};

class MonetizationManager {
  constructor() {
    this.config = MONETIZATION_CONFIG;
  }

  /**
   * Get current user license and quota state
   */
  async getStatus() {
    const data = await chrome.storage.local.get([
      'tablesnap_is_pro',
      'tablesnap_license_key',
      'tablesnap_sandbox_pro',
      'tablesnap_daily_usage'
    ]);

    const isSandboxPro = Boolean(data.tablesnap_sandbox_pro);
    const hasLicense = Boolean(data.tablesnap_is_pro);
    const isPro = isSandboxPro || hasLicense;

    // Check daily usage quota for free users
    const today = new Date().toISOString().slice(0, 10);
    const usage = data.tablesnap_daily_usage || { date: today, count: 0 };
    const dailyCount = usage.date === today ? usage.count : 0;

    return {
      isPro,
      isSandboxPro,
      licenseKey: data.tablesnap_license_key || '',
      dailyExportsUsed: dailyCount,
      dailyExportsRemaining: Math.max(0, this.config.FREE_DAILY_EXPORT_LIMIT - dailyCount),
      rowLimit: isPro ? Infinity : this.config.FREE_ROW_LIMIT,
      config: this.config
    };
  }

  /**
   * Record an export event and enforce limits for free users
   * @param {number} rowCount 
   * @returns {Promise<{ allowed: boolean, reason?: string, effectiveRowCount?: number, isPro: boolean, truncated: boolean }>}
   */
  async checkAndRecordExport(rowCount) {
    const status = await this.getStatus();

    if (status.isPro) {
      return { allowed: true, effectiveRowCount: rowCount, originalRowCount: rowCount, isPro: true, truncated: false };
    }

    // Check daily export limit
    if (status.dailyExportsUsed >= this.config.FREE_DAILY_EXPORT_LIMIT) {
      return {
        allowed: false,
        reason: `Daily export limit reached (${this.config.FREE_DAILY_EXPORT_LIMIT}/${this.config.FREE_DAILY_EXPORT_LIMIT}). Upgrade to Pro for unlimited exports!`,
        isPro: false
      };
    }

    // Update usage count
    const today = new Date().toISOString().slice(0, 10);
    const newCount = status.dailyExportsUsed + 1;
    await chrome.storage.local.set({
      tablesnap_daily_usage: { date: today, count: newCount }
    });

    const isTruncated = rowCount > this.config.FREE_ROW_LIMIT;
    return {
      allowed: true,
      isPro: false,
      truncated: isTruncated,
      effectiveRowCount: isTruncated ? this.config.FREE_ROW_LIMIT : rowCount,
      originalRowCount: rowCount,
      exportsRemaining: Math.max(0, this.config.FREE_DAILY_EXPORT_LIMIT - newCount)
    };
  }

  /**
   * Toggle Sandbox Pro mode for testing
   */
  async toggleSandboxPro(enable) {
    await chrome.storage.local.set({ tablesnap_sandbox_pro: Boolean(enable) });
    return this.getStatus();
  }

  /**
   * Activate license key (supports Lemon Squeezy, Gumroad, or test keys)
   */
  async activateLicenseKey(key) {
    const trimmed = (key || '').trim();
    if (!trimmed) {
      return { success: false, message: 'Please enter a valid license key.' };
    }

    // Test bypass key
    if (trimmed.toUpperCase() === 'TEST-PRO' || trimmed.toUpperCase().startsWith('TS-PRO-')) {
      await chrome.storage.local.set({
        tablesnap_is_pro: true,
        tablesnap_license_key: trimmed
      });
      return { success: true, message: 'Pro license activated successfully!' };
    }

    // Attempt live verification with Lemon Squeezy API
    try {
      const formData = new FormData();
      formData.append('license_key', trimmed);

      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.valid) {
          await chrome.storage.local.set({
            tablesnap_is_pro: true,
            tablesnap_license_key: trimmed
          });
          return { success: true, message: 'Lemon Squeezy license verified & Pro activated!' };
        } else {
          return { success: false, message: result.error || 'Invalid or expired license key.' };
        }
      }
    } catch (err) {
      console.warn('Live license verification network error, fallback to offline format check:', err);
    }

    // Fallback validation: Lemon Squeezy UUID format or standard license key >= 10 chars
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmed) || trimmed.length >= 10) {
      await chrome.storage.local.set({
        tablesnap_is_pro: true,
        tablesnap_license_key: trimmed
      });
      return { success: true, message: 'Pro license activated successfully!' };
    }

    return { 
      success: false, 
      message: 'Invalid license key format. Please paste the key from your Lemon Squeezy receipt.' 
    };
  }

  /**
   * Deactivate current license
   */
  async deactivateLicense() {
    await chrome.storage.local.remove(['tablesnap_is_pro', 'tablesnap_license_key']);
    return this.getStatus();
  }
}

// Export singleton instance
const monetization = new MonetizationManager();
if (typeof window !== 'undefined') {
  window.monetization = monetization;
  window.MONETIZATION_CONFIG = MONETIZATION_CONFIG;
}
