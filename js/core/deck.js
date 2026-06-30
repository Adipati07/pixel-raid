/* ========================================
 * PIXEL RAID — Deck Manager
 * Handles deck building, draw logic, hand management
 * Each hero has 5-8 skill cards in their deck
 * ======================================== */

const DeckManager = {
    // Active deck state during battle
    hero: null,           // active hero card
    deck: [],             // remaining cards to draw (shuffled)
    hand: [],             // cards currently in hand (max 5)
    discard: [],          // used/discarded cards
    equippedCards: [],    // card template ids equipped to hero

    // Max hand size and starting hand
    MAX_HAND: 5,
    STARTING_HAND: 2,
    MAX_DECK_SIZE: 4,
    MIN_DECK_SIZE: 4,

    // ===== DECK BUILDING (Pre-battle) =====

    /**
     * Set up a hero's deck for battle
     * @param {Object} heroCard - The hero card from collection
     * @param {Array} skillCardIds - Array of skill card template IDs (5-8 cards)
     */
    buildDeck(heroCard, skillCardIds) {
        this.hero = heroCard;
        this.equippedCards = [...skillCardIds];
        this.deck = [];
        this.hand = [];
        this.discard = [];

        // Create copies of skill cards for this battle
        for (const cardId of skillCardIds) {
            const template = getSkillCardById(cardId);
            if (template) {
                this.deck.push({ ...template, instanceId: Math.random().toString(36).substr(2, 9) });
            }
        }

        // Shuffle deck
        this.shuffleDeck();
    },

    /**
     * Shuffle deck using Fisher-Yates
     */
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    },

    /**
     * Draw starting hand
     */
    drawStartingHand() {
        this.hand = [];
        for (let i = 0; i < this.STARTING_HAND && this.deck.length > 0; i++) {
            this.hand.push(this.deck.pop());
        }
    },

    /**
     * Draw 1 card (called at start of Draw Phase)
     * @returns {Object|null} The drawn card, or null if deck empty and hand full
     */
    drawCard() {
        // Can't draw if hand is full
        if (this.hand.length >= this.MAX_HAND) return null;

        // If deck is empty, shuffle discard back in
        if (this.deck.length === 0) {
            if (this.discard.length === 0) return null; // completely out of cards
            this.deck = [...this.discard];
            this.discard = [];
            this.shuffleDeck();
        }

        const card = this.deck.pop();
        this.hand.push(card);
        return card;
    },

    /**
     * Play a card from hand (called during Main Phase)
     * @param {number} handIndex - Index in hand array
     * @returns {Object|null} The played card
     */
    playCard(handIndex) {
        if (handIndex < 0 || handIndex >= this.hand.length) return null;
        const card = this.hand.splice(handIndex, 1)[0];
        this.discard.push(card);
        return card;
    },

    /**
     * Get a card from hand without playing it
     * @param {number} handIndex
     * @returns {Object|null}
     */
    peekCard(handIndex) {
        if (handIndex < 0 || handIndex >= this.hand.length) return null;
        return this.hand[handIndex];
    },

    /**
     * Get current deck state info
     */
    getState() {
        return {
            hero: this.hero,
            hand: [...this.hand],
            deckCount: this.deck.length,
            discardCount: this.discard.length,
            totalCards: this.deck.length + this.hand.length + this.discard.length,
        };
    },

    /**
     * Reset deck state
     */
    reset() {
        this.hero = null;
        this.deck = [];
        this.hand = [];
        this.discard = [];
        this.equippedCards = [];
    },

    // ===== SAVE / LOAD DECK BUILDS =====

    /**
     * Save a deck build (hero + skill cards)
     * @param {number} heroId - Hero card ID from collection
     * @param {Array} skillCardIds - Skill card template IDs
     * @param {number} slot - Deck slot (0-2)
     */
    saveDeckBuild(heroId, skillCardIds, slot = 0) {
        const saved = this.loadAllDeckBuilds();
        saved[slot] = { heroId, skillCardIds, updatedAt: Date.now() };
        localStorage.setItem('pixelraid_decks', JSON.stringify(saved));
    },

    /**
     * Load a deck build
     * @param {number} slot
     * @returns {Object|null} { heroId, skillCardIds }
     */
    loadDeckBuild(slot = 0) {
        const saved = this.loadAllDeckBuilds();
        return saved[slot] || null;
    },

    /**
     * Load all deck builds
     * @returns {Object} { 0: {...}, 1: {...}, 2: {...} }
     */
    loadAllDeckBuilds() {
        try {
            const raw = localStorage.getItem('pixelraid_decks');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },

    // ===== STAISETIC HELPERS =====

    /**
     * Generate a default deck for a hero (first 4 available cards)
     */
    generateDefaultDeck() {
        return SKILL_CARD_TEMPLATES.slice(0, 4).map(c => c.id);
    },

    /**
     * Validate a deck build
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateDeck(heroId, skillCardIds) {
        const errors = [];

        if (!heroId) errors.push('No hero selected');
        if (!GameState.getCardById(heroId)) errors.push('Hero not found in collection');

        if (!skillCardIds || skillCardIds.length < this.MIN_DECK_SIZE) {
            errors.push(`Need at least ${this.MIN_DECK_SIZE} cards`);
        }
        if (skillCardIds && skillCardIds.length > this.MAX_DECK_SIZE) {
            errors.push(`Maximum ${this.MAX_DECK_SIZE} cards allowed`);
        }

        // Check all card IDs exist
        if (skillCardIds) {
            for (const id of skillCardIds) {
                if (!getSkillCardById(id)) {
                    errors.push(`Unknown card: ${id}`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    },
};
