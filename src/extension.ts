import * as vscode from 'vscode';
import { config, reloadConfig, watchConfig } from './config/config';
import { logger } from './services/logger';
import { registerUpdateChangedCommand } from './commands/updateChanged';
import { registerUpdateAllCommand } from './commands/updateAll';

//export let outputChannel: vscode.OutputChannel;

/**
 * Activates the extension, loads configuration, creates output logging, and
 * registers command handlers.
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log("Just getting started...");
    registerUpdateChangedCommand(context);
    registerUpdateAllCommand(context);
    watchConfig(context); // auto-reload on settings change
    reloadConfig();

    logger.info("Extension activated");
    logger.info("Current Settings:");
    logger.info(`Scan Folders: \r\n${config.scanFolders}`); 
    logger.info(`Scan Extensions: \r\n${config.scanExtensions}`); 
}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (logger) {
        logger.dispose();
    }
}
