"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeState = exports.defaultState = void 0;
const PokemonDB_1 = require("./PokemonDB");
const defaultState = () => ({
    xp: 0,
    coins: 0,
    collection: [],
    ownedCosmetics: [],
    equippedTheme: 'theme-default'
});
exports.defaultState = defaultState;
const CARD_BY_ID = new Map(PokemonDB_1.POKEMON_DATABASE.map((card) => [card.id, card]));
const toCard = (value) => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const maybeId = value.id;
    if (typeof maybeId !== 'number') {
        return null;
    }
    return CARD_BY_ID.get(maybeId) ?? null;
};
const sanitizeState = (value) => {
    const fallback = (0, exports.defaultState)();
    if (!value || typeof value !== 'object') {
        return fallback;
    }
    const raw = value;
    const rawCollection = Array.isArray(raw.collection) ? raw.collection : [];
    const collection = rawCollection
        .map((entry) => toCard(entry))
        .filter((card) => card !== null);
    return {
        xp: typeof raw.xp === 'number' && raw.xp >= 0 ? Math.floor(raw.xp) : fallback.xp,
        coins: typeof raw.coins === 'number' && raw.coins >= 0 ? Math.floor(raw.coins) : fallback.coins,
        collection,
        ownedCosmetics: Array.isArray(raw.ownedCosmetics)
            ? raw.ownedCosmetics.filter((item) => typeof item === 'string')
            : fallback.ownedCosmetics,
        equippedTheme: typeof raw.equippedTheme === 'string' ? raw.equippedTheme : fallback.equippedTheme
    };
};
exports.sanitizeState = sanitizeState;
//# sourceMappingURL=State.js.map