"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOP_INVENTORY = void 0;
exports.openPack = openPack;
// src/ShopDB.ts
const PokemonDB_1 = require("./PokemonDB");
exports.SHOP_INVENTORY = [
    { id: 'base', name: 'Base Booster', cost: 100, cards: 1 }
];
const rarityWeight = {
    Common: 72,
    Uncommon: 18,
    Rare: 7,
    Epic: 2,
    Legendary: 1
};
const weightedPool = PokemonDB_1.POKEMON_DATABASE.flatMap((card) => {
    const count = rarityWeight[card.rarity] ?? 1;
    return Array.from({ length: count }, () => card);
});
function openPack(config) {
    return Array.from({ length: config.cards }, () => weightedPool[Math.floor(Math.random() * weightedPool.length)]);
}
//# sourceMappingURL=ShopDB.js.map