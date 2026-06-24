// src/PokemonDB.ts
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface PokemonCard {
    id: number;
    name: string;
    type: string;
    rarity: Rarity;
    dustValue: number;
}

export const POKEMON_DATABASE: PokemonCard[] = [
    { id: 1, name: 'Bulbasaur', type: 'Grass', rarity: 'Common', dustValue: 5 },
    { id: 4, name: 'Charmander', type: 'Fire', rarity: 'Common', dustValue: 5 },
    { id: 7, name: 'Squirtle', type: 'Water', rarity: 'Common', dustValue: 5 },
    { id: 150, name: 'Mewtwo', type: 'Psychic', rarity: 'Legendary', dustValue: 500 }
];