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

    // const hasWorkspace = !!vscode.workspace.workspaceFolders?.length;
    // if (!hasWorkspace) {
    //     vscode.window.showErrorMessage('Please open a workspace folder to use Dot8AssetManager.');
    //     return;
    // }
    // const hasRunBefore = context.workspaceState.get<boolean>('hasRunBefore');

    // we need context for the setup command, so we register it here and pass context to the function
    // let setup = vscode.commands.registerCommand('dot8assetmanager.setup', async () => {
    //     await setupCommand(context);  // ✅ pass context here
    // });
    // context.subscriptions.push(setup);

    // context.subscriptions.push(
    //     vscode.commands.registerCommand('dot8assetmanager.setup', setupCommand)
    // );

    watchConfig(context); // auto-reload on settings change
    reloadConfig();
    // if (!hasRunBefore) {
    //     const answer = await vscode.window.showInformationMessage(
    //         '👋 Welcome! Would you like to set up Dot8AssetManager for this workspace?',
    //         'Yes, set it up',
    //         'Skip'
    //     );

    //     if (answer === 'Yes, set it up') {
    //         await vscode.commands.executeCommand('dot8assetmanager.setup');
    //     }

    //     // Mark this workspace as set up
    //     await context.workspaceState.update('hasRunBefore', true);
    // }

    

    console.log("Just getting started...");
    outputChannel = vscode.window.createOutputChannel("dot8assetmanager");


    registerScanCommand(context);
    registerApplyCommand(context);

    //config.rootFolder = "test root folder";
    //await saveConfig(); // example of saving config programmatically

    //outputChannel.show(); // bring output window to front
    //outputChannel.appendLine("show config values:");

    // Use config anywhere
    //outputChannel.appendLine(config.scanFolders);
    //outputChannel.appendLine(config.apiKey);


    outputChannel.appendLine("Extension activated");
    outputChannel.appendLine("Current Settings:");
    outputChannel.appendLine(`Scan Folders: ${config.scanFolders.join("\n\r")}`); 
    outputChannel.appendLine(`Scan Extensions: ${config.scanExtensions.join("\n\r")}`); 


}

/**
 * Disposes extension resources when VS Code unloads the extension.
 */
export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
