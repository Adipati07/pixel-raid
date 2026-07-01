/* ========================================
 * PIXEL RAID — Renaiss Market Bridge
 * Real-time card data from Renaiss Index API
 * ======================================== */

const RenaissAPI = {
    BASE_URL: 'https://api.renaissos.com',
    // Public tier: 60 req/min, 1000/day per IP

    /**
     * Look up a graded card by cert number
     * @param {string} cert - e.g. "PSA151238633", "BGS123456"
     * @returns {Object} card data with price, grade, images
     */
    async getCardByCert(cert) {
        try {
            const res = await fetch(`${this.BASE_URL}/v1/graded/${encodeURIComponent(cert)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return { success: true, data };
        } catch (err) {
            console.error('❌ Renaiss cert lookup failed:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Look up card by structural tuple
     * @param {Object} params - { set_name, item_no, variation, language }
     * @returns {Object} price tiers for all grading companies
     */
    async getCardByTuple(params) {
        try {
            const query = new URLSearchParams({
                set_name: params.set_name,
                item_no: params.item_no,
                variation: params.variation || '',
                language: params.language || 'en',
            });
            const res = await fetch(`${this.BASE_URL}/v1/index/item-by-no?${query}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return { success: true, data };
        } catch (err) {
            console.error('❌ Renaiss tuple lookup failed:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Search marketplace via Renaiss CLI proxy
     * Falls back to local search if API doesn't support search
     * @param {Object} params - { query, category, character, grading, minPrice, maxPrice, limit }
     */
    async searchMarketplace(params = {}) {
        try {
            // Use CLI output (pre-fetched or cached)
            const defaultParams = { limit: 20, ...params };
            // Marketplace search is via CLI, not REST API
            // Return placeholder for now
            return {
                success: true,
                data: {
                    results: [],
                    note: 'Use CLI: npx renaiss marketplace --search "query" --limit 20 --json'
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Format price from USD cents to readable string
     * @param {number} cents - price in cents
     * @returns {string} formatted price
     */
    formatPrice(cents) {
        if (!cents && cents !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    },

    /**
     * Format price from wei (USDT on-chain) to readable string
     * @param {string} wei - price in wei (18 decimals)
     * @returns {string} formatted price
     */
    formatPriceFromWei(wei) {
        if (!wei) return 'N/A';
        const eth = parseFloat(wei) / 1e18;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(eth);
    },

    /**
     * Get grade color for UI
     * @param {string} grade - e.g. "10 Gem Mint", "9 Mint"
     * @returns {string} hex color
     */
    gradeColor(grade) {
        if (!grade) return '#888';
        if (grade.includes('10')) return '#FFD700'; // Gold
        if (grade.includes('9')) return '#C0C0C0';  // Silver
        if (grade.includes('8')) return '#CD7F32';  // Bronze
        return '#888';
    },

    /**
     * Get game emoji for display
     * @param {string} game - e.g. "one-piece", "pokemon"
     * @returns {string} emoji
     */
    gameEmoji(game) {
        const emojis = {
            'one-piece': '🏴‍☠️',
            'pokemon': '⚡',
            'yu-gi-oh': '🎴',
            'magic': '🔮',
            'dragon-ball': '🐉',
        };
        return emojis[game] || '🃏';
    },
};
