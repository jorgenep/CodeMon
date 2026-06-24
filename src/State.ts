import { POKEMON_DATABASE, PokemonCard } from './PokemonDB';

export interface GameState {
    xp: number;
    coins: number;
    collection: PokemonCard[];
    ownedCosmetics: string[];
    equippedTheme: string;
}

export const defaultState = (): GameState => ({
    xp: 0,
    coins: 0,
    collection: [],
    ownedCosmetics: [],
    equippedTheme: 'theme-default'
});

const CARD_BY_ID = new Map<number, PokemonCard>(POKEMON_DATABASE.map((card) => [card.id, card]));

const toCard = (value: unknown): PokemonCard | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const maybeId = (value as { id?: unknown }).id;
    if (typeof maybeId !== 'number') {
        return null;
    }

    return CARD_BY_ID.get(maybeId) ?? null;
};

export const sanitizeState = (value: unknown): GameState => {
    const fallback = defaultState();
    if (!value || typeof value !== 'object') {
        return fallback;
    }

    const raw = value as Partial<GameState>;
    const rawCollection = Array.isArray(raw.collection) ? raw.collection : [];
    const collection = rawCollection
        .map((entry) => toCard(entry))
        .filter((card): card is PokemonCard => card !== null);

    return {
        xp: typeof raw.xp === 'number' && raw.xp >= 0 ? Math.floor(raw.xp) : fallback.xp,
        coins: typeof raw.coins === 'number' && raw.coins >= 0 ? Math.floor(raw.coins) : fallback.coins,
        collection,
        ownedCosmetics: Array.isArray(raw.ownedCosmetics)
            ? raw.ownedCosmetics.filter((item): item is string => typeof item === 'string')
            : fallback.ownedCosmetics,
        equippedTheme: typeof raw.equippedTheme === 'string' ? raw.equippedTheme : fallback.equippedTheme
    };
};