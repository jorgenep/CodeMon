const vscode = require('vscode');
const { pokemonDatabase } = require('./pokemonDatabase');

class BinderWebviewProvider {
    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._view = undefined;
        this.allCards = pokemonDatabase; 
    }

    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'ready') {
                if (typeof this.onBinderOpened === 'function') {
                    this.onBinderOpened();
                }
                this.updateBinderData();
            } else if (message.command === 'openPack') {
                this._handleOpenPack(message.packIndex);
            }
        });
    }

    updateAchievements(achievements) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateAchievements', achievements });
        }
    }

    _handleOpenPack(packIndex) {
        if (packIndex === -1) {
            this.updateBinderData();
            return;
        }

        const packs = this._context.globalState.get('unopenedPacks') || [];
        if (packIndex >= 0 && packIndex < packs.length) {
            const selectedPack = packs[packIndex];
            packs.splice(packIndex, 1);
            this._context.globalState.update('unopenedPacks', packs);

            const selectedGeneration = selectedPack && typeof selectedPack === 'object' ? selectedPack.generation : undefined;
            const generationPool = selectedPack && selectedPack.generation
                ? this.allCards.filter((card) => card.generation === selectedGeneration)
                : this.allCards;
            const cardPool = generationPool.length > 0 ? generationPool : this.allCards;

            const cardsPerPack = selectedPack && typeof selectedPack === 'object' && selectedPack.cardsPerPack ? selectedPack.cardsPerPack : 1;
            const pulledCards = [];

            for (let pull = 0; pull < cardsPerPack; pull += 1) {
                const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
                pulledCards.push(randomCard);
            }

            const currentCards = this._context.globalState.get('myCards') || [];
            currentCards.push(...pulledCards);
            this._context.globalState.update('myCards', currentCards);

            if (typeof this.onPackOpened === 'function') {
                this.onPackOpened();
            }

            this._view.webview.postMessage({
                type: 'initPackOpening',
                card: pulledCards[0],
                cards: pulledCards,
                pulledCount: pulledCards.length,
                packLabel: selectedPack && typeof selectedPack === 'object' && selectedPack.label ? selectedPack.label : 'Booster Pack'
            });
        }
    }

    updateBinderData() {
        if (this._view) {
            const cards = this._context.globalState.get('myCards') || [];
            const packs = this._context.globalState.get('unopenedPacks') || [];
            this._view.webview.postMessage({ 
                type: 'updateBinder', 
                cards: cards,
                packs: packs,
                allCards: this.allCards
            });
        }
    }

    _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src https:;">
                <style>
                    :root {
                        --bg: var(--vscode-editor-background);
                        --fg: var(--vscode-editor-foreground);
                        --border: var(--vscode-panel-border);
                    }
                    body { font-family: sans-serif; padding: 0; color: var(--fg); margin: 0; user-select: none; }
                    h3 { border-bottom: 1px solid var(--border); padding-bottom: 5px; margin-top: 20px; }

                    /* ── Tab Bar ── */
                    .tab-bar {
                        display: flex;
                        border-bottom: 1px solid var(--border);
                        background: var(--bg);
                        position: sticky;
                        top: 0;
                        z-index: 50;
                    }
                    .tab {
                        flex: 1;
                        padding: 9px 4px;
                        font-size: 0.82em;
                        font-weight: 600;
                        text-align: center;
                        cursor: pointer;
                        border-bottom: 2px solid transparent;
                        opacity: 0.6;
                        transition: opacity 0.15s, border-color 0.15s;
                    }
                    .tab.active {
                        opacity: 1;
                        border-bottom-color: #f5d67a;
                    }
                    .tab-content { display: none; padding: 12px 15px; }
                    .tab-content.active { display: block; }

                    /* ── Achievements ── */
                    .achievement-list { display: grid; gap: 8px; }
                    .achievement {
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        padding: 9px 10px;
                        border-radius: 8px;
                        border: 1px solid var(--border);
                        background: rgba(255,255,255,0.03);
                        transition: opacity 0.2s;
                    }
                    .achievement.locked { opacity: 0.35; filter: grayscale(1); }
                    .achievement-cat {
                        font-size: 0.62em;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        padding: 3px 6px;
                        border-radius: 4px;
                        flex-shrink: 0;
                        margin-top: 2px;
                        align-self: flex-start;
                        min-width: 40px;
                        text-align: center;
                    }
                    .ach-cat-xp      { background: #1e3a52; color: #7ec8e3; }
                    .ach-cat-debug   { background: #3a2020; color: #e38a7e; }
                    .ach-cat-packs   { background: #2a2a1a; color: #d4c47e; }
                    .ach-cat-cards   { background: #1a2a3a; color: #7ea8d4; }
                    .ach-cat-set     { background: #1e3220; color: #7ed47e; }
                    .ach-cat-session { background: #2a2040; color: #b07ed4; }
                    .achievement-name { font-size: 0.85em; font-weight: 700; margin: 0 0 2px; }
                    .achievement-desc { font-size: 0.75em; opacity: 0.75; margin: 0; }
                    .achievement-badge {
                        margin-left: auto;
                        font-size: 0.65em;
                        font-weight: 700;
                        padding: 2px 6px;
                        border-radius: 20px;
                        flex-shrink: 0;
                        align-self: center;
                    }
                    .achievement.unlocked .achievement-badge { background: #3a5c2a; color: #a4f08a; }
                    .achievement.locked .achievement-badge  { background: rgba(255,255,255,0.08); color: var(--fg); }
                    .achievement-group-title {
                        font-size: 0.78em;
                        font-weight: 700;
                        letter-spacing: 0.6px;
                        text-transform: uppercase;
                        opacity: 0.55;
                        margin: 14px 0 4px;
                    }
                    
                    .pack-item {
                        background: linear-gradient(135deg, #f12711, #f5af19);
                        color: white; padding: 12px; border-radius: 6px;
                        text-align: center; cursor: pointer; margin-bottom: 10px;
                        font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                    }

                    .generation-sets {
                        display: grid;
                        gap: 10px;
                    }
                    .generation-set {
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.03);
                    }
                    .generation-set summary {
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 0.9em;
                    }
                    .generation-meta {
                        font-size: 0.75em;
                        opacity: 0.75;
                        margin-left: 6px;
                    }
                    .card-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(110px, 130px));
                        gap: 10px;
                        justify-content: center;
                        margin-top: 8px;
                    }
                    
                    /* Updated Card CSS to handle images */
                    .card { 
                        border: 1px solid var(--border); padding: 10px 5px; 
                        text-align: center; border-radius: 6px; background: var(--bg);
                        font-weight: bold; display: flex; flex-direction: column;
                        align-items: center; justify-content: space-between;
                        width: 100%;
                        max-width: 130px;
                        min-height: 160px;
                        justify-self: center;
                    }
                    .card img {
                        width: 80%; height: auto; margin-bottom: 5px; max-height: 84px;
                        filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
                    }
                    .card .name {
                        font-size: 0.75em;
                        line-height: 1.2;
                        min-height: 2.1em;
                        display: block;
                        width: 100%;
                        padding: 3px 4px;
                        border-radius: 4px;
                        background: rgba(0,0,0,0.12);
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .card.unowned { opacity: 0.35; filter: grayscale(100%); border: 1px dashed var(--border); }
                    .card.unowned .name { opacity: 0.85; }

                    #animationOverlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(10, 10, 15, 0.95);
                        display: none;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        box-sizing: border-box;
                        padding: 12px;
                        gap: 12px;
                    }

                    .animation-stage {
                        width: 100%;
                        flex: 1;
                        min-height: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                    }

                    .pack-wrapper {
                        width: clamp(140px, 62vw, 220px);
                        height: clamp(210px, 93vw, 330px);
                        position: relative;
                        perspective: 1000px;
                        cursor: grab;
                    }
                    .pack-wrapper:active { cursor: grabbing; }

                    .pack-body {
                        width: 100%; height: 82%; position: absolute; bottom: 0;
                        background: linear-gradient(135deg, #f12711, #f5af19);
                        border-radius: 0 0 12px 12px; z-index: 5;
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        color: white; font-weight: bold; border: 2px solid rgba(255,255,255,0.2); box-sizing: border-box;
                    }
                    
                    .pack-top-flap {
                        width: 100%; height: 18%; position: absolute; top: 0; left: 0;
                        background: linear-gradient(180deg, #d81b0a, #f12711);
                        border-radius: 12px 12px 0 0; z-index: 6; transform-origin: bottom center;
                        display: flex; align-items: center; justify-content: center;
                        color: rgba(255,255,255,0.8); font-size: 0.8em; font-weight: bold;
                        border: 2px solid rgba(255,255,255,0.1); border-bottom: none; box-sizing: border-box;
                    }

                    .card-3d {
                        width: 88%;
                        height: 83%;
                        position: absolute;
                        top: 12%;
                        left: 6%;
                        z-index: 2; transform-style: preserve-3d; display: none;
                    }
                    .card-face {
                        position: absolute; width: 100%; height: 100%; backface-visibility: hidden;
                        border-radius: 10px; display: flex; flex-direction: column;
                        align-items: center; justify-content: center; font-weight: bold;
                        text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                    }
                    /* Add standard holo foil gradient to front */
                    .card-front { 
                        background: linear-gradient(135deg, #e0eaf5, #a3bced); color: #111; 
                        border: 6px solid #fbd72b; transform: rotateY(180deg); 
                        padding: 8px;
                        justify-content: space-between;
                    }
                    .card-front img { width: 92%; max-height: 118px; object-fit: contain; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.4)); }
                    .card-front .title { font-size: 0.8em; font-weight: 700; margin-bottom: 4px; }
                    .card-front .subtitle { font-size: 0.65em; opacity: 0.75; margin-top: 4px; }
                    
                    .card-back { 
                        background: #12346b;
                        border: 6px solid #f0c93b;
                        overflow: hidden;
                    }
                    .card-back img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }

                    #promptText { color: #aaa; font-size: 0.9em; margin-top: 25px; text-align: center; min-height: 20px; font-weight: 500; }

                    .pack-recap {
                        display: none;
                        width: min(840px, 92vw);
                        max-height: 100%;
                        overflow: auto;
                        border: 1px solid rgba(255,255,255,0.16);
                        border-radius: 12px;
                        background: rgba(20, 22, 34, 0.86);
                        padding: 14px;
                    }
                    .pack-recap h4 {
                        margin: 0 0 10px;
                        font-size: 1rem;
                        color: #f5d67a;
                        text-align: center;
                    }
                    .pack-recap-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                        gap: 8px;
                    }
                    .pack-recap-card {
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 8px;
                        padding: 6px;
                        text-align: center;
                        background: rgba(255,255,255,0.04);
                        font-size: 0.72rem;
                    }
                    .pack-recap-card img {
                        width: 100%;
                        aspect-ratio: 1 / 1;
                        object-fit: contain;
                        display: block;
                        margin-bottom: 4px;
                    }

                    @media (max-height: 540px) {
                        #animationOverlay {
                            padding: 8px;
                            gap: 8px;
                        }

                        #promptText {
                            margin-top: 0;
                            font-size: 0.8em;
                            min-height: 16px;
                        }

                        .pack-wrapper {
                            width: clamp(120px, 50vw, 180px);
                            height: clamp(180px, 75vw, 270px);
                        }
                    }
                </style>
            </head>
            <body>
                <div class="tab-bar">
                    <div class="tab active" data-tab="binder">Binder</div>
                    <div class="tab" data-tab="achievements">Achievements</div>
                </div>

                <div id="mainView">
                    <div class="tab-content active" id="tab-binder">
                    <div id="packsContainer">
                        <h3 style="margin-top: 0;">Unopened Packs</h3>
                        <div id="packsList"></div>
                    </div>
                    <div id="binderContainer">
                        <h3>Full Binder</h3>
                        <div class="generation-sets" id="generationSets"></div>
                    </div>
                    </div>

                    <div class="tab-content" id="tab-achievements">
                        <div id="achievementContainer">
                            <div class="achievement-list" id="achievementList"><p style="opacity:0.5;font-size:0.85em;">Loading achievements…</p></div>
                        </div>
                    </div>
                </div>

                <div id="animationOverlay">
                    <div class="animation-stage" id="animationStage">
                        <div class="pack-wrapper" id="packWrapper">
                            <div class="pack-top-flap" id="packFlap"><span>▼ DRAG DOWN ▼</span></div>
                            <div class="pack-body" id="packBody">POKÉMON</div>
                            <div class="card-3d" id="card3D">
                                <div class="card-face card-back">
                                    <img src="https://images.pokemontcg.io/cardback.png" alt="Card Back" />
                                </div>
                                <div class="card-face card-front" id="cardFrontText"></div>
                            </div>
                        </div>
                        <div class="pack-recap" id="packRecap">
                            <h4 id="packRecapTitle">Pack Results</h4>
                            <div class="pack-recap-grid" id="packRecapGrid"></div>
                        </div>
                    </div>
                    <div id="promptText">Click and drag down across the top to peel open!</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    window.addEventListener('load', () => {
                        vscode.postMessage({ command: 'ready' });
                    });

                    // ── Tab switching ──
                    const achievementList = document.getElementById('achievementList');
                    for (const tab of document.querySelectorAll('.tab')) {
                        tab.addEventListener('click', () => {
                            document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
                            document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
                            tab.classList.add('active');
                            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
                        });
                    }

                    function renderAchievements(achievements) {
                        const GROUPS = [
                            { label: 'XP Milestones', prefix: 'xp_' },
                            { label: 'Bug Fixing',    prefix: 'bugs_' },
                            { label: 'Packs Opened',  prefix: 'packs_' },
                            { label: 'Card Collection', prefix: 'cards_' },
                            { label: 'Generation Sets', prefix: 'gen' },
                            { label: 'Coding Sessions', prefix: 'session_|break_' },
                        ];

                        achievementList.innerHTML = '';
                        const unlocked = achievements.filter((a) => a.unlocked).length;
                        const total = achievements.length;
                        const progressEl = document.createElement('p');
                        progressEl.style.cssText = 'font-size:0.8em;opacity:0.7;margin:0 0 10px;';
                        progressEl.textContent = unlocked + ' / ' + total + ' achievements unlocked';
                        achievementList.appendChild(progressEl);

                        for (const group of GROUPS) {
                            const prefixes = group.prefix.split('|');
                            const groupItems = achievements.filter((a) => prefixes.some((p) => a.id.startsWith(p)));
                            if (groupItems.length === 0) { continue; }

                            const title = document.createElement('div');
                            title.className = 'achievement-group-title';
                            title.textContent = group.label;
                            achievementList.appendChild(title);

                            for (const achievement of groupItems) {
                                const div = document.createElement('div');
                                div.className = 'achievement ' + (achievement.unlocked ? 'unlocked' : 'locked');
                                div.innerHTML =
                                    '<span class="achievement-cat ach-cat-' + achievement.category + '">' + achievement.category + '</span>' +
                                    '<div><p class="achievement-name">' + achievement.name + '</p>' +
                                    '<p class="achievement-desc">' + achievement.description + '</p></div>' +
                                    '<span class="achievement-badge">' + (achievement.unlocked ? 'done' : 'locked') + '</span>';
                                achievementList.appendChild(div);
                            }
                        }
                    }
                    
                    const mainView = document.getElementById('mainView');
                    const packsList = document.getElementById('packsList');
                    const generationSets = document.getElementById('generationSets');
                    const overlay = document.getElementById('animationOverlay');
                    const animationStage = document.getElementById('animationStage');
                    const packWrapper = document.getElementById('packWrapper');
                    const packFlap = document.getElementById('packFlap');
                    const packBody = document.getElementById('packBody');
                    const card3D = document.getElementById('card3D');
                    const cardFrontText = document.getElementById('cardFrontText');
                    const packRecap = document.getElementById('packRecap');
                    const packRecapTitle = document.getElementById('packRecapTitle');
                    const packRecapGrid = document.getElementById('packRecapGrid');
                    const promptText = document.getElementById('promptText');

                    const pokemonMetaCache = new Map();
                    let latestBinderPayload = null;

                    let isDragging = false;
                    let startY = 0;
                    let currentCardObject = null;
                    let pulledCardsQueue = [];
                    let currentRevealIndex = 0;
                    let sequenceState = 'waitingToTear'; 

                    function getAnimationMetrics() {
                        const stageRect = animationStage.getBoundingClientRect();
                        const wrapperRect = packWrapper.getBoundingClientRect();
                        const cardRect = card3D.getBoundingClientRect();
                        const wrapperHeight = wrapperRect.height || 240;
                        const cardHeight = cardRect.height || Math.round(wrapperHeight * 0.83);

                        const desiredLift = Math.round(wrapperHeight * 0.58);
                        const desiredResetAbove = Math.round(wrapperHeight * 0.9);

                        const cardStartTop = wrapperRect.top + Math.round(wrapperHeight * 0.12);
                        const minCardTop = stageRect.top - Math.round(cardHeight * 0.5);
                        const maxAllowedLift = Math.max(0, Math.round(cardStartTop - minCardTop));
                        const safeMaxLift = Math.max(0, maxAllowedLift - Math.round(cardHeight * 0.1));

                        return {
                            lift: Math.min(desiredLift, safeMaxLift),
                            revealLift: Math.min(Math.round(wrapperHeight * 0.22), Math.round(safeMaxLift * 0.45)),
                            drop: Math.round(wrapperHeight * 1.15),
                            resetAbove: Math.min(desiredResetAbove, safeMaxLift),
                            slideDown: Math.round(wrapperHeight * 1.04)
                        };
                    }

                    function updateAnimationStageSizing() {
                        const viewportHeight = window.innerHeight;
                        const availableHeight = Math.max(240, viewportHeight - 110);
                        animationStage.style.maxHeight = availableHeight + 'px';
                    }

                    window.addEventListener('resize', updateAnimationStageSizing);

                    async function fetchPokemonMeta(id) {
                        if (pokemonMetaCache.has(id)) {
                            return pokemonMetaCache.get(id);
                        }

                        try {
                            const response = await fetch('https://pokeapi.co/api/v2/pokemon/' + id);
                            if (!response.ok) {
                                const emptyMeta = { imageUrl: '', name: 'Dex #' + id };
                                pokemonMetaCache.set(id, emptyMeta);
                                return emptyMeta;
                            }

                            const data = await response.json();
                            const imageUrl =
                                (data.sprites && data.sprites.other && data.sprites.other['official-artwork'] && data.sprites.other['official-artwork'].front_default)
                                || (data.sprites && data.sprites.front_default)
                                || '';

                            const apiName = (data.name || '').replace(/-/g, ' ');
                            const displayName = apiName
                                ? apiName.replace(/\b\w/g, (char) => char.toUpperCase())
                                : 'Dex #' + id;

                            const meta = { imageUrl, name: displayName };
                            pokemonMetaCache.set(id, meta);
                            return meta;
                        } catch (error) {
                            const fallbackMeta = { imageUrl: '', name: 'Dex #' + id };
                            pokemonMetaCache.set(id, fallbackMeta);
                            return fallbackMeta;
                        }
                    }

                    async function hydrateCardImagesAndNames(container) {
                        const imageNodes = container.querySelectorAll('img[data-pokemon-id]');
                        for (const imageNode of imageNodes) {
                            const pokemonId = Number(imageNode.dataset.pokemonId);
                            if (!pokemonId) {
                                continue;
                            }

                            const meta = await fetchPokemonMeta(pokemonId);
                            if (meta.imageUrl) {
                                imageNode.src = meta.imageUrl;
                            }

                            const nameNode = container.querySelector('[data-pokemon-name-id="' + pokemonId + '"]');
                            if (nameNode) {
                                nameNode.textContent = meta.name;
                            }
                        }
                    }

                    function renderBinder(payload) {
                        if (!payload) {
                            return;
                        }

                        latestBinderPayload = payload;

                        packsList.innerHTML = '';
                        if (payload.packs.length === 0) {
                            packsList.innerHTML = '<p style="opacity: 0.5; font-size: 0.9em;">No packs available.</p>';
                        } else {
                            payload.packs.forEach((pack, index) => {
                                const btn = document.createElement('div');
                                btn.className = 'pack-item';
                                btn.innerText = 'Open ' + (pack.label || 'Pack');
                                btn.onclick = () => vscode.postMessage({ command: 'openPack', packIndex: index });
                                packsList.appendChild(btn);
                            });
                        }

                        generationSets.innerHTML = '';

                        const cardsById = new Map();
                        payload.cards.forEach((cardObj) => {
                            const previous = cardsById.get(cardObj.id) || 0;
                            cardsById.set(cardObj.id, previous + 1);
                        });

                        const generationIds = [...new Set(payload.allCards.map((card) => card.generation))].sort((a, b) => a - b);
                        generationIds.forEach((generationId, index) => {
                            const generationCards = payload.allCards.filter((cardObj) => cardObj.generation === generationId);
                            const generationName = generationCards.length > 0 ? generationCards[0].generationName : 'Unknown';
                            const ownedInGeneration = generationCards.filter((cardObj) => (cardsById.get(cardObj.id) || 0) > 0).length;

                            const setContainer = document.createElement('details');
                            setContainer.className = 'generation-set';
                            if (index === 0) {
                                setContainer.open = true;
                            }

                            const summary = document.createElement('summary');
                            summary.innerHTML = 'Generation ' + generationId + ' - ' + generationName + '<span class="generation-meta">' + ownedInGeneration + '/' + generationCards.length + ' collected</span>';
                            setContainer.appendChild(summary);

                            const grid = document.createElement('div');
                            grid.className = 'card-grid';

                            generationCards.forEach((cardObj) => {
                                const count = cardsById.get(cardObj.id) || 0;
                                const div = document.createElement('div');

                                if (count > 0) {
                                    div.className = 'card';
                                    div.innerHTML = '<img data-pokemon-id="' + cardObj.id + '" alt="' + cardObj.name + '"><span class="name" data-pokemon-name-id="' + cardObj.id + '">' + cardObj.name + '</span><span style="font-size:0.7em; opacity:0.6; margin-top:4px;">x' + count + '</span>';
                                } else {
                                    div.className = 'card unowned';
                                    div.innerHTML = '<img data-pokemon-id="' + cardObj.id + '" alt="' + cardObj.name + '"><span class="name" data-pokemon-name-id="' + cardObj.id + '">' + cardObj.name + '</span><span style="font-size:0.7em; opacity:0.6; margin-top:4px;">x0</span>';
                                }

                                grid.appendChild(div);
                            });

                            setContainer.appendChild(grid);
                            generationSets.appendChild(setContainer);
                        });

                        hydrateCardImagesAndNames(generationSets);
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'updateBinder') {
                            renderBinder(message);
                        }

                        if (message.type === 'updateAchievements') {
                            renderAchievements(message.achievements);
                        }

                        if (message.type === 'initPackOpening') {
                            pulledCardsQueue = Array.isArray(message.cards) && message.cards.length > 0
                                ? message.cards
                                : (message.card ? [message.card] : []);
                            currentRevealIndex = 0;
                            currentCardObject = pulledCardsQueue[0] || null;
                            sequenceState = 'waitingToTear';
                            
                            mainView.style.display = 'none';
                            overlay.style.display = 'flex';
                            packRecap.style.display = 'none';
                            card3D.style.display = 'none';
                            card3D.style.transform = 'translateY(0) rotateY(0)';
                            packFlap.style.transform = 'rotateX(0deg) translateY(0px)';
                            packFlap.style.opacity = '1';
                            packFlap.style.display = 'flex';
                            packWrapper.style.display = 'block';
                            packBody.style.transition = 'none';
                            packBody.style.transform = 'translateY(0px)';
                            packBody.style.opacity = '1';

                            promptText.innerText = 'Click and drag down across the top to peel open ' + (message.packLabel || 'this pack') + ' (' + pulledCardsQueue.length + ' cards)!';
                            updateAnimationStageSizing();
                        }
                    });

                    packWrapper.addEventListener('mousedown', (e) => {
                        if (sequenceState !== 'waitingToTear') return;
                        isDragging = true;
                        startY = e.clientY;
                    });

                    window.addEventListener('mousemove', (e) => {
                        if (!isDragging || sequenceState !== 'waitingToTear') return;
                        const deltaY = e.clientY - startY;
                        if (deltaY > 0) {
                            const angle = Math.min(deltaY * 1.5, 130); 
                            packFlap.style.transform = \`rotateX(-\${angle}deg) translateY(\${deltaY * 0.2}px)\`;
                            if (deltaY > 80) {
                                isDragging = false;
                                commitTearSequence();
                            }
                        }
                    });

                    window.addEventListener('mouseup', () => {
                        if (sequenceState !== 'waitingToTear') return;
                        isDragging = false;
                        packFlap.style.transition = 'transform 0.3s ease';
                        packFlap.style.transform = 'rotateX(0deg) translateY(0px)';
                        setTimeout(() => packFlap.style.transition = '', 300);
                    });

                    function commitTearSequence() {
                        sequenceState = 'sliding';
                        promptText.innerText = '';
                        packFlap.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                        packFlap.style.transform = 'translateY(100px) rotateX(-180deg)';
                        packFlap.style.opacity = '0';
                        setTimeout(() => {
                            packFlap.style.display = 'none';
                            executeCardSlideOut();
                        }, 400);
                    }

                    function executeCardSlideOut() {
                        const metrics = getAnimationMetrics();
                        card3D.style.display = 'block';
                        card3D.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
                        card3D.style.transform = 'translateY(-' + metrics.lift + 'px)';
                        packBody.style.transition = 'transform 0.8s ease-in, opacity 0.8s ease-in';
                        packBody.style.transform = 'translateY(' + metrics.slideDown + 'px)';
                        packBody.style.opacity = '0';

                        setTimeout(() => executeHighVelocitySpin(), 850);
                    }

                    function executeHighVelocitySpin() {
                        if (!currentCardObject) {
                            sequenceState = 'complete';
                            promptText.innerText = 'Click anywhere to return to binder';
                            return;
                        }

                        sequenceState = 'spinning';
                        card3D.style.opacity = '1';
                        card3D.style.transition = 'none';
                        
                        cardFrontText.innerHTML = '<div class="title" data-pokemon-name-id="' + currentCardObject.id + '">' + currentCardObject.name + '</div><img data-pokemon-id="' + currentCardObject.id + '" alt="' + currentCardObject.name + '"><div class="subtitle">Dex #' + currentCardObject.id + '</div>';
                        hydrateCardImagesAndNames(cardFrontText);

                        let angle = 0;
                        let velocity = 45; 
                        const deceleration = 0.94; 
                        const metrics = getAnimationMetrics();
                        
                        function spinLoop() {
                            angle += velocity;
                            card3D.style.transform = 'translateY(-' + metrics.revealLift + 'px) scale(1.1) rotateY(' + angle + 'deg)';
                            velocity *= deceleration;

                            if (velocity > 0.5) {
                                requestAnimationFrame(spinLoop);
                            } else {
                                card3D.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                                card3D.style.transform = 'translateY(-' + metrics.revealLift + 'px) scale(1.1) rotateY(180deg)';
                                setTimeout(() => {
                                    sequenceState = 'revealed';
                                    const remainingCards = pulledCardsQueue.length - currentRevealIndex - 1;
                                    if (remainingCards > 0) {
                                        promptText.innerText = 'Click to drop this card and reveal the next (' + remainingCards + ' left)';
                                    } else {
                                        promptText.innerText = 'Click anywhere to return to binder';
                                    }
                                }, 600);
                            }
                        }
                        spinLoop();
                    }

                    function dropCardAndRevealNext() {
                        const metrics = getAnimationMetrics();
                        sequenceState = 'dropping';
                        promptText.innerText = 'Dropping card...';
                        card3D.style.transition = 'transform 0.45s ease-in, opacity 0.45s ease-in';
                        card3D.style.transform = 'translateY(' + metrics.drop + 'px) scale(0.9) rotateY(180deg)';
                        card3D.style.opacity = '0';

                        setTimeout(() => {
                            currentRevealIndex += 1;
                            currentCardObject = pulledCardsQueue[currentRevealIndex] || null;

                            card3D.style.transition = 'none';
                            card3D.style.transform = 'translateY(-' + metrics.resetAbove + 'px) scale(0.95) rotateY(0deg)';
                            card3D.style.opacity = '1';

                            promptText.innerText = 'Revealing card ' + (currentRevealIndex + 1) + ' of ' + pulledCardsQueue.length;
                            requestAnimationFrame(() => executeHighVelocitySpin());
                        }, 480);
                    }

                    function showPackRecap() {
                        sequenceState = 'recap';
                        card3D.style.display = 'none';
                        packWrapper.style.display = 'none';
                        packRecap.style.display = 'block';

                        packRecapTitle.textContent = 'Pack Results (' + pulledCardsQueue.length + ' cards)';
                        packRecapGrid.innerHTML = '';

                        pulledCardsQueue.forEach((cardObj) => {
                            const item = document.createElement('div');
                            item.className = 'pack-recap-card';
                            item.innerHTML = '<img data-pokemon-id="' + cardObj.id + '" alt="' + cardObj.name + '"><div data-pokemon-name-id="' + cardObj.id + '">' + cardObj.name + '</div>';
                            packRecapGrid.appendChild(item);
                        });

                        hydrateCardImagesAndNames(packRecapGrid);
                        promptText.innerText = 'Click anywhere to return to binder';
                    }

                    overlay.addEventListener('click', () => {
                        if (sequenceState === 'revealed') {
                            const hasMoreCards = currentRevealIndex < pulledCardsQueue.length - 1;
                            if (hasMoreCards) {
                                dropCardAndRevealNext();
                                return;
                            }

                            showPackRecap();
                            return;
                        }

                        if (sequenceState !== 'recap' && sequenceState !== 'complete') return;
                        overlay.style.display = 'none';
                        packRecap.style.display = 'none';
                        packWrapper.style.display = 'block';
                        mainView.style.display = 'block';
                        vscode.postMessage({ command: 'openPack', packIndex: -1 }); 
                    });
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = { BinderWebviewProvider };