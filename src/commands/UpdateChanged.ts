import * as vscode from 'vscode';
import { createMetadata } from '../services/metaData';
import { IFileItem } from '../models/IFileItem';
import { config } from '../config/config';
import { outputChannel } from '../extension';
import { getFiles, getMetadataFiles, IFileChangeEvent } from '../services/files';
import { processFiles } from '../services/ProcessFile';
import { fileChanges, watchFoldersAndCollectChanges } from '../services/files';

/**
 * Registers the scan command used to discover asset files, compare them with
 * existing metadata, create missing metadata files, and refresh stale metadata.
 *
 * Command id: `dot8assetmanager.scan`
 */
export function registerUpdateChangedCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dot8assetmanager.updateChangedAssets',
        async () => {
            try {
                vscode.window.showInformationMessage('start scanning...');
                const startTime = Date.now();
                outputChannel.appendLine(`[SCAN] Starting scan at ${new Date().toISOString()}`);
                outputChannel.appendLine(`[SCAN] Scanning folder: ${config.scanFolders}`);

                const allFiles: IFileItem[] = [];
                const files = await getFiles(config.scanFolders, config.scanExtensions);
                let pass: number = 1;
                while (true) {
                    outputChannel.appendLine(`[SCAN] Found ${files.length} files`);

                    const metadataFiles = await getMetadataFiles(files);
                    outputChannel.appendLine(`[SCAN] Found ${metadataFiles.length} metadata files`);

                    // Files without matching metadata are treated as new assets.
                    const unmatched = files.filter((a: IFileItem) =>
                        !metadataFiles.some((b: IFileItem) => b.filter === a.filter));
                    outputChannel.appendLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

                    // Metadata files whose source assets changed since metadata was written.
                    const updated = files.map((a: IFileItem) => ({
                        a, b: metadataFiles.find((b: IFileItem) => b.filter === a.filter)
                    }))
                        .filter((pair: { a: IFileItem, b: IFileItem | undefined }) => pair.b !== undefined && pair.a.modified > pair.b.modified)
                        .map((pair: { a: IFileItem, b: IFileItem | undefined }) => pair.b as IFileItem);
                    outputChannel.appendLine(`[SCAN] ${updated.length} updated files (process actions)`);

                    // Create metadata for newly discovered files.
                    for (const fileData of unmatched) {
                        outputChannel.appendLine(`[METADATA] Creating metadata for: ${fileData?.path}`);
                        try {
                            createMetadata(fileData.path);
                        } catch (error) {
                            outputChannel.appendLine(`[ERROR] ❌ Failed to create metadata for ${fileData?.path}: ${error}`);
                        }
                    }
                    // apply action steps for update files
                    const watchers = watchFoldersAndCollectChanges(config.scanFolders, config.scanExtensions);
                    await processFiles(updated);
                    await watchers.dispose();

                    // check if new or uppdate files were part of the iniitial scan and remove them from the change list to avoid double processing
                    const updateFiles = fileChanges.filter((a: IFileChangeEvent) =>
                        !updated.some((b: IFileItem) => b.path === a.path));
                    
                    fileChanges.splice(0, fileChanges.length);
                    vscode.window.showInformationMessage(`Scan Pass ${pass} complete: ${unmatched.length} new, ${files.length} updated`);

                    if (updateFiles.length > 0) {
                        pass++;
                        allFiles.concat(updated);
                        updated.splice(0, updated.length);      // clear original array
                        const dedupedUpdates = [...new Set(updateFiles)];
                        files.splice(0, files.length);      // clear original array
                        files.concat(dedupedUpdates.map((change: IFileChangeEvent) => { return <IFileItem>change; }));
                    } else {
                        break;
                    }
                }
                const duration = Date.now() - startTime;
                outputChannel.appendLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
                //vscode.window.showInformationMessage(`Scan complete: ${unmatched.length} new, ${updated.length} updated`);
            } catch (error) {
                const errorMsg = `[SCAN] ❌Fatal error: ${error instanceof Error ? error.message : String(error)}`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage('Scan failed: ' + errorMsg);
            }
        }
    );
    context.subscriptions.push(disposable);
}
