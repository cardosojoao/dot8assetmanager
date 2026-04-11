import * as vscode from 'vscode';
import { config, reloadConfig, saveConfig, watchConfig } from './config/config';
import { registerScanCommand } from './commands/UpdateChanged';
import { registerApplyCommand } from './commands/updateAll';

export let outputChannel: vscode.OutputChannel;


/**
 * Activates the extension, loads configuration, creates output logging, and
 * registers command handlers.
 */
export async function activate(context: vscode.ExtensionContext) {
    watchConfig(context); // auto-reload on settings change
    reloadConfig();
    console.log("Just getting started...");
    outputChannel = vscode.window.createOutputChannel("dot8assetmanager");

    registerScanCommand(context);
    registerApplyCommand(context);

    outputChannel.appendLine("Extension activated");
    outputChannel.appendLine("Current Settings:");
    outputChannel.appendLine(`Scan Folders: \r\n${config.scanFolders.join("\r\n")}`); 
    outputChannel.appendLine(`Scan Extensions: \r\n${config.scanExtensions.join("\r\n")}`); 
}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
