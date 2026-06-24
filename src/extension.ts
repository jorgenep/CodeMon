import * as vscode from 'vscode';
import { getWebviewContent } from './BinderWebview';
import { POKEMON_DATABASE, PokemonCard } from './PokemonDB';
import { openPack, SHOP_INVENTORY } from './ShopDB';
import { defaultState, GameState, sanitizeState } from './State';
import { getTradeWebviewContent } from './TradeWebview';
import { loadSecure, saveSecure } from './Vault';

const STATE_KEY = 'codemon.state';
const XP_PER_LINE = 2;
const XP_PER_DIAGNOSTIC_FIX = 20;
const FLOW_BONUS_XP = 35;
const FLOW_IDLE_WINDOW_MS = 90_000;
const FLOW_BONUS_INTERVAL_MS = 10 * 60 * 1000;
const CARD_BY_ID = new Map<number, PokemonCard>(POKEMON_DATABASE.map((card) => [card.id, card]));

interface TradePayload {
    cards: number[];
    issuedAt: number;
}

export function activate(context: vscode.ExtensionContext): void {
    const stateStore = new StateStore(context);
    const statusBar = createStatusBar();
    let state = stateStore.load();
    let lastActivityAt = 0;
    let lastFlowBonusAt = Date.now();
    const diagnosticCounts = new Map<string, number>();

    const refreshStatus = (): void => {
        statusBar.text = `$(symbol-class) XP ${state.xp} | Cards ${state.collection.length}`;
        statusBar.tooltip = 'CodeMon TCG: open binder';
        statusBar.show();
    };

    const persist = async (): Promise<void> => {
        await stateStore.save(state);
        refreshStatus();
    };

    const addXp = (amount: number, reason?: string): void => {
        if (amount <= 0) {
            return;
        }
        state.xp += amount;
        void persist();
        if (reason) {
            void vscode.window.setStatusBarMessage(`CodeMon +${amount} XP (${reason})`, 2200);
        }
    };

    const maybeAwardFlowBonus = (): void => {
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

        const render = (): void => {
            panel.webview.html = getWebviewContent(state.collection, state.xp, SHOP_INVENTORY);
        };

        render();

        const postRefresh = (): void => {
            void panel.webview.postMessage({
                command: 'refreshBinder',
                cards: state.collection,
                xp: state.xp
            });
        };

        panel.webview.onDidReceiveMessage(
            async (message: unknown) => {
                if (!message || typeof message !== 'object') {
                    return;
                }
                const command = (message as { command?: string }).command;
                if (command === 'openPack') {
                    const packId = (message as { packId?: string }).packId;
                    const config = SHOP_INVENTORY.find((pack) => pack.id === packId);
                    if (!config) {
                        void vscode.window.showWarningMessage('Unknown pack selected.');
                        return;
                    }
                    if (state.xp < config.cost) {
                        void vscode.window.showWarningMessage(`Not enough XP. ${config.name} costs ${config.cost} XP.`);
                        return;
                    }

                    state.xp -= config.cost;
                    const cards = openPack(config);
                    state.collection.push(...cards);
                    await persist();
                    postRefresh();
                    const names = cards.map((card) => card.name).join(', ');
                    void vscode.window.showInformationMessage(`Opened ${config.name}: ${names}`);
                }
            },
            undefined,
            context.subscriptions
        );
    });

    const openTrade = vscode.commands.registerCommand('codemon.openTrade', () => {
        const panel = vscode.window.createWebviewPanel('codemonTrade', 'CodeMon Trade', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        panel.webview.html = getTradeWebviewContent();

        panel.webview.onDidReceiveMessage(
            async (message: unknown) => {
                if (!message || typeof message !== 'object') {
                    return;
                }
                const command = (message as { command?: string }).command;
                if (command === 'generateTradeCode') {
                    const payload: TradePayload = {
                        cards: state.collection.map((card) => card.id),
                        issuedAt: Date.now()
                    };
                    const code = saveSecure(payload);
                    await panel.webview.postMessage({ command: 'tradeCodeGenerated', code });
                    return;
                }

                if (command === 'importTradeCode') {
                    const code = (message as { code?: string }).code;
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
                        .filter((card): card is PokemonCard => card !== null);

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
            },
            undefined,
            context.subscriptions
        );
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

export function deactivate(): void {
    // No teardown required.
}

class StateStore {
    constructor(private readonly context: vscode.ExtensionContext) {}

    load(): GameState {
        const encoded = String(this.context.globalState.get(STATE_KEY) ?? '');
        const decoded = loadSecure(encoded);
        return sanitizeState(decoded ?? defaultState());
    }

    async save(nextState: GameState): Promise<void> {
        const encoded = saveSecure(nextState);
        await this.context.globalState.update(STATE_KEY, encoded);
    }
}

function createStatusBar(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    item.command = 'codemon.openBinder';
    return item;
}

function decodeTradePayload(code: string): TradePayload | null {
    const data = loadSecure(code);
    if (!data || typeof data !== 'object') {
        return null;
    }

    const cards = (data as { cards?: unknown }).cards;
    const issuedAt = (data as { issuedAt?: unknown }).issuedAt;
    if (!Array.isArray(cards) || typeof issuedAt !== 'number') {
        return null;
    }

    const sanitizedIds = cards.filter((id): id is number => typeof id === 'number');
    return { cards: sanitizedIds, issuedAt };
}

function cardById(id: number): PokemonCard | null {
    return CARD_BY_ID.get(id) ?? null;
}
