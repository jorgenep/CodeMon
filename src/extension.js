const vscode = require('vscode');
const { initializeXPTracker } = require('./xpTracker');
const { createStatusBarWallet } = require('./statusBarWallet');
const { BinderWebviewProvider } = require('./binderWebview');
const { checkAchievements, getAchievementState } = require('./achievements');
const { pokemonDatabase, GENERATIONS } = require('./pokemonDatabase');

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

    // Initialize state tracking for XP types
    if (context.globalState.get('bugFixesDetected') === undefined) context.globalState.update('bugFixesDetected', 0);
    if (context.globalState.get('consistentCodingXP') === undefined) context.globalState.update('consistentCodingXP', 0);
    if (context.globalState.get('fileSavesTracked') === undefined) context.globalState.update('fileSavesTracked', 0);
    if (context.globalState.get('suspiciousActivitiesDetected') === undefined) context.globalState.update('suspiciousActivitiesDetected', 0);

    // 4. Start tracking background linting errors with advanced detection
    const xpTracker = initializeXPTracker(context, (amount, type, metadata) => {
        // Only award XP if amount is greater than 0
        if (amount <= 0) {
            if (type === 'bug_fix_flagged') {
                const suspicious = (context.globalState.get('suspiciousActivitiesDetected') || 0) + 1;
                context.globalState.update('suspiciousActivitiesDetected', suspicious);
                vscode.window.setStatusBarMessage('⚠️ Suspicious activity detected - no XP awarded', 3000);
            }
            return;
        }

        // Award XP
        let currentXp = context.globalState.get('xpBalance') || 0;
        currentXp += amount;
        context.globalState.update('xpBalance', currentXp);

        const totalXpEarned = (context.globalState.get('totalXpEarned') || 0) + amount;
        context.globalState.update('totalXpEarned', totalXpEarned);

        // Track by activity type
        let statusMessage = `$(check) +${amount} XP`;
        let activityType = 'unknown';

        switch (type) {
            case 'bug_fix':
                const bugsFixed = (context.globalState.get('bugsFixed') || 0) + 1;
                context.globalState.update('bugsFixed', bugsFixed);
                const bugDetects = (context.globalState.get('bugFixesDetected') || 0) + 1;
                context.globalState.update('bugFixesDetected', bugDetects);
                statusMessage = `$(check) Bug fixed! +${amount} XP`;
                activityType = 'bug_fix';
                break;
            case 'bug_fix_suspicious':
                const suspDetects = (context.globalState.get('suspiciousActivitiesDetected') || 0) + 1;
                context.globalState.update('suspiciousActivitiesDetected', suspDetects);
                const bugSuspFixed = (context.globalState.get('bugsFixed') || 0) + 1;
                context.globalState.update('bugsFixed', bugSuspFixed);
                statusMessage = `⚠️ Suspicious fix detected +${amount} XP (reduced)`;
                activityType = 'bug_fix_suspicious';
                if (metadata) {
                    console.log(`[Anti-Cheat] Trust Score: ${metadata.trustScore}/100, Suspicion: ${metadata.suspicionScore}/100`, metadata.factors);
                }
                break;
            case 'consistent_coding':
                const codingXp = (context.globalState.get('consistentCodingXP') || 0) + amount;
                context.globalState.update('consistentCodingXP', codingXp);
                statusMessage = `$(edit) Consistent coding! +${amount} XP`;
                activityType = 'consistent_coding';
                break;
            case 'file_save':
                const fileSaves = (context.globalState.get('fileSavesTracked') || 0) + 1;
                context.globalState.update('fileSavesTracked', fileSaves);
                statusMessage = `$(save) File saved! +${amount} XP`;
                activityType = 'file_save';
                break;
        }

        statusBarWallet.updateText();
        // Quiet inline status bar message — no modal popup
        vscode.window.setStatusBarMessage(statusMessage, 2500);
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

    // Utility Command: grant one free pack for demos and support workflows
    context.subscriptions.push(
        vscode.commands.registerCommand('codemon.addPack', async () => {
            const generation = await vscode.window.showQuickPick(
                GENERATIONS.map((gen) => ({
                    label: `Gen ${gen.id} ${gen.name}`,
                    description: `Cards #${gen.start}-${gen.end}`,
                    generation: gen.id
                })),
                { placeHolder: 'Choose a generation for the bonus pack' }
            );

            if (!generation) {
                return;
            }

            const packs = context.globalState.get('unopenedPacks') || [];
            packs.push({
                label: `${generation.label} Booster`,
                generation: generation.generation,
                cardsPerPack: 10
            });
            await context.globalState.update('unopenedPacks', packs);

            provider.updateBinderData();
            vscode.window.setStatusBarMessage('$(gift) Bonus pack added to inventory!', 2500);
        })
    );

    // Debug Command: Display anti-cheat stats and analysis
    context.subscriptions.push(
        vscode.commands.registerCommand('codemon.showStats', async () => {
            const stats = xpTracker.getActivityStats();
            const analysis = xpTracker.getDetailedAnalysis();
            
            const trustLevel = analysis.trustScore >= 80 ? '✅ Excellent' : 
                               analysis.trustScore >= 60 ? '⚠️ Good' :
                               analysis.trustScore >= 40 ? '⚠️ Moderate' : '🚫 Low';

            const message = `
📊 **CodeMon XP Tracker Stats**

🎮 Activity:
  • Total Edits: ${stats.editCount}
  • Bug Fixes: ${stats.errorFixCount}
  • Files Modified: ${Object.keys(stats.fileEditCounts).length}

🛡️ Anti-Cheat Analysis:
  • Trust Score: ${Math.round(analysis.trustScore)}/100 ${trustLevel}
  • Cheat Attempts Detected: ${analysis.cheatAttempts}
  • Suspicious Activities: ${context.globalState.get('suspiciousActivitiesDetected') || 0}

📈 XP Breakdown:
  • Bug Fixes (Direct): ${context.globalState.get('bugFixesDetected') || 0}
  • Consistent Coding XP: ${context.globalState.get('consistentCodingXP') || 0}
  • File Saves: ${context.globalState.get('fileSavesTracked') || 0}
  • Total XP Earned: ${context.globalState.get('totalXpEarned') || 0}

${analysis.recentHistory.length > 0 ? `📋 Recent Activity (Last 10):
${analysis.recentHistory.slice(-5).map((e, i) => 
  `  ${i + 1}. ${e.errorsFixed > 0 ? '✅ Fixed' : '❌ Created'} ${e.errorsFixed || e.errorsCreated} error(s) - ${e.errorType}`
).join('\n')}` : '  No recent activity'}
            `.trim();

            await vscode.window.showInformationMessage(message, { modal: false });
        })
    );

    // Debug Command: Reset anti-cheat stats (for testing)
    context.subscriptions.push(
        vscode.commands.registerCommand('codemon.resetStats', async () => {
            const confirmed = await vscode.window.showWarningMessage(
                'Reset all anti-cheat tracking data?',
                'Yes, reset',
                'Cancel'
            );
            
            if (confirmed === 'Yes, reset') {
                xpTracker.resetActivityStats();
                context.globalState.update('bugFixesDetected', 0);
                context.globalState.update('consistentCodingXP', 0);
                context.globalState.update('fileSavesTracked', 0);
                context.globalState.update('suspiciousActivitiesDetected', 0);
                vscode.window.setStatusBarMessage('✨ Anti-cheat stats reset!', 2000);
            }
        })
    );

    // Run achievement check once at startup to catch any pre-existing progress
    refreshAchievements();
}

function deactivate() {}
module.exports = { activate, deactivate };