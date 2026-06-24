// src/Vault.ts
const SECRET_SALT = "ValkyrieDev-2026-Secret-CodeMon-Key";

export function saveSecure(data: any): string {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString + SECRET_SALT).toString('base64');
}

export function loadSecure(encoded: string): any {
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const jsonString = decoded.replace(SECRET_SALT, '');
        return JSON.parse(jsonString);
    } catch (e) {
        return null; // Handle tampering or corruption
    }
}