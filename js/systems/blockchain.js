/* ========================================
 * PIXEL RAID — Blockchain Bridge
 * Wallet connection & NFT interaction
 * ======================================== */

const BlockchainBridge = {
    // Contract config (BSC Testnet for demo)
    CONTRACT_ADDRESS: '0xB96eFfe282b5a8B71895CCF83fA4792A0f0933AC', // BSC testnet (deployed, verified)
    BSC_CHAIN_ID: '0x38',        // BSC Mainnet: 56
    BSC_TESTNET_CHAIN_ID: '0x61', // BSC Testnet: 97
    
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
        try {
            if (!window.ethereum) {
                alert('Please install MetaMask first!');
                window.open('https://metamask.io/', '_blank');
                return false;
            }

            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.account = accounts[0];
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // Check chain
            await this.checkAndSwitchChain();

            // Initialize contract
            if (this.CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
                this.contract = new ethers.Contract(this.CONTRACT_ADDRESS, this.ABI, this.signer);
            }

            this.isConnected = true;
            this.updateUI('connected');

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
    disconnect() {
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
        const targetChainId = this.BSC_CHAIN_ID; // Use BSC Mainnet

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
                            chainName: 'BNB Smart Chain',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-dataseed.binance.org/'],
                            blockExplorerUrls: ['https://bscscan.com/'],
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
            
            // Extract token ID from event
            const event = receipt.events.find(e => e.event === 'CardMinted');
            const tokenId = event.args.tokenId.toNumber();

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
            const priceWei = ethers.utils.parseEther(priceInBnb.toString());
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
            const priceWei = ethers.utils.parseEther(priceInBnb.toString());
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
                    hp: data.hp.toNumber(),
                    atk: data.atk.toNumber(),
                    def: data.def.toNumber(),
                    spd: data.spd.toNumber(),
                    crit: data.crit.toNumber(),
                },
                skill: {
                    name: data.skillName,
                    type: data.skillType,
                    val: data.skillValue.toNumber(),
                },
                level: data.level.toNumber(),
                exp: data.exp.toNumber(),
                artSeed: data.artSeed.toNumber(),
                createdAt: data.createdAt.toNumber(),
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

            for (let i = 0; i < balance.toNumber(); i++) {
                // Note: This is simplified. For full enumeration, 
                // we'd need to track token IDs separately
                const tokenId = i + 1; // Simplified
                const data = await this.getCardData(tokenId);
                if (data) cards.push({ tokenId, ...data });
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
                connectBtn.onclick = () => this.connect();
                if (walletInfo) walletInfo.style.display = 'none';
                if (walletStatus) walletStatus.textContent = 'Not connected';
                break;

            case 'connected':
                connectBtn.textContent = '✅ Connected';
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

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    BlockchainBridge.init();
});
