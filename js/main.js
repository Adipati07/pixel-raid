/* ========================================
 * PIXEL RAID — Main Entry Point
 * Card Collector Auto-Battle RPG
 * ======================================== */

(function() {
    'use strict';

    // Load save or init new game
    const hasSave = GameState.load();
    
    if (!hasSave) {
        // Give starter cards — 3 basic heroes for onboarding
        console.log('🎮 New game! Generating starter cards...');
        
        STARTER_HEROES.forEach(heroName => {
            const tmpl = CARD_TEMPLATES.find(t => t.name === heroName);
            if (tmpl) {
                const card = generateCard(tmpl, 'common');
                GameState.addToCollection(card);
                GameState.deck.push(card.id);
                card.inDeck = true;
            }
        });

        // Give starter items
        const starterSword = createItem(ITEM_TEMPLATES.find(t => t.name === 'Rusty Sword'));
        const starterArmor = createItem(ITEM_TEMPLATES.find(t => t.name === 'Leather Vest'));
        GameState.addItem(starterSword);
        GameState.addItem(starterArmor);

        GameState.save();
        console.log('✅ Starter deck ready: Iron Knight, Fire Mage, Holy Priest');
    }

    // Init UI
    UI.init();

    // Show loading screen animation
    LoadingScreen.show();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case '1': UI.showScreen('battle'); break;
            case '2': UI.showScreen('heroes'); break;
            case '3': UI.showScreen('formation'); break;
            case '4': UI.showScreen('inventory'); break;
            case '5': UI.showScreen('shop'); break;
            case ' ': 
                e.preventDefault();
                if (!BattleEngine.isRunning) UI.startBattle();
                break;
        }
    });

    // Auto-save every 30 seconds
    setInterval(() => GameState.save(), 30000);

    // Welcome message
    if (hasSave) {
        console.log(`🎮 Save loaded! Stage ${GameState.player.stage}, ${GameState.collection.length} cards`);
    }

    // Debug helpers
    window.DEBUG = {
        state: GameState,
        battle: BattleEngine,
        economy: Economy,
        formation: Formation,
        addGold: (n) => { Economy.addGold(n); UI.updateHeader(); },
        addGems: (n) => { Economy.addGems(n); UI.updateHeader(); },
        openPack: (type) => { const cards = Economy.buyPack(type || 'basic'); UI.updateHeader(); return cards; },
        skipStage: () => { GameState.player.stage++; GameState.player.wave = 1; GameState.save(); UI.renderBattleScreen(); },
    };

    console.log('⚔️ PIXEL RAID — Card Collector Battle RPG');
    console.log('Type DEBUG.help() for debug commands');
})();
