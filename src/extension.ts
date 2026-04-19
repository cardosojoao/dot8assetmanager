import * as vscode from 'vscode';
import { config, reloadConfig, watchConfig } from './config/config';
import { logger } from './services/logger';
import { registerUpdateChangedCommand } from './commands/updateChanged';
import { registerUpdateAllCommand } from './commands/updateAll';

/**
 * Activates the extension, loads configuration, creates output logging, and
 * registers command handlers.
 */
export async function activate(context: vscode.ExtensionContext) {
    registerUpdateChangedCommand(context);
    registerUpdateAllCommand(context);
    watchConfig(context); // auto-reload on settings change
    reloadConfig();

    logger.info("Extension activated");
    logger.debug("Current Settings:");
    logger.debug(`Scan Folders: \r\n${config.scanFolders}`);
    logger.debug(`Scan Extensions: \r\n${config.scanExtensions}`);
}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (logger) {
        logger.dispose();
    }
}
