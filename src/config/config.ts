// config.ts
import * as vscode from 'vscode';
import { Dot8AssetManagerConfig } from './dot8AssetManagerConfig';



// Global config instance
export let config: Dot8AssetManagerConfig = loadConfig();

/**
 * Loads extension settings from the current workspace configuration.
 */
function loadConfig(): Dot8AssetManagerConfig {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');

    console.log('Loading config:');
    console.log('rootFolder:', cfg.rootPath);

    return {
        scanFolders: cfg.ScanFolders,
        scanExtensions: cfg.ScanExtensions,
    };
}

/**
 * Reloads the in-memory configuration from VS Code settings.
 */
export function reloadConfig(): void {
    config = loadConfig();
}

/**
 * Subscribes to configuration changes and refreshes config when relevant
 * extension settings are updated.
 */
export function watchConfig(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('dot8assetmanager')) {
                reloadConfig();
            }
        })
    );
}


/**
 * Persists the current in-memory configuration to workspace-folder settings.
 */
export async function saveConfig():Promise<void> {
    const cfg = vscode.workspace.getConfiguration(
        'dot8assetmanager',
        vscode.workspace.workspaceFolders?.[0]?.uri
    );

    await cfg.update('scanFolders', config.scanFolders,  vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('scanExtensions', config.scanExtensions,  vscode.ConfigurationTarget.WorkspaceFolder);
}