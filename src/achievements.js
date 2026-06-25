// src/achievements.js
// All achievements are purely cosmetic tracking — no gameplay rewards.

const ACHIEVEMENTS = [
    // --- XP milestones ---
    { id: 'xp_100',    icon: '⚡', name: 'First Spark',       description: 'Earn 100 XP total',          check: (s) => s.totalXp >= 100 },
    { id: 'xp_500',    icon: '⚡', name: 'On a Roll',          description: 'Earn 500 XP total',          check: (s) => s.totalXp >= 500 },
    { id: 'xp_1000',   icon: '⚡', name: 'Power Surge',        description: 'Earn 1,000 XP total',        check: (s) => s.totalXp >= 1000 },
    { id: 'xp_5000',   icon: '⚡', name: 'High Voltage',       description: 'Earn 5,000 XP total',        check: (s) => s.totalXp >= 5000 },
    { id: 'xp_10000',  icon: '⚡', name: 'Thunderstorm',       description: 'Earn 10,000 XP total',       check: (s) => s.totalXp >= 10000 },

    // --- Bug fixing ---
    { id: 'bugs_1',    icon: '🐛', name: 'Exterminator',       description: 'Fix your first bug',         check: (s) => s.bugsFixed >= 1 },
    { id: 'bugs_10',   icon: '🐛', name: 'Bug Buster',         description: 'Fix 10 bugs',                check: (s) => s.bugsFixed >= 10 },
    { id: 'bugs_50',   icon: '🐛', name: 'Debugger Pro',       description: 'Fix 50 bugs',                check: (s) => s.bugsFixed >= 50 },
    { id: 'bugs_200',  icon: '🐛', name: 'No More Bugs',       description: 'Fix 200 bugs',               check: (s) => s.bugsFixed >= 200 },

    // --- Packs opened ---
    { id: 'packs_1',   icon: '📦', name: 'Ripper',             description: 'Open your first pack',       check: (s) => s.packsOpened >= 1 },
    { id: 'packs_5',   icon: '📦', name: 'Pack Hoarder',       description: 'Open 5 packs',               check: (s) => s.packsOpened >= 5 },
    { id: 'packs_25',  icon: '📦', name: 'Box Breaker',        description: 'Open 25 packs',              check: (s) => s.packsOpened >= 25 },
    { id: 'packs_100', icon: '📦', name: 'Addicted',           description: 'Open 100 packs',             check: (s) => s.packsOpened >= 100 },

    // --- Card collection ---
    { id: 'cards_1',   icon: '🃏', name: 'First Pull',         description: 'Add a card to your binder', check: (s) => s.uniqueCards >= 1 },
    { id: 'cards_50',  icon: '🃏', name: 'Growing Collection', description: 'Collect 50 unique cards',    check: (s) => s.uniqueCards >= 50 },
    { id: 'cards_151', icon: '🃏', name: 'Kanto Dex',          description: 'Collect 151 unique cards',   check: (s) => s.uniqueCards >= 151 },
    { id: 'cards_500', icon: '🃏', name: 'Dex Enthusiast',     description: 'Collect 500 unique cards',   check: (s) => s.uniqueCards >= 500 },

    // --- Generation sets ---
    { id: 'gen1_comp', icon: '🏆', name: 'Kanto Complete',     description: 'Collect all Gen 1 Pokémon',  check: (s) => (s.genCompletions || {})[1] },
    { id: 'gen2_comp', icon: '🏆', name: 'Johto Complete',     description: 'Collect all Gen 2 Pokémon',  check: (s) => (s.genCompletions || {})[2] },
    { id: 'gen3_comp', icon: '🏆', name: 'Hoenn Complete',     description: 'Collect all Gen 3 Pokémon',  check: (s) => (s.genCompletions || {})[3] },
    { id: 'gen4_comp', icon: '🏆', name: 'Sinnoh Complete',    description: 'Collect all Gen 4 Pokémon',  check: (s) => (s.genCompletions || {})[4] },
    { id: 'gen5_comp', icon: '🏆', name: 'Unova Complete',     description: 'Collect all Gen 5 Pokémon',  check: (s) => (s.genCompletions || {})[5] },
    { id: 'gen6_comp', icon: '🏆', name: 'Kalos Complete',     description: 'Collect all Gen 6 Pokémon',  check: (s) => (s.genCompletions || {})[6] },
    { id: 'gen7_comp', icon: '🏆', name: 'Alola Complete',     description: 'Collect all Gen 7 Pokémon',  check: (s) => (s.genCompletions || {})[7] },
    { id: 'gen8_comp', icon: '🏆', name: 'Galar Complete',     description: 'Collect all Gen 8 Pokémon',  check: (s) => (s.genCompletions || {})[8] },
    { id: 'gen9_comp', icon: '🏆', name: 'Paldea Complete',    description: 'Collect all Gen 9 Pokémon',  check: (s) => (s.genCompletions || {})[9] },

    // --- Coding session ---
    { id: 'session_1', icon: '💻', name: 'Just Started',       description: 'Have CodeMon active',        check: (s) => s.totalXp >= 0 },
    { id: 'break_5',   icon: '☕', name: 'Coffee Break',       description: 'Open the binder (take a break!)', check: (s) => s.binderOpens >= 1 },
    { id: 'break_20',  icon: '☕', name: 'Regular Breaks',     description: 'Open the binder 20 times',   check: (s) => s.binderOpens >= 20 },
];

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

