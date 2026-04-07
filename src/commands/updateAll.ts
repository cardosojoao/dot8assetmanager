import * as vscode from 'vscode';
import { CreateMetadata } from '../services/metaData';
//import { executeAction, getActionMetadata } from '../services/actionExecute';
import { IFileItem } from '../models/IFileItem';
import { config } from '../config/config';
import { outputChannel } from '../extension';
import { getFiles, getMetadataFiles, } from '../services/files';
//import * as Path from 'path';
//import { Action } from '../models/action';
import { ProcessFiles } from '../services/ProcessFile';

/**
 * Registers the apply command that scans configured asset folders, creates
 * missing metadata, and executes action steps for discovered files.
 *
 * Command id: `dot8assetmanager.apply`
 */
export function registerApplyCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dot8assetmanager.updateAllAssets',
        async () => {
            try {

                vscode.window.showInformationMessage('start scanning...');
                const startTime = Date.now();
                outputChannel.appendLine(`[SCAN] Starting apply at ${new Date().toISOString()}`);
                outputChannel.appendLine(`[SCAN] Scanning folder: ${config.scanFolders}`);

                const files = await getFiles(config.scanFolders, config.scanExtensions);
                outputChannel.appendLine(`[SCAN] Found ${files.length} files to process`);

                const filesmetadata = await getMetadataFiles(files);
                outputChannel.appendLine(`[SCAN] Found ${filesmetadata.length} metadata files`);

                const unmatched = files.filter((a: IFileItem) =>
                    !filesmetadata.some((b: IFileItem) => b.filter === a.filter));
                outputChannel.appendLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

                // get modified items
                outputChannel.appendLine(`[SCAN] ${files.length} updated files (process actions)`);

                // create metadata for unmatched items
                for (const fileData of unmatched) {
                    outputChannel.appendLine(`[METADATA] Creating metadata for: ${fileData?.path}`);
                    try {
                        CreateMetadata(fileData.path);
                    } catch (error) {
                        outputChannel.appendLine(`[ERROR] ❌ Failed to create metadata for ${fileData?.path}: ${error}`);
                    }
                }

                await ProcessFiles( files);


                const duration = Date.now() - startTime;
                outputChannel.appendLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
                vscode.window.showInformationMessage(`Scan complete: ${unmatched.length} new, ${files.length} updated`);


            } catch (error) {
                const errorMsg = `[SCAN] ❌Fatal error: ${error instanceof Error ? error.message : String(error)}`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage('Scan failed: ' + errorMsg);
            }
        }
    );

    context.subscriptions.push(disposable);
}
