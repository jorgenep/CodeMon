"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const BinderWebview_1 = require("./BinderWebview");
const PokemonDB_1 = require("./PokemonDB");
const ShopDB_1 = require("./ShopDB");
const State_1 = require("./State");
const TradeWebview_1 = require("./TradeWebview");
const Vault_1 = require("./Vault");
const STATE_KEY = 'codemon.state';
const XP_PER_LINE = 2;
const XP_PER_DIAGNOSTIC_FIX = 20;
const FLOW_BONUS_XP = 35;
const FLOW_IDLE_WINDOW_MS = 90000;
const FLOW_BONUS_INTERVAL_MS = 10 * 60 * 1000;
const CARD_BY_ID = new Map(PokemonDB_1.POKEMON_DATABASE.map((card) => [card.id, card]));
function activate(context) {
    const stateStore = new StateStore(context);
    const statusBar = createStatusBar();
    let state = stateStore.load();
    let lastActivityAt = 0;
    let lastFlowBonusAt = Date.now();
    const diagnosticCounts = new Map();
    const refreshStatus = () => {
        statusBar.text = `$(symbol-class) XP ${state.xp} | Cards ${state.collection.length}`;
        statusBar.tooltip = 'CodeMon TCG: open binder';
        statusBar.show();
    };
    const persist = async () => {
        await stateStore.save(state);
        refreshStatus();
    };
    const addXp = (amount, reason) => {
        if (amount <= 0) {
            return;
        }
        state.xp += amount;
        void persist();
        if (reason) {
            void vscode.window.setStatusBarMessage(`CodeMon +${amount} XP (${reason})`, 2200);
        }
    };
    const maybeAwardFlowBonus = () => {
        const now = Date.now();
        const wasRecentlyActive = now - lastActivityAt < FLOW_IDLE_WINDOW_MS;
        const readyForBonus = now - lastFlowBonusAt > FLOW_BONUS_INTERVAL_MS;
        if (wasRecentlyActive && readyForBonus) {
            lastFlowBonusAt = now;
            addXp(FLOW_BONUS_XP, 'flow bonus');
        }
        lastActivityAt = now;
    };
    const openBinder = vscode.commands.registerCommand('codemon.openBinder', () => {
        const panel = vscode.window.createWebviewPanel('codemonBinder', 'CodeMon Binder', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        const render = () => {
            panel.webview.html = (0, BinderWebview_1.getWebviewContent)(state.collection, state.xp, ShopDB_1.SHOP_INVENTORY);
        };
        render();
        const postRefresh = () => {
            void panel.webview.postMessage({
                command: 'refreshBinder',
                cards: state.collection,
                xp: state.xp
            });
        };
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || typeof message !== 'object') {
                return;
            }
            const command = message.command;
            if (command === 'openPack') {
                const packId = message.packId;
                const config = ShopDB_1.SHOP_INVENTORY.find((pack) => pack.id === packId);
                if (!config) {
                    void vscode.window.showWarningMessage('Unknown pack selected.');
                    return;
                }
                if (state.xp < config.cost) {
                    void vscode.window.showWarningMessage(`Not enough XP. ${config.name} costs ${config.cost} XP.`);
                    return;
                }
                state.xp -= config.cost;
                const cards = (0, ShopDB_1.openPack)(config);
                state.collection.push(...cards);
                await persist();
                postRefresh();
                const names = cards.map((card) => card.name).join(', ');
                void vscode.window.showInformationMessage(`Opened ${config.name}: ${names}`);
            }
        }, undefined, context.subscriptions);
    });
    const openTrade = vscode.commands.registerCommand('codemon.openTrade', () => {
        const panel = vscode.window.createWebviewPanel('codemonTrade', 'CodeMon Trade', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, TradeWebview_1.getTradeWebviewContent)();
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || typeof message !== 'object') {
                return;
            }
            const command = message.command;
            if (command === 'generateTradeCode') {
                const payload = {
                    cards: state.collection.map((card) => card.id),
                    issuedAt: Date.now()
                };
                const code = (0, Vault_1.saveSecure)(payload);
                await panel.webview.postMessage({ command: 'tradeCodeGenerated', code });
                return;
            }
            if (command === 'importTradeCode') {
                const code = message.code;
                if (!code) {
                    await panel.webview.postMessage({ command: 'tradeStatus', text: 'Paste a code before importing.' });
                    return;
                }
                const parsed = decodeTradePayload(code);
                if (!parsed) {
                    await panel.webview.postMessage({ command: 'tradeStatus', text: 'Invalid trade code.' });
                    return;
                }
                const importedCards = parsed.cards
                    .map((id) => cardById(id))
                    .filter((card) => card !== null);
                if (importedCards.length === 0) {
                    await panel.webview.postMessage({ command: 'tradeStatus', text: 'Code contained no valid cards.' });
                    return;
                }
                state.collection.push(...importedCards);
                await persist();
                await panel.webview.postMessage({
                    command: 'tradeStatus',
                    text: `Imported ${importedCards.length} card(s) into your binder.`
                });
            }
        }, undefined, context.subscriptions);
    });
    const trackTyping = vscode.workspace.onDidChangeTextDocument((event) => {
        const addedLines = event.contentChanges.reduce((sum, change) => {
            if (!change.text) {
                return sum;
            }
            const lines = change.text.split('\n').length - 1;
            return sum + Math.max(lines, 0);
        }, 0);
        if (addedLines > 0) {
            addXp(addedLines * XP_PER_LINE, 'typing');
        }
        maybeAwardFlowBonus();
    });
    const trackDiagnostics = vscode.languages.onDidChangeDiagnostics((event) => {
        let fixedCount = 0;
        for (const uri of event.uris) {
            const key = uri.toString();
            const previous = diagnosticCounts.get(key) ?? 0;
            const current = vscode.languages.getDiagnostics(uri).length;
            diagnosticCounts.set(key, current);
            if (current < previous) {
                fixedCount += previous - current;
            }
        }
        if (fixedCount > 0) {
            addXp(fixedCount * XP_PER_DIAGNOSTIC_FIX, 'bug squash');
        }
    });
    context.subscriptions.push(openBinder, openTrade, trackTyping, trackDiagnostics, statusBar);
    refreshStatus();
    void persist();
}
function deactivate() {
    // No teardown required.
}
class StateStore {
    constructor(context) {
        this.context = context;
    }
    load() {
        const encoded = String(this.context.globalState.get(STATE_KEY) ?? '');
        const decoded = (0, Vault_1.loadSecure)(encoded);
        return (0, State_1.sanitizeState)(decoded ?? (0, State_1.defaultState)());
    }
    async save(nextState) {
        const encoded = (0, Vault_1.saveSecure)(nextState);
        await this.context.globalState.update(STATE_KEY, encoded);
    }
}
function createStatusBar() {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    item.command = 'codemon.openBinder';
    return item;
}
function decodeTradePayload(code) {
    const data = (0, Vault_1.loadSecure)(code);
    if (!data || typeof data !== 'object') {
        return null;
    }
    const cards = data.cards;
    const issuedAt = data.issuedAt;
    if (!Array.isArray(cards) || typeof issuedAt !== 'number') {
        return null;
    }
    const sanitizedIds = cards.filter((id) => typeof id === 'number');
    return { cards: sanitizedIds, issuedAt };
}
function cardById(id) {
    return CARD_BY_ID.get(id) ?? null;
}
//# sourceMappingURL=extension.js.map