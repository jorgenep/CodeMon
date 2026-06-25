const vscode = require('vscode');
const { GENERATIONS } = require('./pokemonDatabase');

const BASE_PACK_COST = 100;

const GENERATION_PACKS = GENERATIONS.map((generation) => ({
    label: `Gen ${generation.id} ${generation.name} Booster`,
    description: `10 cards from Generation ${generation.id} (${generation.start}-${generation.end})`,
    cost: BASE_PACK_COST,
    generation: generation.id,
    cardsPerPack: 10
}));

function createStatusBarWallet(context, provider) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'codemon.openShop';

    statusBarItem.updateText = () => {
        const xp = context.globalState.get('xpBalance') || 0;
        statusBarItem.text = `$(zap) ${xp} XP`;
    };

    const shopCommand = vscode.commands.registerCommand('codemon.openShop', async () => {
        const xp = context.globalState.get('xpBalance') || 0;
        const choice = await vscode.window.showQuickPick(
            GENERATION_PACKS.map((pack) => ({
                label: pack.label,
                description: `${pack.description} • ${pack.cost} XP`,
                pack
            })),
            { placeHolder: `Select a generation pack. Current Balance: ${xp} XP` }
        );

        if (choice) {
            if (xp >= choice.pack.cost) {
                // Deduct XP
                context.globalState.update('xpBalance', xp - choice.pack.cost);
                statusBarItem.updateText();

                // Save pack to inventory instead of opening
                const packs = context.globalState.get('unopenedPacks') || [];
                packs.push({
                    label: choice.pack.label,
                    generation: choice.pack.generation,
                    cardsPerPack: choice.pack.cardsPerPack
                });
                context.globalState.update('unopenedPacks', packs);

                provider.updateBinderData();
                vscode.window.showInformationMessage(`Added ${choice.pack.label} to your inventory! Open the sidebar to rip it.`);
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