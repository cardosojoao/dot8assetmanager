import * as vscode from 'vscode';
import { config, reloadConfig, saveConfig, watchConfig } from './config/config';
import { registerScanCommand } from './commands/scan';
import { registerApplyCommand } from './commands/Apply';

export let outputChannel: vscode.OutputChannel;


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

    outputChannel.show(); // bring output window to front
    outputChannel.appendLine("show config values:");

    // Use config anywhere
    //outputChannel.appendLine(config.scanFolders);
    //outputChannel.appendLine(config.apiKey);


    outputChannel.appendLine("Extension activated");


    // const config = vscode.workspace.getConfiguration("sampleExtension");

    // const enabled = config.get<boolean>("enableFeature");
    // const buildPath = config.get<string>("buildPath");

    // console.log("Feature enabled:", enabled);
    // console.log("Build path:", buildPath);

    //getFiles('data');


}

const disposableEnable = vscode.commands.registerCommand('dot8assetmanager.enable', async () => {

    const config = vscode.workspace.getConfiguration("dot8assetmanager");

    await config.update(
        "enableFeature",
        true,
        vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage("Feature enable");

});

const disposableDisable = vscode.commands.registerCommand('dot8assetmanager.disable', async () => {

    const config = vscode.workspace.getConfiguration("dot8assetmanager");

    await config.update(
        "enableFeature",
        false,
        vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage("Feature disabled");

});



export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}