/**
 * Build stats object from raw globalState values.
 * @param {object} ctx vscode ExtensionContext
 * @param {{ pokemonDatabase: {id:number, generation:number}[] }} db
 * @returns {object} stats
 */
function buildStats(ctx, db) {
    const myCards = ctx.globalState.get('myCards') || [];
    const uniqueCardIds = new Set(myCards.map((c) => c.id));
    const totalXp = ctx.globalState.get('totalXpEarned') || 0;
    const bugsFixed = ctx.globalState.get('bugsFixed') || 0;
    const packsOpened = ctx.globalState.get('packsOpened') || 0;
    const binderOpens = ctx.globalState.get('binderOpens') || 0;

    // Gen completions: check if every Pokémon in the generation range is in owned set
    const genCompletions = {};
    const genMap = new Map();
    for (const card of db) {
        const bucket = genMap.get(card.generation) || [];
        bucket.push(card.id);
        genMap.set(card.generation, bucket);
    }
    for (const [genId, ids] of genMap) {
        genCompletions[genId] = ids.every((id) => uniqueCardIds.has(id));
    }

    return {
        totalXp,
        bugsFixed,
        packsOpened,
        uniqueCards: uniqueCardIds.size,
        binderOpens,
        genCompletions
    };
}

/**
 * Check all achievements, persist newly unlocked ones, return their ids.
 * @returns {string[]} newly unlocked achievement ids
 */
function checkAchievements(ctx, db) {
    const stats = buildStats(ctx, db);
    const unlocked = new Set(ctx.globalState.get('unlockedAchievements') || []);
    const newlyUnlocked = [];

    for (const achievement of ACHIEVEMENTS) {
        if (unlocked.has(achievement.id)) {
            continue;
        }
        if (achievement.check(stats)) {
            unlocked.add(achievement.id);
            newlyUnlocked.push(achievement.id);
        }
    }

    if (newlyUnlocked.length > 0) {
        ctx.globalState.update('unlockedAchievements', [...unlocked]);
    }

    return newlyUnlocked;
}

/**
 * Returns a serializable list of achievements for the webview.
 * @returns {{ id, icon, name, description, unlocked }[]}
 */
function getAchievementState(ctx) {
    const unlocked = new Set(ctx.globalState.get('unlockedAchievements') || []);
    return ACHIEVEMENTS.map((a) => ({
        id: a.id,
        category: a.category,
        name: a.name,
        description: a.description,
        unlocked: unlocked.has(a.id)
    }));
}

module.exports = { checkAchievements, getAchievementState, ACHIEVEMENTS };
