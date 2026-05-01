import * as vscode from 'vscode';
import { IFileItem } from '../models/IFileItem';
import { config, reloadConfig } from '../config/config';
import { runScanPipeline } from '../services/scanPipeline';

/**
 * Registers the scan command used to discover asset files, compare them with
 * existing metadata, create missing metadata files, and refresh stale metadata.
 *
 * Command id: `dot8assetmanager.scan`
 */
export function registerUpdateChangedCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dot8assetmanager.updateChangedAssets',
        async () => {
            reloadConfig();
            await runScanPipeline({
                scanFolders: config.scanFolders,
                scanExtensions: config.scanExtensions,
                startLabel: 'scan',
                selectFilesToProcess: (files: IFileItem[], metadataFiles: IFileItem[]) => {
                    return files.
                    map((sourceFile: IFileItem) => ({
                        sourceFile,
                        metadataFile: metadataFiles.find((metadataFile: IFileItem) => metadataFile.filter === sourceFile.filter),
                    }))
                        .filter((pair: { sourceFile: IFileItem; metadataFile: IFileItem | undefined }) =>
                            pair.metadataFile !== undefined && pair.sourceFile.modified.toISOString() > pair.metadataFile.modified.toISOString())
                        .map((pair: { sourceFile: IFileItem; metadataFile: IFileItem | undefined }) => pair.metadataFile as IFileItem);
                },
            });
        }
    );
    context.subscriptions.push(disposable);
}
