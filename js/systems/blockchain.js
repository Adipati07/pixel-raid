/* ========================================
 * PIXEL RAID — Blockchain Bridge
 * Wallet connection & NFT interaction
 * ======================================== */

const BlockchainBridge = {
    // Contract config (BSC Testnet for demo)
    CONTRACT_ADDRESS: '0xFB44693a41CaFAa2CfeDb7694A2b7F70A41F7C13', // V2 verified on BSC testnet (BSCscan)
    BSC_CHAIN_ID: '0x61',        // BSC Testnet: 97 (matches V2 deploy)
    BSC_TESTNET_CHAIN_ID: '0x61', // alias, kept for clarity
    
    // State
    provider: null,
    signer: null,
    contract: null,
    account: null,
    isConnected: false,
    isCorrectChain: false,

    // ABI (minimal for our contract)
    ABI: [
        'function mintCard(address to, string name, string className, string rarity, uint256 hp, uint256 atk, uint256 def, uint256 spd, uint256 crit, string skillName, string skillType, uint256 skillValue, uint256 artSeed) returns (uint256)',
        'function levelUpCard(uint256 tokenId)',
        'function updateCardExp(uint256 tokenId, uint256 newExp)',
        'function listCard(uint256 tokenId, uint256 price)',
        'function buyCard(uint256 tokenId) payable',
        'function cancelListing(uint256 tokenId)',
        'function getCardData(uint256 tokenId) view returns (tuple(string name, string className, string rarity, uint256 hp, uint256 atk, uint256 def, uint256 spd, uint256 crit, string skillName, string skillType, uint256 skillValue, uint256 level, uint256 exp, uint256 artSeed, uint256 createdAt))',
        'function totalCards() view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function balanceOf(address owner) view returns (uint256)',
        'event CardMinted(uint256 indexed tokenId, address indexed owner, string name, string rarity)',
        'event CardListed(uint256 indexed tokenId, uint256 price, address seller)',
        'event CardSold(uint256 indexed tokenId, uint256 price, address seller, address buyer)',
    ],

    /**
     * Initialize — check if MetaMask is available
     */
    init() {
        if (typeof window.ethereum === 'undefined') {
            console.warn('⚠️ MetaMask not detected');
            this.updateUI('not-installed');
            return false;
        }
        console.log('✅ MetaMask detected');
        this.updateUI('disconnected');
        return true;
    },

    /**
     * Connect wallet
     */
    async connect() {
        console.log('🔌 BlockchainBridge.connect() called');
        try {
            if (!window.ethereum) {
                console.error('❌ window.ethereum not found');
                alert('Please install MetaMask first!');
                window.open('https://metamask.io/', '_blank');
                return false;
            }

            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.account = accounts[0];
            console.log('✅ Got account:', this.account);
            this.provider = new ethers.BrowserProvider(window.ethereum);
            console.log('✅ Provider created'); // ethers v6 (was .providers.Web3Provider in v5)
            this.signer = await this.provider.getSigner();

            // Check chain (non-blocking — if fails, still connect wallet)
            try {
                await this.checkAndSwitchChain();
            } catch (chainErr) {
                console.warn('⚠️ Chain switch failed:', chainErr.message);
            }

            // Initialize contract
            if (this.CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
                this.contract = new ethers.Contract(this.CONTRACT_ADDRESS, this.ABI, this.signer);
            }

            this.isConnected = true;
            console.log('✅ isConnected=true, calling updateUI');
            this.updateUI('connected');
            console.log('✅ updateUI called');

            // Sync wallet to Supabase backend
            if (typeof Backend !== 'undefined' && Backend.supabase) {
                Backend.connectWallet(this.account).then(result => {
                    if (result.success) {
                        console.log('☁️ Backend synced:', result.isNew ? 'new player' : 'loaded');
                    }
                });
            }

            // Listen for account/chain changes
            window.ethereum.on('accountsChanged', (accounts) => {
                this.account = accounts[0] || null;
                if (!this.account) this.disconnect();
                else this.updateUI('connected');
            });

            window.ethereum.on('chainChanged', () => window.location.reload());

            console.log('✅ Wallet connected:', this.account);
            return true;

        } catch (error) {
            console.error('❌ Connection failed:', error);
            this.updateUI('error', error.message);
            return false;
        }
    },

    /**
     * Disconnect wallet
     */
    async disconnect() {
        // Actually revoke MetaMask permissions so it truly disconnects
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
            } catch (e) {
                console.warn('⚠️ revokePermissions failed (non-critical):', e.message);
            }
        }
        this.account = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.isConnected = false;
        this.updateUI('disconnected');
        console.log('👋 Wallet disconnected');
    },

    /**
     * Check and switch to BSC network
     */
    async checkAndSwitchChain() {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const targetChainId = this.BSC_CHAIN_ID; // BSC Testnet (97), see const above

        if (chainId !== targetChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }],
                });
                this.isCorrectChain = true;
            } catch (switchError) {
                // Chain not added, try to add it
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: targetChainId,
                            chainName: 'BNB Smart Chain Testnet',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-testnet-rpc.publicnode.com', 'https://data-seed-prebsc-1-s1.binance.org/'],
                            blockExplorerUrls: ['https://testnet.bscscan.com/'],
                        }],
                    });
                    this.isCorrectChain = true;
                } else {
                    throw switchError;
                }
            }
        } else {
            this.isCorrectChain = true;
        }
    },

    /**
     * Mint a card as NFT
     */
    async mintCard(card) {
        if (!this.isConnected || !this.contract) {
            console.error('Not connected');
            return null;
        }

        try {
            this.updateUI('minting');

            const tx = await this.contract.mintCard(
                this.account,
                card.name,
                card.class,
                card.rarity,
                card.stats.hp,
                card.stats.atk,
                card.stats.def,
                card.stats.spd,
                card.stats.crit,
                card.skill.name,
                card.skill.type,
                card.skill.val,
                card.artSeed
            );

            console.log('📝 Mint tx:', tx.hash);
            const receipt = await tx.wait();
            
            // Extract token ID from event (ethers v6 uses logs + parseLog, not receipt.events[name].args)
            const iface = new ethers.Interface(this.ABI);
            let tokenId = null;
            for (const log of (receipt.logs || [])) {
                try {
                    const parsed = iface.parseLog(log);
                    if (parsed && parsed.name === 'CardMinted') {
                        tokenId = Number(parsed.args.tokenId); // v6 returns BigInt
                        break;
                    }
                } catch (_) { /* skip non-matching logs */ }
            }

            console.log('✅ Card minted! Token ID:', tokenId);
            this.updateUI('minted', tokenId);

            return tokenId;

        } catch (error) {
            console.error('❌ Mint failed:', error);
            this.updateUI('error', error.message);
            return null;
        }
    },

    /**
     * Level up a card on-chain
     */
    async levelUpCard(tokenId) {
        if (!this.isConnected || !this.contract) return null;

        try {
            const tx = await this.contract.levelUpCard(tokenId);
            await tx.wait();
            console.log('✅ Card leveled up! Token ID:', tokenId);
            return true;
        } catch (error) {
            console.error('❌ Level up failed:', error);
            return null;
        }
    },

    /**
     * List card for sale
     */
    async listCard(tokenId, priceInBnb) {
        if (!this.isConnected || !this.contract) return null;

        try {
            const priceWei = ethers.parseEther(priceInBnb.toString()); // v6: ethers.utils → ethers
            const tx = await this.contract.listCard(tokenId, priceWei);
            await tx.wait();
            console.log('✅ Card listed! Token ID:', tokenId, 'Price:', priceInBnb, 'BNB');
            return true;
        } catch (error) {
            console.error('❌ List failed:', error);
            return null;
        }
    },

    /**
     * Buy a listed card
     */
    async buyCard(tokenId, priceInBnb) {
        if (!this.isConnected || !this.contract) return null;

        try {
            const priceWei = ethers.parseEther(priceInBnb.toString()); // v6: ethers.utils → ethers
            const tx = await this.contract.buyCard(tokenId, { value: priceWei });
            await tx.wait();
            console.log('✅ Card bought! Token ID:', tokenId);
            return true;
        } catch (error) {
            console.error('❌ Buy failed:', error);
            return null;
        }
    },

    /**
     * Get card data from chain
     */
    async getCardData(tokenId) {
        if (!this.contract) return null;

        try {
            const data = await this.contract.getCardData(tokenId);
            return {
                name: data.name,
                class: data.className,
                rarity: data.rarity,
                stats: {
                    hp: Number(data.hp),  // v6: BigInt → Number
                    atk: Number(data.atk),
                    def: Number(data.def),
                    spd: Number(data.spd),
                    crit: Number(data.crit),
                },
                skill: {
                    name: data.skillName,
                    type: data.skillType,
                    val: Number(data.skillValue),
                },
                level: Number(data.level),
                exp: Number(data.exp),
                artSeed: Number(data.artSeed),
                createdAt: Number(data.createdAt),
            };
        } catch (error) {
            console.error('❌ Get card data failed:', error);
            return null;
        }
    },

    /**
     * Get player's NFT balance
     */
    async getMyCards() {
        if (!this.isConnected || !this.contract) return [];

        try {
            const balance = await this.contract.balanceOf(this.account);
            const cards = [];

            // V2 inherits ERC721Enumerable, so tokenOfOwnerByIndex exists.
            // Stable across transfers — works even if user traded NFT
            // to / from this wallet. (Confirmed: V2.sol imports
            // ERC721Enumerable.sol.)
            const balanceCount = Number(balance);
            for (let i = 0; i < balanceCount; i++) {
                const tokenId = await this.contract.tokenOfOwnerByIndex(this.account, i);
                const data = await this.getCardData(tokenId);
                if (data && data.name) cards.push({ tokenId, ...data });
            }

            return cards;
        } catch (error) {
            console.error('❌ Get cards failed:', error);
            return [];
        }
    },

    /**
     * Sync local card to blockchain
     */
    async syncCardToChain(localCard) {
        if (!this.isConnected) return null;

        // Mint the card
        const tokenId = await this.mintCard(localCard);
        if (!tokenId) return null;

        // Update local card with token ID
        localCard.tokenId = tokenId;
        localCard.onChain = true;

        return tokenId;
    },

    /**
     * Update UI based on connection state
     */
    updateUI(state, data) {
        const connectBtn = document.getElementById('btn-connect-wallet');
        const walletInfo = document.getElementById('wallet-info');
        const walletAddress = document.getElementById('wallet-address');
        const walletStatus = document.getElementById('wallet-status');

        if (!connectBtn) return;

        switch (state) {
            case 'not-installed':
                connectBtn.textContent = '🦊 Install MetaMask';
                connectBtn.onclick = () => window.open('https://metamask.io/', '_blank');
                if (walletStatus) walletStatus.textContent = 'MetaMask not found';
                break;

            case 'disconnected':
                connectBtn.textContent = '🦊 Connect Wallet';
                connectBtn.classList.remove('connected');
                connectBtn.onclick = () => this.connect();
                if (walletInfo) walletInfo.style.display = 'none';
                if (walletStatus) walletStatus.textContent = 'Not connected';
                break;

            case 'connected':
                connectBtn.textContent = '✅ Connected';
                connectBtn.classList.add('connected');
                connectBtn.onclick = () => this.disconnect();
                if (walletInfo) walletInfo.style.display = 'block';
                if (walletAddress) walletAddress.textContent = 
                    `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
                if (walletStatus) walletStatus.textContent = 'Connected to BSC';
                break;

            case 'minting':
                connectBtn.textContent = '⏳ Minting...';
                if (walletStatus) walletStatus.textContent = 'Minting NFT...';
                break;

            case 'minted':
                connectBtn.textContent = '✅ Connected';
                if (walletStatus) walletStatus.textContent = `Card #${data} minted!`;
                break;

            case 'error':
                connectBtn.textContent = '❌ Error';
                if (walletStatus) walletStatus.textContent = data || 'Unknown error';
                setTimeout(() => this.updateUI(this.isConnected ? 'connected' : 'disconnected'), 3000);
                break;
        }
    },
};

// Auto-init when DOM ready (with fallback for late-loading scripts)
function _initBlockchain() {
    if (!BlockchainBridge._inited) {
        BlockchainBridge._inited = true;
        BlockchainBridge.init();
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initBlockchain);
} else {
    _initBlockchain();
}
