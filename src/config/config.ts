// config.ts

import * as vscode from 'vscode';
import { Dot8AssetManagerConfig } from './config/dot8assetmanagerConfig';



// Global config instance
export let config: Dot8AssetManagerConfig = loadConfig();

function loadConfig(): Dot8AssetManagerConfig {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');

    // // const target = vscode.ConfigurationTarget.WorkspaceFolder;
    // // const scope  = vscode.workspace.workspaceFolders?.[0]?.uri;
    // // const cfg    = vscode.workspace.getConfiguration('dot8assetmanager', scope);

    console.log('Loading config:');
    console.log('rootFolder:', cfg.rootPath);
    //console.log('apiKey:', cfg.a);
    //console.log('timeout:', cfg.get<number>('timeout'));
    //console.log('enabled:', cfg.get<boolean>('enabled'));

    return {
        rootFolder: cfg.rootPath ?? '',
        apiKey:    cfg.get<string>('apiKey')    ?? 'nan',
        timeout:   cfg.get<number>('timeout')   ?? -1,
        enabled:   cfg.get<boolean>('enabled')  ?? false,
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

    await cfg.update('rootFolder', config.rootFolder,  vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('apiKey',    config.apiKey,     vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('timeout',   Number(config.timeout), vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('enabled',   config.enabled,     vscode.ConfigurationTarget.WorkspaceFolder);}