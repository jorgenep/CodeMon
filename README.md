# CodeMon TCG: The Gamified Developer Experience

**Turn your syntax errors into shiny holographics!** CodeMon TCG is a VS Code extension that transforms your daily debugging grind into a rewarding Trading Card Game experience. Fix code, earn XP, buy booster packs, and build your ultimate card binder—all without leaving your editor.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blueviolet.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## Features

### The Grind: Squash Bugs for XP
No more silent relief when the red squiggles disappear. CodeMon TCG listens to your active workspace diagnostics. Every time you successfully clear an error or linter warning and save your file, you are rewarded with an XP drop. 
* *Example: Fixed a missing semicolon? +10 XP. Resolved a nasty type error? +50 XP.*

### The Shop: Status Bar Economy
Keep an eye on your wallet right in the VS Code Status Bar. Your current XP balance is always visible at the bottom of your screen. Click the balance to open the Quick Pick menu and spend your hard-earned XP on Booster Packs.
* *Basic Pack:* 100 XP
* *Type-Specific Pack (e.g., Fire, Water, Electric):* 500 XP

### The Reveal: Tear Open Packs
Purchasing a pack triggers an interactive Webview in your sidebar. Experience the dopamine hit of a real TCG with smooth CSS animations as you flip over your new cards. Will you pull a common Pidgey, or a Holographic Charizard?

### The Binder: Sidebar Collection
Your sidebar acts as your digital binder. Track your collection completion percentage, view your rarest pulls, and manage your duplicates directly within the VS Code UI.

---

## Getting Started

### Installation
1. Open VS Code.
2. Navigate to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for **CodeMon TCG**.
4. Click **Install**.

### How to Play
1. Open any coding project and start typing. 
2. Make a mistake (it happens to the best of us).
3. Fix the syntax error, clear the linter warning, and save the file.
4. Watch your XP grow in the bottom Status Bar!
5. Click your XP balance to buy a pack.
6. Open the CodeMon icon in your Activity Bar (Sidebar) to rip the pack open and view your binder.

---

## Extension Architecture

For developers interested in contributing, CodeMon TCG utilizes the following VS Code APIs:
* **`vscode.languages.onDidChangeDiagnostics`**: Tracks the addition and removal of file errors/warnings to calculate XP rewards.
* **`vscode.window.createStatusBarItem`**: Anchors the live XP wallet and shop trigger to the bottom of the editor.
* **`vscode.window.registerWebviewViewProvider`**: Powers the Sidebar Binder and handles the DOM manipulation/CSS animations for pack openings.

---

## Contributing

Pull requests are welcome! If you have ideas for new card types, better pack-opening animations, or new ways to earn XP (like maintaining a Git commit streak), feel free to open an issue or submit a PR.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Publisher:** Valkyrie Dev  
**Author:** Elijah Paul Jorgensen