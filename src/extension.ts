// src/extension.ts
import * as vscode from 'vscode';
import { saveSecure, loadSecure } from './Vault';

export function activate(context: vscode.ExtensionContext) {
    let collection = loadSecure(context.globalState.get('collection') || "") || [];

    context.subscriptions.push(vscode.commands.registerCommand('codemon.openBinder', () => {
        const panel = vscode.window.createWebviewPanel('binder', 'Binder', vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = require('./BinderWebview').getWebviewContent(collection, 'theme-default');
    }));

    // Example: Save logic
    function sync() {
        context.globalState.update('collection', saveSecure(collection));
    }
}

// Add to src/extension.ts
import { getGitHubSession } from './Auth';
import { COSMETICS_INVENTORY } from './CosmeticsDB';

// Logic to "Buy" a cosmetic
async function buyCosmetic(itemId: string, context: vscode.ExtensionContext) {
    const item = COSMETICS_INVENTORY.find(i => i.id === itemId);
    let userState = loadSecure(context.globalState.get('state') || "");

    if (item && userState.coins >= item.cost) {
        userState.coins -= item.cost;
        userState.ownedCosmetics.push(item.id);
        context.globalState.update('state', saveSecure(userState));
        vscode.window.showInformationMessage(`Equipped ${item.name}!`);
    }
}