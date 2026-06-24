// src/ShopDB.ts
import { POKEMON_DATABASE, PokemonCard } from './PokemonDB';

export interface PackConfig { id: string; name: string; cost: number; cards: number; }

export const SHOP_INVENTORY: PackConfig[] = [
    { id: 'base', name: 'Base Booster', cost: 100, cards: 1 }
];

const rarityWeight: Record<string, number> = {
    Common: 72,
    Uncommon: 18,
    Rare: 7,
    Epic: 2,
    Legendary: 1
};

const weightedPool: PokemonCard[] = POKEMON_DATABASE.flatMap((card) => {
    const count = rarityWeight[card.rarity] ?? 1;
    return Array.from({ length: count }, () => card);
});

export function openPack(config: PackConfig): PokemonCard[] {
    return Array.from({ length: config.cards }, () =>
        weightedPool[Math.floor(Math.random() * weightedPool.length)]
    );
}