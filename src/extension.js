const vscode = require('vscode');
const { initializeXPTracker } = require('./xpTracker');
const { createStatusBarWallet } = require('./statusBarWallet');
const { BinderWebviewProvider } = require('./binderWebview');
const { checkAchievements, getAchievementState } = require('./achievements');
const { pokemonDatabase } = require('./pokemonDatabase');

function activate(context) {
    // context.globalState.update('myCards', []); // Uncomment to reset cards for testing
    // context.globalState.update('xpBalance', 0); // Reset XP balance for testing
    // context.globalState.update('unopenedPacks', []); // Reset unopened packs for testing
    console.log('CodeMon TCG is active!');

    // 1. Initialize State Variables
    if (context.globalState.get('xpBalance') === undefined) context.globalState.update('xpBalance', 0);
    if (context.globalState.get('myCards') === undefined) context.globalState.update('myCards', []);
    if (context.globalState.get('unopenedPacks') === undefined) context.globalState.update('unopenedPacks', []);
    if (context.globalState.get('totalXpEarned') === undefined) context.globalState.update('totalXpEarned', 0);
    if (context.globalState.get('bugsFixed') === undefined) context.globalState.update('bugsFixed', 0);
    if (context.globalState.get('packsOpened') === undefined) context.globalState.update('packsOpened', 0);
    if (context.globalState.get('binderOpens') === undefined) context.globalState.update('binderOpens', 0);

    // 2. Initialize the Sidebar Webview
    const provider = new BinderWebviewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codemon.binderView', provider)
    );

    // 3. Initialize the bottom Status Bar item
    const statusBarWallet = createStatusBarWallet(context, provider);
    context.subscriptions.push(statusBarWallet);

    // Helper: check achievements and push updates to webview
    function refreshAchievements() {
        const newlyUnlocked = checkAchievements(context, pokemonDatabase);
        provider.updateAchievements(getAchievementState(context));
        if (newlyUnlocked.length > 0) {
            // Quiet status bar notification — no modal popup
            vscode.window.setStatusBarMessage('$(star) Achievement unlocked!', 4000);
        }
    }

    // 4. Start tracking background linting errors
    initializeXPTracker(context, () => {
        let currentXp = context.globalState.get('xpBalance') || 0;
        currentXp += 10;
        context.globalState.update('xpBalance', currentXp);

        const totalXpEarned = (context.globalState.get('totalXpEarned') || 0) + 10;
        context.globalState.update('totalXpEarned', totalXpEarned);

        const bugsFixed = (context.globalState.get('bugsFixed') || 0) + 1;
        context.globalState.update('bugsFixed', bugsFixed);

        statusBarWallet.updateText();
        // Quiet inline status bar message — no modal popup
        vscode.window.setStatusBarMessage('$(check) +10 XP', 2500);
        provider.updateBinderData();
        refreshAchievements();
    });

    // Track binder opens for the "take a break" achievement
    provider.onBinderOpened = () => {
        const opens = (context.globalState.get('binderOpens') || 0) + 1;
        context.globalState.update('binderOpens', opens);
        refreshAchievements();
    };

    // Track packs opened for achievements
    provider.onPackOpened = () => {
        const opened = (context.globalState.get('packsOpened') || 0) + 1;
        context.globalState.update('packsOpened', opened);
        refreshAchievements();
    };

    // Run achievement check once at startup to catch any pre-existing progress
    refreshAchievements();
}

function deactivate() {}
module.exports = { activate, deactivate };