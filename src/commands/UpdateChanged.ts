import * as vscode from 'vscode';
import { CreateMetadata } from '../services/metaData';
import { IFileItem } from '../models/IFileItem';
import { config } from '../config/config';
import { outputChannel } from '../extension';
import { getFiles, getMetadataFiles } from '../services/files';
import { ProcessFiles } from '../services/ProcessFile';

/**
 * Registers the scan command used to discover asset files, compare them with
 * existing metadata, create missing metadata files, and refresh stale metadata.
 *
 * Command id: `dot8assetmanager.scan`
 */
export function registerScanCommand(context: vscode.ExtensionContext) {
 const disposable = vscode.commands.registerCommand('dot8assetmanager.updateChangedAssets',
        async () => {
            try {
                vscode.window.showInformationMessage('start scanning...');
                const startTime = Date.now();
                outputChannel.appendLine(`[SCAN] Starting scan at ${new Date().toISOString()}`);
                
                outputChannel.appendLine(`[SCAN] Scanning folder: ${config.scanFolders}`);

                const files = await getFiles(config.scanFolders, config.scanExtensions);
                outputChannel.appendLine(`[SCAN] Found ${files.length} files`);
                
                const filesmetadata = await getMetadataFiles(files);
                outputChannel.appendLine(`[SCAN] Found ${filesmetadata.length} metadata files`);

                // Files without matching metadata are treated as new assets.
                const unmatched = files.filter((a: IFileItem) => 
                    !filesmetadata.some((b: IFileItem) => b.filter === a.filter));
                outputChannel.appendLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

                // Metadata files whose source assets changed since metadata was written.
                const updated = files.map((a: IFileItem) => ({
                    a, b: filesmetadata.find((b: IFileItem) => b.filter === a.filter)}))
                    .filter((pair: {a: IFileItem, b: IFileItem | undefined}) => pair.b !== undefined && pair.a.modified > pair.b.modified)
                    .map((pair: {a: IFileItem, b: IFileItem | undefined}) => pair.b as IFileItem);
                outputChannel.appendLine(`[SCAN] ${updated.length} updated files (process actions)`);

                // Create metadata for newly discovered files.
                for (const fileData of unmatched) {
                    outputChannel.appendLine(`[METADATA] Creating metadata for: ${fileData?.path}`);
                    try {
                        CreateMetadata(fileData.path);
                    } catch (error) {
                        outputChannel.appendLine(`[ERROR] ❌ Failed to create metadata for ${fileData?.path}: ${error}`);
                    }
                }
                // apply action steps for update files
                await ProcessFiles( updated);

                const duration = Date.now() - startTime;
                outputChannel.appendLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
                vscode.window.showInformationMessage(`Scan complete: ${unmatched.length} new, ${updated.length} updated`);
            } catch (error) {
                const errorMsg = `[SCAN] ❌Fatal error: ${error instanceof Error ? error.message : String(error)}`;
                outputChannel.appendLine(errorMsg);
                vscode.window.showErrorMessage('Scan failed: ' + errorMsg);
            }
        }
    );
  context.subscriptions.push(disposable);
}     
   