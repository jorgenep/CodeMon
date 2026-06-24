// src/ShopDB.ts
import { POKEMON_DATABASE, PokemonCard } from './PokemonDB';

export interface PackConfig { id: string; name: string; cost: number; cards: number; }

export const SHOP_INVENTORY: PackConfig[] = [
    { id: 'base', name: 'Base Booster', cost: 100, cards: 1 }
];

export function openPack(config: PackConfig): PokemonCard[] {
    return Array.from({ length: config.cards }, () => 
        POKEMON_DATABASE[Math.floor(Math.random() * POKEMON_DATABASE.length)]
    );
}