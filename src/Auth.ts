// src/Auth.ts
import * as vscode from 'vscode';

export async function getGitHubSession(): Promise<string | undefined> {
    try {
        const session = await vscode.authentication.getSession('github', ['user'], { 
            createIfNone: true 
        });
        return session ? session.accessToken : undefined;
    } catch (err) {
        return undefined;
    }
}