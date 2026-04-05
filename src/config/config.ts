// config.ts
import * as vscode from 'vscode';
import { Dot8AssetManagerConfig } from './dot8assetmanagerConfig';



// Global config instance
export let config: Dot8AssetManagerConfig = loadConfig();

function loadConfig(): Dot8AssetManagerConfig {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');

    console.log('Loading config:');
    console.log('rootFolder:', cfg.rootPath);

    return {
        scanFolders: cfg.ScanFolders,
        scanExtensions: cfg.ScanExtensions,
    };
}

// Call this to reload config (e.g. when settings change)
export function reloadConfig(): void {
    config = loadConfig();
}

// Call this in your extension.ts activate()
export function watchConfig(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('dot8assetmanager')) {
                reloadConfig();
            }
        })
    );
}


export async function saveConfig():Promise<void> {
    const cfg = vscode.workspace.getConfiguration(
        'dot8assetmanager',
        vscode.workspace.workspaceFolders?.[0]?.uri
    );

    await cfg.update('scanFolders', config.scanFolders,  vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('scanExtensions', config.scanExtensions,  vscode.ConfigurationTarget.WorkspaceFolder);
}