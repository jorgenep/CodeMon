"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewContent = void 0;
const ShopDB_1 = require("./ShopDB");
const getPokemonArtworkUrl = (pokemonId) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
const getWebviewContent = (cards, xp, shopInventory) => {
    const cardMarkup = cards.length
        ? cards
            .map((card) => `<article class="card rarity-${card.rarity.toLowerCase()}"><img src="${getPokemonArtworkUrl(card.id)}" alt="${card.name}" /><h3>${card.name}</h3><p>${card.type}</p><span>${card.rarity}</span></article>`)
            .join('')
        : '<p class="empty">No cards yet. Open your first pack below.</p>';
    const shopMarkup = shopInventory
        .map((pack) => `<button class="pack" data-pack-id="${pack.id}"><strong>${pack.name}</strong><span>${pack.description}</span><span>${pack.boosterPacks * ShopDB_1.CARDS_PER_BOOSTER + pack.bonusCards} card(s)</span><span>${pack.cost} XP</span></button>`)
        .join('');
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
    <style>
        :root {
            --bg: radial-gradient(circle at 20% 20%, #223654 0%, #101626 55%, #090d16 100%);
            --panel: rgba(10, 15, 28, 0.72);
            --text: #f7f4e7;
            --muted: #9ab0c7;
            --line: rgba(255, 255, 255, 0.14);
            --accent: #f5b642;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
            color: var(--text);
            background: var(--bg);
            padding: 20px;
        }
        .shell {
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            gap: 16px;
        }
        .panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 16px;
            backdrop-filter: blur(7px);
        }
        h1 { margin: 0 0 8px; font-size: 1.6rem; }
        .meta { color: var(--muted); margin: 0; }
        .xp { color: var(--accent); font-weight: 700; }
        .shop {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
        }
        .pack {
            border: 1px solid var(--line);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
            text-align: left;
            padding: 12px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: transform 120ms ease, border-color 120ms ease;
        }
        .pack:hover { transform: translateY(-2px); border-color: var(--accent); }
        .binder-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }
        .card {
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.04);
        }
        .card img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: contain;
            display: block;
            margin-bottom: 8px;
            image-rendering: auto;
        }
        .card h3 { margin: 0 0 6px; font-size: 1rem; }
        .card p { margin: 0 0 8px; color: var(--muted); }
        .card span { font-size: 0.86rem; }
        .rarity-legendary { border-color: #ffcb38; }
        .rarity-epic { border-color: #f77b5f; }
        .rarity-rare { border-color: #5cc7ff; }
        .empty { margin: 0; color: var(--muted); }
    </style>
</head>
<body>
    <main class="shell">
        <section class="panel">
            <h1>CodeMon Binder</h1>
            <p class="meta">Available XP: <span id="xp" class="xp">${xp}</span></p>
        </section>
        <section class="panel">
            <h2>Shop</h2>
            <div class="shop">${shopMarkup}</div>
        </section>
        <section class="panel">
            <h2>Collection (${cards.length})</h2>
            <div id="binder-grid" class="binder-grid">${cardMarkup}</div>
        </section>
    </main>
    <script>
        const vscode = acquireVsCodeApi();
        const getPokemonArtworkUrl = (pokemonId) => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + pokemonId + '.png';
        for (const button of document.querySelectorAll('.pack')) {
            button.addEventListener('click', () => {
                vscode.postMessage({ command: 'openPack', packId: button.dataset.packId });
            });
        }
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (!message || message.command !== 'refreshBinder') {
                return;
            }
            const nextHtml = message.cards.length
                ? message.cards.map((card) =>
                                        '<article class="card rarity-' + String(card.rarity).toLowerCase() + '"><img src="' + getPokemonArtworkUrl(card.id) + '" alt="' + card.name + '" /><h3>' + card.name + '</h3><p>' + card.type + '</p><span>' + card.rarity + '</span></article>'
                  ).join('')
                : '<p class="empty">No cards yet. Open your first pack below.</p>';
            document.getElementById('binder-grid').innerHTML = nextHtml;
            document.getElementById('xp').textContent = String(message.xp);
        });
    </script>
</body>
</html>`;
};
exports.getWebviewContent = getWebviewContent;
//# sourceMappingURL=BinderWebview.js.map