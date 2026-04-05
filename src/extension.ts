//import { PrivateKeyInput } from 'node:crypto';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'node:child_process';
import { setupCommand } from './config/setup';
import { config, saveConfig, watchConfig } from './config/config';
import { Action } from './models/action';
import { changeExtension } from './utils/utils';
import { IMetadata } from './models/IMetadata';
import { CreateMetadata, saveMetadata } from './services/metaData';
import { IFileItem } from './models/IFileItem';
import { registerScanCommand } from './commands/scan';

export let outputChannel: vscode.OutputChannel;


export async function activate(context: vscode.ExtensionContext) {

    // await context.workspaceState.update('hasRunBefore', false);
    const hasRunBefore = context.workspaceState.get<boolean>('hasRunBefore');

    // we need context for the setup command, so we register it here and pass context to the function
    let setup = vscode.commands.registerCommand('dot8assetmanager.setup', async () => {
        await setupCommand(context);  // ✅ pass context here
    });
    context.subscriptions.push(setup);

    // context.subscriptions.push(
    //     vscode.commands.registerCommand('dot8assetmanager.setup', setupCommand)
    // );

    watchConfig(context); // auto-reload on settings change

    if (!hasRunBefore) {
        const answer = await vscode.window.showInformationMessage(
            '👋 Welcome! Would you like to set up Dot8AssetManager for this workspace?',
            'Yes, set it up',
            'Skip'
        );

        if (answer === 'Yes, set it up') {
            await vscode.commands.executeCommand('dot8assetmanager.setup');
        }

        // Mark this workspace as set up
        await context.workspaceState.update('hasRunBefore', true);
    }


    console.log("Just getting started...");
    outputChannel = vscode.window.createOutputChannel("dot8assetmanager");


    registerScanCommand(context);
    
    //config.rootFolder = "test root folder";
    //await saveConfig(); // example of saving config programmatically

    outputChannel.show(); // bring output window to front
    outputChannel.appendLine("show config values:");

    // Use config anywhere
    outputChannel.appendLine(config.rootFolder);
    //outputChannel.appendLine(config.apiKey);


    outputChannel.appendLine("Extension activated");


    // const config = vscode.workspace.getConfiguration("sampleExtension");

    // const enabled = config.get<boolean>("enableFeature");
    // const buildPath = config.get<string>("buildPath");

    // console.log("Feature enabled:", enabled);
    // console.log("Build path:", buildPath);

    //getFiles('data');

    // const disposable = vscode.commands.registerCommand('dot8assetmanager.scan',
    //     async () => {
    //         try {
    //             const startTime = Date.now();
    //             outputChannel.appendLine(`[SCAN] Starting scan at ${new Date().toISOString()}`);
    //             vscode.window.showInformationMessage('scanning...');
    //             outputChannel.appendLine(`[SCAN] Scanning folder: ${config.rootFolder}`);

    //             const files = await getFiles(config.rootFolder);
    //             outputChannel.appendLine(`[SCAN] Found ${files.length} files to process`);
                
    //             const filesmetadata = await getMetadataFiles(files);
    //             outputChannel.appendLine(`[SCAN] Found ${filesmetadata.length} metadata files`);

    //             const unmatched = files.filter(a => 
    //                 !filesmetadata.some(b => b.filter === a.filter));
    //             outputChannel.appendLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

    //             // get modified items
    //             const updated = files.map(a => ({
    //                 a, b: filesmetadata.find(b => b.filter === a.filter)}))
    //                 .filter(pair => pair.b !== undefined && pair.a.modified > pair.b.modified)
    //                 .map(pair => pair.b);
    //             outputChannel.appendLine(`[SCAN] ${updated.length} updated files (metadata needs refresh)`);

    //             // create metadata for unmatched items
    //             for (const fileData of unmatched) {
    //                 outputChannel.appendLine(`[METADATA] Creating metadata for: ${fileData?.path}`);
    //                 try {
    //                     CreateMetadata(fileData.path);
    //                 } catch (error) {
    //                     outputChannel.appendLine(`[ERROR] Failed to create metadata for ${fileData?.path}: ${error}`);
    //                 }
    //             }

    //             // process updated items
    //             for (const fileData of updated) {
    //                 outputChannel.appendLine(`[ACTION] Processing updated file: ${fileData?.path}`);
    //                 try {
    //                     await getActionMetadata(<IFileItem>fileData);
    //                 } catch (error) {
    //                     outputChannel.appendLine(`[ERROR] Failed to process file ${fileData?.path}: ${error}`);
    //                 }
    //             }

    //             const duration = Date.now() - startTime;
    //             outputChannel.appendLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
    //             vscode.window.showInformationMessage(`Scan complete: ${unmatched.length} new, ${updated.length} updated`);
    //         } catch (error) {
    //             const errorMsg = `[SCAN] Fatal error: ${error instanceof Error ? error.message : String(error)}`;
    //             outputChannel.appendLine(errorMsg);
    //             vscode.window.showErrorMessage('Scan failed: ' + errorMsg);
    //         }
    //     }
    // );


    //context.subscriptions.push(disposable);
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

// function getWorkspaceFolder(): vscode.Uri | undefined {
//     return vscode.workspace.workspaceFolders?.[0]?.uri;
// }

// function saveConfig(data: vscode.WorkspaceConfiguration) {
//     const folder = getWorkspaceFolder();
//     if (!folder) {return;}

//     const configPath = path.join(folder, '.dot8assetmanager.json');
//     fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
// }

// // LOAD
// function loadConfig(): vscode.WorkspaceConfiguration | null {
//     const folder = getWorkspaceFolder();
//     if (!folder) return null;

//     const config = vscode.workspace.getConfiguration('Dot8AssetManager', folder);

//     return config;
// }




// function readActionMetadata(filePath: string): IActionFile {
//     return JSON.parse(
//         fs.readFileSync(path.resolve(filePath), 'utf-8')
//     ) as IActionFile;
// }

