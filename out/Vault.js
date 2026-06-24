"use strict";
// src/Vault.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSecure = saveSecure;
exports.loadSecure = loadSecure;
const SECRET_SALT = "ValkyrieDev-2026-Secret-CodeMon-Key";
function saveSecure(data) {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString + SECRET_SALT).toString('base64');
}
function loadSecure(encoded) {
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const jsonString = decoded.replace(SECRET_SALT, '');
        return JSON.parse(jsonString);
    }
    catch (e) {
        return null; // Handle tampering or corruption
    }
}
//# sourceMappingURL=Vault.js.map