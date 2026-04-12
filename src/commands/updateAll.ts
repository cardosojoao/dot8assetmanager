import * as vscode from 'vscode';
import { createMetadata } from '../services/metaData';
//import { executeAction, getActionMetadata } from '../services/actionExecute';
import { IFileItem } from '../models/IFileItem';
import { config } from '../config/config';
import { outputChannel } from '../extension';
import { getFiles, getMetadataFiles, fileChanges, watchFoldersAndCollectChanges, IFileChangeEvent, } from '../services/files';
//import * as Path from 'path';
//import { Action } from '../models/action';
import { processFiles } from '../services/ProcessFile';
import { FileChangeEvent } from 'vscode';


/**
 * Registers the apply command that scans configured asset folders, creates
 * missing metadata, and executes action steps for discovered files.
 *
 * Command id: `dot8assetmanager.apply`
 */
export function registerUpdateAllCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dot8assetmanager.updateAllAssets',
        async () => {
            try {
                vscode.window.showInformationMessage('start scanning...');
                const startTime = Date.now();
                outputChannel.appendLine(`[SCAN] Starting apply at ${new Date().toISOString()}`);
                outputChannel.appendLine(`[SCAN] Scanning folder: ${config.scanFolders}`);

                const allFiles: IFileItem[] = [];
                const files = await getFiles(config.scanFolders, config.scanExtensions);
                let pass: number = 1;
                while (true) {
                    outputChannel.appendLine(`[SCAN] Pass ${pass} Found ${files.length} files to process`);

                    const metadataFiles = await getMetadataFiles(files);
                    outputChannel.appendLine(`[SCAN] Found ${metadataFiles.length} metadata files`);

                    const unmatched = files.filter((a: IFileItem) =>
                        !metadataFiles.some((b: IFileItem) => b.filter === a.filter));
                    outputChannel.appendLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

                    // get modified items
                    outputChannel.appendLine(`[SCAN] ${files.length} updated files (process actions)`);

                    // create metadata for unmatched items
                    for (const fileData of unmatched) {
                        outputChannel.appendLine(`[METADATA] Creating metadata for: ${fileData?.path}`);
                        try {
                            createMetadata(fileData.path);
                        } catch (error) {
                            outputChannel.appendLine(`[ERROR] ❌ Failed to create metadata for ${fileData?.path}: ${error}`);
                        }
                    }
                    const watchers = watchFoldersAndCollectChanges(config.scanFolders, config.scanExtensions);
                    await processFiles(files);
                    await watchers.dispose();

                    // check if new or uppdate files were part of the iniitial scan and remove them from the change list to avoid double processing
                    const updateFiles = fileChanges.filter((a: IFileChangeEvent) =>
                        !files.some((b: IFileItem) => b.path === a.path));
                    fileChanges.splice(0,fileChanges.length);
                    vscode.window.showInformationMessage(`Scan Pass ${pass} complete: ${unmatched.length} new, ${files.length} updated`);

                    if (updateFiles.length > 0) {
                        pass++;
                        allFiles.concat(files);
                        files.splice(0, files.length);      // clear original array
                        const dedupedUpdates = [...new Set(updateFiles)];
                        updateFiles.splice(0, updateFiles.length);      // clear original array
                        files.concat(dedupedUpdates.map((change: IFileChangeEvent) => { return <IFileItem>change;}));
                    } else {
                        break;
                    }
                }
                const duration = Date.now() - startTime;
                outputChannel.appendLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
            } catch (error) {
                const errorMsg = `[SCAN] ❌Fatal error: ${error instanceof Error ? error.message : String(error)}`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage('Scan failed: ' + errorMsg);
            }
        }
    );
    context.subscriptions.push(disposable);
}
