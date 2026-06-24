"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOP_INVENTORY = exports.CARDS_PER_BOOSTER = void 0;
exports.openPack = openPack;
// src/ShopDB.ts
const PokemonDB_1 = require("./PokemonDB");
exports.CARDS_PER_BOOSTER = 10;
const BOOSTER_SLOT_RARITIES = [
    'Common',
    'Common',
    'Common',
    'Common',
    'Common',
    'Uncommon',
    'Uncommon',
    'Uncommon',
    'Rare',
    'Rare'
];
exports.SHOP_INVENTORY = [
    { id: 'single', name: 'Single Booster', cost: 45, boosterPacks: 1, bonusCards: 0, description: '1 booster pack with 10 cards' },
    { id: 'blister', name: 'Blister Pack', cost: 130, boosterPacks: 3, bonusCards: 1, description: '3 booster packs plus 1 promo card' },
    { id: 'tin', name: 'Collector Tin', cost: 250, boosterPacks: 4, bonusCards: 1, description: '4 booster packs plus 1 promo card' },
    { id: 'etb', name: 'Elite Trainer Box', cost: 500, boosterPacks: 8, bonusCards: 2, description: '8 booster packs plus 2 bonus cards' },
    { id: 'booster_box', name: 'Booster Box', cost: 1600, boosterPacks: 36, bonusCards: 0, description: '36 booster packs' }
];
const cardsByRarity = new Map();
for (const card of PokemonDB_1.POKEMON_DATABASE) {
    const bucket = cardsByRarity.get(card.rarity) ?? [];
    bucket.push(card);
    cardsByRarity.set(card.rarity, bucket);
}
function rollCard(rarity) {
    const cards = cardsByRarity.get(rarity) ?? cardsByRarity.get('Common') ?? PokemonDB_1.POKEMON_DATABASE;
    return cards[Math.floor(Math.random() * cards.length)];
}
function rollBonusCard() {
    const roll = Math.random();
    if (roll > 0.985) {
        return rollCard('Legendary');
    }
    if (roll > 0.93) {
        return rollCard('Epic');
    }
    if (roll > 0.75) {
        return rollCard('Rare');
    }
    if (roll > 0.35) {
        return rollCard('Uncommon');
    }
    return rollCard('Common');
}
function openBooster() {
    return BOOSTER_SLOT_RARITIES.map((rarity) => {
        if (rarity === 'Rare') {
            const rareRoll = Math.random();
            if (rareRoll > 0.96) {
                return rollCard('Legendary');
            }
            if (rareRoll > 0.7) {
                return rollCard('Epic');
            }
        }
        return rollCard(rarity);
    });
}
function openPack(config) {
    const cards = [];
    for (let boosterIndex = 0; boosterIndex < config.boosterPacks; boosterIndex += 1) {
        cards.push(...openBooster());
    }
    for (let bonusIndex = 0; bonusIndex < config.bonusCards; bonusIndex += 1) {
        cards.push(rollBonusCard());
    }
    return cards;
}
//# sourceMappingURL=ShopDB.js.map