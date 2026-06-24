const vscode = require('vscode');

function createStatusBarWallet(context, provider) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'codemon.openShop';

    statusBarItem.updateText = () => {
        const xp = context.globalState.get('xpBalance') || 0;
        statusBarItem.text = `⚡ ${xp} XP`;
    };

    const shopCommand = vscode.commands.registerCommand('codemon.openShop', async () => {
        const xp = context.globalState.get('xpBalance') || 0;
        const choice = await vscode.window.showQuickPick([
            { label: '📦 Basic Booster Pack', description: 'Costs 100 XP', cost: 100 }
        ], { placeHolder: `Select a pack to buy. Current Balance: ${xp} XP` });

        if (choice) {
            if (xp >= choice.cost) {
                // Deduct XP
                context.globalState.update('xpBalance', xp - choice.cost);
                statusBarItem.updateText();

                // Save pack to inventory instead of opening
                const packs = context.globalState.get('unopenedPacks') || [];
                packs.push(choice.label);
                context.globalState.update('unopenedPacks', packs);

                provider.updateBinderData();
                vscode.window.showInformationMessage(`Added ${choice.label} to your inventory! Open the sidebar to rip it.`);
            } else {
                vscode.window.showErrorMessage("Not enough XP! Keep fixing errors.");
            }
        }
    });

    context.subscriptions.push(shopCommand);
    statusBarItem.updateText();
    statusBarItem.show();

    return statusBarItem;
}

module.exports = { createStatusBarWallet };