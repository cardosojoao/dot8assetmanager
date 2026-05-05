import * as vscode from 'vscode';
import { IFileItem } from '../models/IFileItem';
import { createMetadata } from './metadata';
import { fileChanges, getFiles, getMetadataFiles, IFileChangeEvent, watchFoldersAndCollectChanges, waitForFileSystemStability } from './files';
import { processFiles } from './processFiles';
import { logger } from '../services/logger';
import path from 'path';
import { config } from '../config/config';


interface IScanPipelineOptions {
    scanFolders: string[];
    scanExtensions: string[];
    startLabel: 'scan' | 'apply';
    selectFilesToProcess: (files: IFileItem[], metadataFiles: IFileItem[]) => IFileItem[];
}

export async function runScanPipeline(options: IScanPipelineOptions): Promise<void> {
    const startTime = Date.now();
    logger.info(`[SCAN] Starting ${options.startLabel} at ${new Date()}`);
    logger.debug(`[SCAN] Scanning folder(s): ${options.scanFolders.join("\r\n")}`);
    // first set of files to process
    let files = await getFiles(options.scanFolders, options.scanExtensions);
    let pass = 1;

    while (true) {
        logger.info(`[SCAN] Pass ${pass} Found ${files.length} files to process`);

        const metadataFiles = await getMetadataFiles(files);
        logger.debug(`[SCAN] Found ${metadataFiles.length} metadata files`);

        const unmatched = files.filter((file) =>
            !metadataFiles.some((metadataFile) => metadataFile.filter === file.filter)
        );
        logger.debug(`[SCAN] ${unmatched.length} unmatched files (need new metadata)`);

        const filesToProcess = options.selectFilesToProcess(files, metadataFiles);
        logger.debug(`[SCAN] ${filesToProcess.length} updated files (process actions)`);

        for (const fileData of unmatched) {
            logger.debug(`[METADATA] Creating metadata for: ${fileData.path}`);
            try {
                createMetadata(fileData.path);
            } catch (error) {
                logger.error(`[ERROR] ❌ Failed to create metadata for ${fileData.path}: ${error}`);
            }
        }
        if (filesToProcess.length > 0) {
            const watchers = await watchFoldersAndCollectChanges(options.scanFolders, options.scanExtensions);
            await processFiles(filesToProcess);
            await waitForFileSystemStability(1000); // Wait for file system events to stabilize (1000ms of silence)
            await watchers.dispose();
        }

        const updateFiles = fileChanges.filter((change: IFileChangeEvent) =>
            !filesToProcess.some((processed: IFileItem) => processed.path === change.path && processed.modified > change.modified)
        );

        fileChanges.splice(0, fileChanges.length);
        logger.info(`[SCAN] Pass ${pass} complete: ${unmatched.length} new, ${filesToProcess.length} updated`);

        if (updateFiles.length === 0) {
            break;
        }

        pass++;
        const map = new Map<string, IFileChangeEvent>();
        for (const item of updateFiles) {
            map.set(item.path, item); // last one wins
        }
        const removeDup = Array.from(map.values());
        const dedupedUpdates = [...new Set(removeDup)];

        files = dedupedUpdates.filter(file => config.scanExtensions.includes(path.extname(file.path).slice(1)))
            .map((change: IFileChangeEvent) : IFileItem => ({
                path: change.path,
                modified: change.modified,
                filter: change.filter
            })
            );
    }

    const duration = Date.now() - startTime;
    logger.info(`[SCAN] Completed in ${duration}ms at ${new Date()}`);
}
