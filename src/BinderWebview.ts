// src/BinderWebview.ts
export const getWebviewContent = (cards: any[], theme: string) => `
<!DOCTYPE html>
<html class="${theme}">
<body>
    <div id="binder-grid">
        ${cards.map(c => `<div>${c.name}</div>`).join('')}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function copyTradeCode(code) {
            navigator.clipboard.writeText(code);
            vscode.postMessage({ command: 'info', text: 'Trade code copied!' });
        }
    </script>
</body>
</html>`;