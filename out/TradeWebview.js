"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTradeWebviewContent = void 0;
const getTradeWebviewContent = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
        :root {
            --bg: radial-gradient(circle at 85% 15%, #1b4f66 0%, #102436 45%, #09121a 100%);
            --panel: rgba(9, 17, 25, 0.75);
            --line: rgba(255, 255, 255, 0.14);
            --text: #f2ecde;
            --muted: #a8b8c7;
            --accent: #f0c34f;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            padding: 20px;
            font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
            color: var(--text);
            background: var(--bg);
        }
        .shell {
            max-width: 860px;
            margin: 0 auto;
            display: grid;
            gap: 12px;
        }
        .panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 16px;
            backdrop-filter: blur(6px);
        }
        h1, h2 { margin-top: 0; }
        p { color: var(--muted); }
        textarea {
            width: 100%;
            min-height: 108px;
            border-radius: 10px;
            border: 1px solid var(--line);
            background: rgba(255, 255, 255, 0.04);
            color: var(--text);
            padding: 10px;
            font-family: Consolas, 'Courier New', monospace;
        }
        .row { display: flex; gap: 8px; flex-wrap: wrap; }
        button {
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.06);
            color: var(--text);
            cursor: pointer;
        }
        button:hover { border-color: var(--accent); }
        #status { min-height: 20px; color: var(--accent); }
    </style>
</head>
<body>
    <main class="shell">
        <section class="panel">
            <h1>Secure Trading</h1>
            <p>Generate a link code from your local collection and share it. Importing a valid code adds those cards to your binder.</p>
            <div class="row">
                <button id="generate">Generate Link Code</button>
                <button id="copy">Copy Code</button>
            </div>
            <textarea id="tradeCode" placeholder="Trade code will appear here"></textarea>
        </section>
        <section class="panel">
            <h2>Import Link Code</h2>
            <textarea id="importCode" placeholder="Paste your friend's code"></textarea>
            <div class="row">
                <button id="import">Import Code</button>
            </div>
        </section>
        <div id="status"></div>
    </main>
    <script>
        const vscode = acquireVsCodeApi();
        const tradeCode = document.getElementById('tradeCode');
        const importCode = document.getElementById('importCode');
        const status = document.getElementById('status');

        document.getElementById('generate').addEventListener('click', () => {
            vscode.postMessage({ command: 'generateTradeCode' });
        });

        document.getElementById('copy').addEventListener('click', async () => {
            if (!tradeCode.value) {
                status.textContent = 'Nothing to copy yet.';
                return;
            }
            await navigator.clipboard.writeText(tradeCode.value);
            status.textContent = 'Trade code copied to clipboard.';
        });

        document.getElementById('import').addEventListener('click', () => {
            vscode.postMessage({ command: 'importTradeCode', code: importCode.value.trim() });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            if (!message) {
                return;
            }
            if (message.command === 'tradeCodeGenerated') {
                tradeCode.value = message.code;
                status.textContent = 'New code generated.';
            }
            if (message.command === 'tradeStatus') {
                status.textContent = message.text;
            }
        });
    </script>
</body>
</html>`;
exports.getTradeWebviewContent = getTradeWebviewContent;
//# sourceMappingURL=TradeWebview.js.map