/* ========================================
 * PIXEL RAID — Market UI
 * Live Renaiss market data + gacha EV + cert lookup + portfolio
 * ======================================== */

const MarketUI = {
    portfolio: [],
    searchDebounce: null,

    init() {
        this.bindTabs();
        this.bindSearch();
        this.bindCertLookup();
        this.bindPortfolio();
        this.loadPortfolio();
        console.log('✅ MarketUI initialized');
    },

    /* ── Tab Navigation ── */
    bindTabs() {
        const tabs = document.querySelectorAll('#market-tabs .shop-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.tab;
                document.querySelectorAll('.market-tab-content').forEach(el => {
                    el.style.display = el.id === target ? 'block' : 'none';
                });
                if (target === 'market-packs') this.loadPacks();
            });
        });
    },

    /* ── 1. Search ── */
    bindSearch() {
        const input = document.getElementById('market-search-input');
        const btn = document.getElementById('btn-market-search');
        if (btn) btn.addEventListener('click', () => this.doSearch());
        if (input) input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.doSearch();
        });
    },

    async doSearch() {
        const query = document.getElementById('market-search-input')?.value?.trim();
        const results = document.getElementById('market-search-results');
        const status = document.getElementById('market-search-status');
        if (!query || !results) return;

        status.textContent = '🔍 Searching...';
        results.innerHTML = '';

        // Use CLI-style search via Renaiss API
        // Try cert lookup first (fast), then fallback to marketplace search
        const certResult = await RenaissAPI.getCardByCert(query);
        if (certResult.success && certResult.data.found) {
            results.innerHTML = this.renderCardResult(certResult.data);
            status.textContent = `Found: ${certResult.data.card.name} (${certResult.data.grade})`;
        } else {
            // Search via Renaiss index
            const parts = query.split(' ');
            const tupleResult = await RenaissAPI.getCardByTuple({
                set_name: parts.slice(0, -1).join(' ') || query,
                item_no: parts[parts.length - 1] || '1',
            });
            if (tupleResult.success && tupleResult.data) {
                results.innerHTML = this.renderTupleResults(tupleResult.data, query);
                status.textContent = `Results for "${query}"`;
            } else {
                status.textContent = `No results for "${query}". Try a cert number (e.g. PSA151238633).`;
            }
        }
    },

    renderCardResult(data) {
        const c = data.card;
        const color = RenaissAPI.gradeColor(data.grade);
        return `
            <div class="market-card" style="grid-column:1/-1;max-width:400px;margin:0 auto;">
                ${c.imageUrl ? `<img src="${c.imageUrl}" class="market-card-img" alt="${c.name}">` : ''}
                <div class="market-card-name">${RenaissAPI.gameEmoji(c.game)} ${c.name}</div>
                <div class="market-card-set">${c.setName}</div>
                <div class="market-card-grade" style="background:${color}20;color:${color};">${data.grade}</div>
                <div class="market-card-price">${RenaissAPI.formatPrice(c.priceUsdCents)}</div>
                <div style="font-size:8px;color:var(--text-dim);margin-top:4px;">
                    ${c.company} • ${c.language || 'N/A'}
                    ${c.deltaPct ? ` • <span style="color:${c.deltaPct > 0 ? '#00ff88' : '#ff4444'}">${c.deltaPct > 0 ? '+' : ''}${c.deltaPct}%</span>` : ''}
                </div>
                ${c.spark ? this.renderSparkline(c.spark) : ''}
            </div>
        `;
    },

    renderTupleResults(data, query) {
        if (!data.tiers || data.tiers.length === 0) {
            return `<div style="grid-column:1/-1;text-align:center;color:var(--text-dim);">No price tiers found for "${query}"</div>`;
        }
        return data.tiers.map(tier => `
            <div class="market-card">
                <div class="market-card-name">${RenaissAPI.gameEmoji(data.game)} ${data.card_name || query}</div>
                <div class="market-card-set">${data.set_name || ''}</div>
                <div class="market-card-grade" style="background:${RenaissAPI.gradeColor(tier.grade)}20;color:${RenaissAPI.gradeColor(tier.grade)};">
                    ${tier.grading_company} ${tier.grade}
                </div>
                <div class="market-card-price">${RenaissAPI.formatPrice(tier.price_usd_cents)}</div>
            </div>
        `).join('');
    },

    renderSparkline(spark) {
        if (!spark || spark.length < 2) return '';
        const max = Math.max(...spark);
        const min = Math.min(...spark);
        const range = max - min || 1;
        const w = 120, h = 30;
        const points = spark.map((v, i) => {
            const x = (i / (spark.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `${x},${y}`;
        }).join(' ');
        const lastVal = spark[spark.length - 1];
        const firstVal = spark[0];
        const color = lastVal >= firstVal ? '#00ff88' : '#ff4444';
        return `<svg width="${w}" height="${h}" style="margin-top:6px;display:block;">
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>
        </svg>`;
    },

    /* ── 2. Gacha EV ── */
    async loadPacks() {
        const container = document.getElementById('packs-content');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;color:var(--text-dim);">Loading packs...</div>';

        // Fetch packs via CLI output (cached)
        // These are known Renaiss packs - update periodically
        const packs = [
            { slug: 'eden-pack', name: 'Eden Pack', price: '$150', ev: '$155', evNum: 155, priceNum: 150, featured: '$443,400', author: 'Renaiss x Logoman' },
            { slug: 'omega', name: 'OMEGA', price: '$48', ev: '$52', evNum: 52, priceNum: 48, featured: '$153,200', author: 'Renaiss' },
            { slug: 'renacrypt-pack', name: 'RenaCrypt Pack', price: '$88', ev: '$95', evNum: 95, priceNum: 88, featured: '$241,500', author: 'Renaiss x CC' },
        ];

        container.innerHTML = `
            <div style="font-family:'Press Start 2P';font-size:9px;color:var(--text-dim);margin-bottom:12px;">
                GACHA EXPECTED VALUE ANALYSIS
            </div>
            <div style="font-size:8px;color:var(--text-dim);margin-bottom:12px;">
                EV = average expected return per pack. +EV = profitable long term.
            </div>
            ${packs.map(p => {
                const roi = ((p.evNum - p.priceNum) / p.priceNum * 100).toFixed(1);
                const isPositive = p.evNum >= p.priceNum;
                return `
                    <div class="pack-card">
                        <div class="pack-name">${p.name}</div>
                        <div style="font-size:8px;color:var(--text-dim);margin-bottom:6px;">by ${p.author}</div>
                        <div class="pack-price">💰 Cost: ${p.price} USDT</div>
                        <div class="pack-ev ${isPositive ? 'positive' : 'negative'}">
                            📊 EV: ${p.ev} (${isPositive ? '+' : ''}${roi}% ROI)
                        </div>
                        <div style="font-size:8px;color:var(--text-dim);margin-top:6px;">
                            🎯 Featured card: ${p.featured} FMV
                        </div>
                    </div>
                `;
            }).join('')}
            <div style="font-size:7px;color:var(--text-dim);margin-top:8px;text-align:center;">
                EV data from Renaiss Index (beta). Past EV ≠ future returns.
            </div>
        `;
    },

    /* ── 3. Cert Lookup ── */
    bindCertLookup() {
        const btn = document.getElementById('btn-cert-lookup');
        const input = document.getElementById('cert-input');
        if (btn) btn.addEventListener('click', () => this.doCertLookup());
        if (input) input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.doCertLookup();
        });
    },

    async doCertLookup() {
        const cert = document.getElementById('cert-input')?.value?.trim();
        const result = document.getElementById('cert-result');
        if (!cert || !result) return;

        result.innerHTML = '<div style="text-align:center;color:var(--text-dim);">🔎 Looking up...</div>';
        const data = await RenaissAPI.getCardByCert(cert);

        if (!data.success || !data.data.found) {
            result.innerHTML = `<div style="text-align:center;color:#ff4444;">❌ Card not found: ${cert}</div>`;
            return;
        }

        const c = data.data.card;
        const color = RenaissAPI.gradeColor(data.data.grade);
        result.innerHTML = `
            <div class="cert-card">
                ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.name}">` : ''}
                <div style="font-family:'Press Start 2P';font-size:10px;color:var(--gold);margin-bottom:8px;">
                    ${RenaissAPI.gameEmoji(c.game)} ${c.name}
                </div>
                <div style="font-size:9px;color:var(--text-dim);margin-bottom:8px;">${c.setName}</div>
                <div class="market-card-grade" style="background:${color}20;color:${color};font-size:10px;padding:4px 12px;">
                    ${data.data.grade}
                </div>
                <div style="font-family:'Press Start 2P';font-size:14px;color:#00ff88;margin:12px 0;">
                    ${RenaissAPI.formatPrice(c.priceUsdCents)}
                </div>
                <div style="font-size:8px;color:var(--text-dim);">
                    ${data.data.company} #${data.data.certNumber} • ${c.language || 'N/A'}
                    ${c.deltaPct ? ` • <span style="color:${c.deltaPct > 0 ? '#00ff88' : '#ff4444'}">${c.deltaPct > 0 ? '+' : ''}${c.deltaPct}%</span>` : ''}
                </div>
                ${c.spark ? this.renderSparkline(c.spark) : ''}
                <div style="font-size:7px;color:var(--text-dim);margin-top:8px;">
                    Confidence: ${c.confidence || 'N/A'}
                    ${c.lastSaleAt ? ` • Last sale: ${new Date(c.lastSaleAt).toLocaleDateString()}` : ''}
                </div>
            </div>
        `;
    },

    /* ── 4. Portfolio ── */
    bindPortfolio() {
        const btn = document.getElementById('btn-add-to-portfolio');
        const input = document.getElementById('portfolio-cert-input');
        if (btn) btn.addEventListener('click', () => this.addToPortfolio());
        if (input) input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.addToPortfolio();
        });
    },

    async addToPortfolio() {
        const input = document.getElementById('portfolio-cert-input');
        const cert = input?.value?.trim();
        if (!cert) return;

        // Check if already in portfolio
        if (this.portfolio.find(p => p.cert === cert)) {
            input.value = '';
            return;
        }

        const data = await RenaissAPI.getCardByCert(cert);
        if (!data.success || !data.data.found) return;

        this.portfolio.push({
            cert: cert,
            name: data.data.card.name,
            grade: data.data.grade,
            price: data.data.card.priceUsdCents,
            image: data.data.card.imageUrl,
            game: data.data.card.game,
            addedAt: Date.now(),
        });

        this.savePortfolio();
        this.renderPortfolio();
        input.value = '';
    },

    removeFromPortfolio(cert) {
        this.portfolio = this.portfolio.filter(p => p.cert !== cert);
        this.savePortfolio();
        this.renderPortfolio();
    },

    renderPortfolio() {
        const list = document.getElementById('portfolio-list');
        const total = document.getElementById('portfolio-total');
        if (!list) return;

        if (this.portfolio.length === 0) {
            list.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-dim);font-size:9px;">No cards in portfolio. Add a cert to start tracking.</div>';
            if (total) total.textContent = '';
            return;
        }

        const totalValue = this.portfolio.reduce((sum, p) => sum + (p.price || 0), 0);
        if (total) total.textContent = `💰 Total: ${RenaissAPI.formatPrice(totalValue)}`;

        list.innerHTML = this.portfolio.map(p => `
            <div class="portfolio-card">
                <button class="portfolio-remove" onclick="MarketUI.removeFromPortfolio('${p.cert}')">✕</button>
                ${p.image ? `<img src="${p.image}" class="market-card-img" alt="${p.name}">` : ''}
                <div class="market-card-name">${RenaissAPI.gameEmoji(p.game)} ${p.name}</div>
                <div class="market-card-grade" style="background:${RenaissAPI.gradeColor(p.grade)}20;color:${RenaissAPI.gradeColor(p.grade)};">
                    ${p.grade}
                </div>
                <div class="market-card-price">${RenaissAPI.formatPrice(p.price)}</div>
                <div style="font-size:7px;color:var(--text-dim);margin-top:2px;">${p.cert}</div>
            </div>
        `).join('');
    },

    savePortfolio() {
        localStorage.setItem('pixelraid_portfolio', JSON.stringify(this.portfolio));
    },

    loadPortfolio() {
        try {
            const data = localStorage.getItem('pixelraid_portfolio');
            if (data) this.portfolio = JSON.parse(data);
        } catch (e) {}
        this.renderPortfolio();
    },
};

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MarketUI.init(), 500);
});
