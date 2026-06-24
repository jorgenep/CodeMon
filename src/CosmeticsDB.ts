// src/CosmeticsDB.ts
export interface Cosmetic {
    id: string;
    name: string;
    type: 'theme' | 'background';
    cost: number;
    cssValue: string; 
}

export const COSMETICS_INVENTORY: Cosmetic[] = [
    { 
        id: 'theme_cyber', 
        name: 'Cyberpunk Dark', 
        type: 'theme', 
        cost: 50, 
        cssValue: 'filter: invert(1) hue-rotate(180deg);' 
    },
    { 
        id: 'bg_forest', 
        name: 'Viridian Forest', 
        type: 'background', 
        cost: 100, 
        cssValue: 'background-image: url("forest.png");' 
    }
];