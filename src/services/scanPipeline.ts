import * as vscode from 'vscode';
import { IFileItem } from '../models/IFileItem';
import { createMetadata } from './metadata';
import { fileChanges, getFiles, getMetadataFiles, IFileChangeEvent, watchFoldersAndCollectChanges } from './files';
import { processFiles } from './processFiles';
import { logLine } from './logger';


interface IScanPipelineOptions {
    scanFolders: string[];
    scanExtensions: string[];
    startLabel: 'scan' | 'apply';
    selectFilesToProcess: (files: IFileItem[], metadataFiles: IFileItem[]) => IFileItem[];
}

export async function runScanPipeline(options: IScanPipelineOptions): Promise<void> {
    vscode.window.showInformationMessage('start scanning...');
    const startTime = Date.now();
    logLine(`[SCAN] Starting ${options.startLabel} at ${new Date().toISOString()}`);
    logLine(`[SCAN] Scanning folder(s): ${options.scanFolders.join("\r\n")}`);

    let files = await getFiles(options.scanFolders, options.scanExtensions);
    let pass = 1;

    while (true) {
        logLine(`[SCAN] Pass ${pass} Found ${files.length} files to process`);

        const metadataFiles = await getMetadataFiles(files);
        logLine(`[SCAN] Found ${metadataFiles.length} metadata files`);

        const unmatched = files.filter((file) =>
            !metadataFiles.some((metadataFile) => metadataFile.filter === file.filter)
        );
        logLine(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

        const filesToProcess = options.selectFilesToProcess(files, metadataFiles);
        logLine(`[SCAN] ${filesToProcess.length} updated files (process actions)`);

        for (const fileData of unmatched) {
            logLine(`[METADATA] Creating metadata for: ${fileData.path}`);
            try {
                createMetadata(fileData.path);
            } catch (error) {
                logLine(`[ERROR] ❌ Failed to create metadata for ${fileData.path}: ${error}`);
            }
        }
        if (filesToProcess.length > 0) {
            const watchers = await watchFoldersAndCollectChanges(options.scanFolders, options.scanExtensions);
            await processFiles(filesToProcess);
            await sleep(1000);
            await watchers.dispose();
        }
        
        const updateFiles = fileChanges.filter((change: IFileChangeEvent) =>
            !filesToProcess.some((processed: IFileItem) => processed.path === change.path)
        );

        fileChanges.splice(0, fileChanges.length);
        vscode.window.showInformationMessage(`Scan Pass ${pass} complete: ${unmatched.length} new, ${filesToProcess.length} updated`);

        if (updateFiles.length === 0) {
            break;
        }

        pass++;
        const dedupedUpdates = [...new Set(updateFiles)];
        files = dedupedUpdates.map((change: IFileChangeEvent) => ({
            path: change.path,
            modified: change.modified,
            filter: change.filter,
        }));
    }

    const duration = Date.now() - startTime;
    logLine(`[SCAN] Completed in ${duration}ms at ${new Date().toISOString()}`);
}
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

