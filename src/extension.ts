import * as vscode from 'vscode';
import { config, reloadConfig } from './config/config';
import { logger } from './services/logger';
import { registerUpdateChangedCommand } from './commands/updateChanged';
import { registerUpdateAllCommand } from './commands/updateAll';
import { registerUpdateMetadataCommand } from './commands/updateMetadata';
import { registerAutoUpdateCommand } from './commands/autoUpdate';

/**
 * Activates the extension, loads configuration, creates output logging, and
 * registers command handlers.
 */
export async function activate(context: vscode.ExtensionContext) {
    reloadConfig();

    registerAutoUpdateCommand(context);
    registerUpdateMetadataCommand(context);
    registerUpdateChangedCommand(context);
    registerUpdateAllCommand(context);

    logger.info("Extension activated");
    logger.debug("Current Settings:");
    logger.debug(`Scan Folders: \r\n${config.scanFolders}`);
    logger.debug(`Scan Extensions: \r\n${config.scanExtensions}`);
    logger.debug(`Auto Scan: \r\n${config.autoScan}`);
}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (logger) {
        logger.dispose();
    }
}
