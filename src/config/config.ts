// config.ts
import * as vscode from 'vscode';
import { Dot8AssetManagerConfig } from './dot8AssetManagerConfig';
import { loadLoggerConfig, LogFilter, Logger, OutputRouter, initializeLogger, logger } from '../services/logger';
import { TimerManager } from '../services/timer';

// Global config instance
export let config: Dot8AssetManagerConfig;

/**
 * Loads extension settings from the current workspace configuration.
 */
function loadConfig(): Dot8AssetManagerConfig {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');
    const logConfig = loadLoggerConfig();

    const Folders: string = cfg.get<string>("ScanFolders", "");
    const Extensions: string = cfg.get<string>("ScanExtensions", "");

    logger?.dispose();
    const router = new OutputRouter();
    const filter = new LogFilter(logConfig);
    const timer = new TimerManager();
    initializeLogger(router, filter, timer, logConfig);


    return {
        scanFolders: Folders.split(","),
        scanExtensions: Extensions.split(","),
        logLevel: logConfig.level
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
export async function saveConfig(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration(
        'dot8assetmanager',
        vscode.workspace.workspaceFolders?.[0]?.uri
    );

    await cfg.update('scanFolders', config.scanFolders, vscode.ConfigurationTarget.WorkspaceFolder);
    await cfg.update('scanExtensions', config.scanExtensions, vscode.ConfigurationTarget.WorkspaceFolder);
}