import * as vscode from 'vscode';
import { config } from '../config/config';
import { IFileItem } from '../models/IFileItem';
import { runScanPipeline } from '../services/scanPipeline';


/**
 * Registers the apply command that scans configured asset folders, creates
 * missing metadata, and executes action steps for discovered files.
 *
 * Command id: `dot8assetmanager.apply`
 */
export function registerUpdateAllCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('dot8assetmanager.updateAllAssets',
        async () => {
            await runScanPipeline({
                scanFolders: config.scanFolders,
                scanExtensions: config.scanExtensions,
                startLabel: 'apply',
                selectFilesToProcess: (files: IFileItem[]) => files,
            });
        }
    );
    context.subscriptions.push(disposable);
}
