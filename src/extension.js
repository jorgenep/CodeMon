const vscode = require('vscode');
const { initializeXPTracker } = require('./xpTracker');
const { createStatusBarWallet } = require('./statusBarWallet');
const { BinderWebviewProvider } = require('./binderWebview');

function activate(context) {
    console.log('CodeMon TCG is active!');

    // 1. Initialize State Variables
    if (context.globalState.get('xpBalance') === undefined) context.globalState.update('xpBalance', 0);
    if (context.globalState.get('myCards') === undefined) context.globalState.update('myCards', []);
    if (context.globalState.get('unopenedPacks') === undefined) context.globalState.update('unopenedPacks', []); // NEW

    // 2. Initialize the Sidebar Webview
    const provider = new BinderWebviewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codemon.binderView', provider)
    );

    // 3. Initialize the bottom Status Bar item
    const statusBarWallet = createStatusBarWallet(context, provider);
    context.subscriptions.push(statusBarWallet);

    // 4. Start tracking background linting errors
    initializeXPTracker(context, () => {
        let currentXp = context.globalState.get('xpBalance') || 0;
        currentXp += 10;
        context.globalState.update('xpBalance', currentXp);
        
        statusBarWallet.updateText();
        provider.updateBinderData(); 
        
        vscode.window.showInformationMessage('✨ Bug squashed! +10 XP');
    });
}

function deactivate() {}
module.exports = { activate, deactivate };