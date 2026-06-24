const vscode = require('vscode');
const pokemonDatabase = require('./pokemonDatabase'); // Import your new separate file!

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
                this.updateBinderData(); 
            } else if (message.command === 'openPack') {
                this._handleOpenPack(message.packIndex);
            }
        });
    }

    _handleOpenPack(packIndex) {
        if (packIndex === -1) {
            this.updateBinderData();
            return;
        }

        const packs = this._context.globalState.get('unopenedPacks') || [];
        if (packIndex >= 0 && packIndex < packs.length) {
            packs.splice(packIndex, 1);
            this._context.globalState.update('unopenedPacks', packs);

            // Pull a random Pokémon object from your new database
            const randomCard = this.allCards[Math.floor(Math.random() * this.allCards.length)];

            const currentCards = this._context.globalState.get('myCards') || [];
            currentCards.push(randomCard); // Now pushing an object: {id, name}
            this._context.globalState.update('myCards', currentCards);

            this._view.webview.postMessage({ type: 'initPackOpening', card: randomCard });
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
                <style>
                    :root {
                        --bg: var(--vscode-editor-background);
                        --fg: var(--vscode-editor-foreground);
                        --border: var(--vscode-panel-border);
                    }
                    body { font-family: sans-serif; padding: 15px; color: var(--fg); margin: 0; user-select: none; }
                    h3 { border-bottom: 1px solid var(--border); padding-bottom: 5px; margin-top: 20px; }
                    
                    .pack-item {
                        background: linear-gradient(135deg, #f12711, #f5af19);
                        color: white; padding: 12px; border-radius: 6px;
                        text-align: center; cursor: pointer; margin-bottom: 10px;
                        font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                    }

                    .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    
                    /* Updated Card CSS to handle images */
                    .card { 
                        border: 1px solid var(--border); padding: 10px 5px; 
                        text-align: center; border-radius: 6px; background: var(--bg);
                        font-weight: bold; display: flex; flex-direction: column;
                        align-items: center; justify-content: space-between;
                    }
                    .card img {
                        width: 80%; height: auto; margin-bottom: 5px;
                        filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
                    }
                    .card.unowned { opacity: 0.15; filter: grayscale(100%); border: 1px dashed var(--border); }
                    .card.unowned img { filter: brightness(0); } /* Black out the silhouette */

                    #animationOverlay {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(10, 10, 15, 0.95); display: none; flex-direction: column;
                        align-items: center; justify-content: center; z-index: 1000;
                    }

                    .pack-wrapper { width: 160px; height: 240px; position: relative; perspective: 1000px; cursor: grab; }
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
                        width: 140px; height: 200px; position: absolute; top: 30px; left: 10px;
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
                    }
                    .card-front img { width: 90%; drop-shadow(0 5px 5px rgba(0,0,0,0.4)); }
                    
                    .card-back { 
                        background: radial-gradient(circle, #2a5298, #1e3c72); color: #fbd72b; 
                        border: 6px solid #333; font-size: 1.5em; letter-spacing: 3px;
                    }

                    #promptText { color: #aaa; font-size: 0.9em; margin-top: 25px; text-align: center; min-height: 20px; font-weight: 500; }
                </style>
            </head>
            <body>
                <div id="mainView">
                    <div id="packsContainer">
                        <h3 style="margin-top: 0;">🎁 Unopened Packs</h3>
                        <div id="packsList"></div>
                    </div>
                    <div id="binderContainer">
                        <h3>📖 Full Binder</h3>
                        <div class="card-grid" id="cardContainer"></div>
                    </div>
                </div>

                <div id="animationOverlay">
                    <div class="pack-wrapper" id="packWrapper">
                        <div class="pack-top-flap" id="packFlap"><span>▼ DRAG DOWN ▼</span></div>
                        <div class="pack-body" id="packBody">POKÉMON</div>
                        <div class="card-3d" id="card3D">
                            <div class="card-face card-back">TCG</div>
                            <div class="card-face card-front" id="cardFrontText"></div>
                        </div>
                    </div>
                    <div id="promptText">Click and drag down across the top to peel open!</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    window.addEventListener('load', () => {
                        vscode.postMessage({ command: 'ready' });
                    });
                    
                    const mainView = document.getElementById('mainView');
                    const packsList = document.getElementById('packsList');
                    const cardContainer = document.getElementById('cardContainer');
                    const overlay = document.getElementById('animationOverlay');
                    const packWrapper = document.getElementById('packWrapper');
                    const packFlap = document.getElementById('packFlap');
                    const packBody = document.getElementById('packBody');
                    const card3D = document.getElementById('card3D');
                    const cardFrontText = document.getElementById('cardFrontText');
                    const promptText = document.getElementById('promptText');

                    let isDragging = false;
                    let startY = 0;
                    let currentCardObject = null;
                    let sequenceState = 'waitingToTear'; 

                    // Helper to generate the PokeAPI image URL
                    function getImageUrl(id) {
                        return \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/\${id}.png\`;
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'updateBinder') {
                            packsList.innerHTML = '';
                            if (message.packs.length === 0) {
                                packsList.innerHTML = '<p style="opacity: 0.5; font-size: 0.9em;">No packs available.</p>';
                            } else {
                                message.packs.forEach((packName, index) => {
                                    const btn = document.createElement('div');
                                    btn.className = 'pack-item';
                                    btn.innerText = 'Open ' + packName;
                                    btn.onclick = () => vscode.postMessage({ command: 'openPack', packIndex: index });
                                    packsList.appendChild(btn);
                                });
                            }

                            cardContainer.innerHTML = '';
                            message.allCards.forEach(cardObj => {
                                // Filter based on the Object's ID
                                const count = message.cards.filter(c => c.id === cardObj.id).length;
                                const div = document.createElement('div');
                                
                                if (count > 0) {
                                    div.className = 'card';
                                    div.innerHTML = \`<img src="\${getImageUrl(cardObj.id)}"><span>\${cardObj.name}</span><span style="font-size:0.7em; opacity:0.6; margin-top:4px;">x\${count}</span>\`;
                                } else {
                                    div.className = 'card unowned';
                                    // Use the same image URL, CSS filter will make it a black silhouette
                                    div.innerHTML = \`<img src="\${getImageUrl(cardObj.id)}"><span>???</span>\`;
                                }
                                cardContainer.appendChild(div);
                            });
                        }

                        if (message.type === 'initPackOpening') {
                            currentCardObject = message.card;
                            sequenceState = 'waitingToTear';
                            
                            mainView.style.display = 'none';
                            overlay.style.display = 'flex';
                            card3D.style.display = 'none';
                            card3D.style.transform = 'translateY(0) rotateY(0)';
                            packFlap.style.transform = 'rotateX(0deg) translateY(0px)';
                            packFlap.style.opacity = '1';
                            packFlap.style.display = 'flex';
                            packBody.style.transition = 'none';
                            packBody.style.transform = 'translateY(0px)';
                            packBody.style.opacity = '1';

                            promptText.innerText = 'Click and drag down across the top to peel open!';
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
                        card3D.style.display = 'block';
                        card3D.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
                        card3D.style.transform = 'translateY(-140px)';
                        packBody.style.transition = 'transform 0.8s ease-in, opacity 0.8s ease-in';
                        packBody.style.transform = 'translateY(250px)';
                        packBody.style.opacity = '0';

                        setTimeout(() => executeHighVelocitySpin(), 850);
                    }

                    function executeHighVelocitySpin() {
                        sequenceState = 'spinning';
                        card3D.style.transition = 'none';
                        
                        // Inject the actual image into the 3D card front!
                        cardFrontText.innerHTML = \`<img src="\${getImageUrl(currentCardObject.id)}"><span style="font-size:0.8em;">\${currentCardObject.name}</span>\`;

                        let angle = 0;
                        let velocity = 45; 
                        const deceleration = 0.94; 
                        
                        function spinLoop() {
                            angle += velocity;
                            card3D.style.transform = \`translateY(-140px) scale(1.1) rotateY(\${angle}deg)\`;
                            velocity *= deceleration;

                            if (velocity > 0.5) {
                                requestAnimationFrame(spinLoop);
                            } else {
                                card3D.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                                card3D.style.transform = 'translateY(-140px) scale(1.1) rotateY(180deg)';
                                setTimeout(() => {
                                    sequenceState = 'complete';
                                    promptText.innerText = 'Click anywhere to return to binder';
                                }, 600);
                            }
                        }
                        spinLoop();
                    }

                    overlay.addEventListener('click', () => {
                        if (sequenceState !== 'complete') return;
                        overlay.style.display = 'none';
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