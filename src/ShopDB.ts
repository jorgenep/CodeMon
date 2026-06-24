// src/ShopDB.ts
import { POKEMON_DATABASE, PokemonCard } from './PokemonDB';
import { Rarity } from './PokemonDB';

export interface PackConfig {
    id: string;
    name: string;
    cost: number;
    boosterPacks: number;
    bonusCards: number;
    description: string;
}

export const CARDS_PER_BOOSTER = 10;

const BOOSTER_SLOT_RARITIES: Rarity[] = [
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

export const SHOP_INVENTORY: PackConfig[] = [
    { id: 'single', name: 'Single Booster', cost: 45, boosterPacks: 1, bonusCards: 0, description: '1 booster pack with 10 cards' },
    { id: 'blister', name: 'Blister Pack', cost: 130, boosterPacks: 3, bonusCards: 1, description: '3 booster packs plus 1 promo card' },
    { id: 'tin', name: 'Collector Tin', cost: 250, boosterPacks: 4, bonusCards: 1, description: '4 booster packs plus 1 promo card' },
    { id: 'etb', name: 'Elite Trainer Box', cost: 500, boosterPacks: 8, bonusCards: 2, description: '8 booster packs plus 2 bonus cards' },
    { id: 'booster_box', name: 'Booster Box', cost: 1600, boosterPacks: 36, bonusCards: 0, description: '36 booster packs' }
];

const cardsByRarity = new Map<Rarity, PokemonCard[]>();

for (const card of POKEMON_DATABASE) {
    const bucket = cardsByRarity.get(card.rarity) ?? [];
    bucket.push(card);
    cardsByRarity.set(card.rarity, bucket);
}

function rollCard(rarity: Rarity): PokemonCard {
    const cards = cardsByRarity.get(rarity) ?? cardsByRarity.get('Common') ?? POKEMON_DATABASE;
    return cards[Math.floor(Math.random() * cards.length)];
}

function rollBonusCard(): PokemonCard {
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

function openBooster(): PokemonCard[] {
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

export function openPack(config: PackConfig): PokemonCard[] {
    const cards: PokemonCard[] = [];

    for (let boosterIndex = 0; boosterIndex < config.boosterPacks; boosterIndex += 1) {
        cards.push(...openBooster());
    }

    for (let bonusIndex = 0; bonusIndex < config.bonusCards; bonusIndex += 1) {
        cards.push(rollBonusCard());
    }

    return cards;
}