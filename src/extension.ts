import * as vscode from 'vscode';
import { config, reloadConfig, watchConfig } from './config/config';
import { registerUpdateChangedCommand } from './commands/updateChanged';
import { registerUpdateAllCommand } from './commands/updateAll';
import { setLoggerChannel } from './services/logger';

export let outputChannel: vscode.OutputChannel;


/**
 * Activates the extension, loads configuration, creates output logging, and
 * registers command handlers.
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log("Just getting started...");
    registerUpdateChangedCommand(context);
    registerUpdateAllCommand(context);

    outputChannel = vscode.window.createOutputChannel("dot8assetmanager");
    setLoggerChannel(outputChannel);    


    watchConfig(context); // auto-reload on settings change
    reloadConfig();

    outputChannel.appendLine("Extension activated");
    outputChannel.appendLine("Current Settings:");
    outputChannel.appendLine(`Scan Folders: \r\n${config.scanFolders}`); 
    outputChannel.appendLine(`Scan Extensions: \r\n${config.scanExtensions}`); 
}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
