// config.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Dot8AssetManagerConfig } from './dot8AssetManagerConfig';
import { loadLoggerConfig, LogFilter, Logger, OutputRouter, initializeLogger, logger } from '../services/logger';
import { TimerManager } from '../services/timer';

// Global config instance
export let config: Dot8AssetManagerConfig;
let reloadConfigTimer: NodeJS.Timeout | undefined;

function isTrulyAbsolutePath(inputPath: string): boolean {
    // On Windows, path.isAbsolute('/foo') is true (rooted path on current drive).
    // Treat single-leading-slash paths as workspace-relative for extension settings.
    if (process.platform === 'win32' && /^[/\\](?![/\\])/.test(inputPath)) {
        return false;
    }

    return path.isAbsolute(inputPath);
}

/**
 * Loads extension settings from the current workspace configuration.
 */
function loadConfig(): Dot8AssetManagerConfig {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');
    const Folders: string = cfg.get<string>("ScanFolders", "");
    const Extensions: string = cfg.get<string>("ScanExtensions", "");
    const AutoScan: boolean = cfg.get<boolean>("AutoScan", true);
    const logConfig = loadLoggerConfig(cfg);

    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(wf => wf.uri.fsPath);
    const resolvedFolders = Folders
        .split(",")
        .map(f => f.trim())
        .filter(f => f.length > 0)
        .map(f => {
            if (isTrulyAbsolutePath(f)) { return f; }
            // For relative paths, find the first workspace root where the folder exists
            const match = workspaceRoots.find(root => {
                const candidate = path.join(root, f);
                return fs.existsSync(candidate);
            });
            if (!match && workspaceRoots.length > 0) {
                logger?.warn(`[CONFIG] ⚠️ Partial path "${f}" not found in any workspace folder; resolving against first root.`);
            }
            return path.join(match ?? workspaceRoots[0] ?? '', f);
        });

    if (logger) {
        logger.setLevel(logConfig);
    }
    else {
        const router = new OutputRouter();
        const filter = new LogFilter(logConfig);
        const timer = new TimerManager();
        initializeLogger(router, filter, timer, logConfig);

    }


    return {
        scanFolders: resolvedFolders,
        scanExtensions: Extensions.split(","),
        logLevel: logConfig.level,
        autoScan: AutoScan
    };
}

/**
 * Reloads the in-memory configuration from VS Code settings.
 */
export function reloadConfig(): void {
    config = loadConfig();
}

function scheduleConfigReload(delayMs: number = 750): void {
    if (reloadConfigTimer) {
        clearTimeout(reloadConfigTimer);
    }

    reloadConfigTimer = setTimeout(() => {
        reloadConfigTimer = undefined;
        reloadConfig();
    }, delayMs);
}

/**
 * Subscribes to configuration changes and refreshes config when relevant
 * extension settings are updated.
 */
export function watchConfig(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            const affectsExtensionSettings =
                e.affectsConfiguration('dot8assetmanager.ScanFolders') ||
                e.affectsConfiguration('dot8assetmanager.ScanExtensions') ||
                e.affectsConfiguration('dot8assetmanager.LogLevel') ||
                e.affectsConfiguration('dot8assetmanager.AutoScan');

            if (affectsExtensionSettings) {
                // VS Code does not provide a reliable "settings editor closed"
                // signal, so reload once edits have gone quiet for a short time.
                scheduleConfigReload(2000);
            }
        })
    );

    context.subscriptions.push({
        dispose: () => {
            if (reloadConfigTimer) {
                clearTimeout(reloadConfigTimer);
                reloadConfigTimer = undefined;
            }
        }
    });
}


/**
 * Persists the current in-memory configuration to workspace-folder settings.
 */
export async function saveConfig(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('dot8assetmanager');

    // Use Workspace scope so settings are stored in the .code-workspace file
    // and apply to all workspace folders in a multi-root setup.
    await cfg.update('scanFolders', config.scanFolders, vscode.ConfigurationTarget.Workspace);
    await cfg.update('scanExtensions', config.scanExtensions, vscode.ConfigurationTarget.Workspace);
}