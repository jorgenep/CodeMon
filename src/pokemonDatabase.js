// src/pokemonDatabase.js
const GENERATIONS = [
    { id: 1, name: 'Kanto', start: 1, end: 151 },
    { id: 2, name: 'Johto', start: 152, end: 251 },
    { id: 3, name: 'Hoenn', start: 252, end: 386 },
    { id: 4, name: 'Sinnoh', start: 387, end: 493 },
    { id: 5, name: 'Unova', start: 494, end: 649 },
    { id: 6, name: 'Kalos', start: 650, end: 721 },
    { id: 7, name: 'Alola', start: 722, end: 809 },
    { id: 8, name: 'Galar/Hisui', start: 810, end: 905 },
    { id: 9, name: 'Paldea', start: 906, end: 1025 }
];

function getGenerationForDexNumber(dexNumber) {
    return GENERATIONS.find((generation) => dexNumber >= generation.start && dexNumber <= generation.end);
}

const pokemonDatabase = Array.from({ length: 1025 }, (_, index) => {
    const id = index + 1;
    const generation = getGenerationForDexNumber(id);

    return {
        id,
        name: `Dex #${id}`,
        generation: generation ? generation.id : 1,
        generationName: generation ? generation.name : 'Unknown'
    };
});

module.exports = {
    pokemonDatabase,
    GENERATIONS,
    getGenerationForDexNumber
};
