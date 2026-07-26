import { Action } from "../models/action";
import { IFileItem } from "../models/IFileItem";
import * as path from "path";
import { executeAction, getActionMetadata, IActionExecutionError, IActionExecutionResult } from "./actionExecute";
import { logger } from "../services/logger";

export interface IProcessFilesResult {
    totalFiles: number;
    succeeded: number;
    skipped: number;
    failed: number;
    errors: IActionExecutionError[];
}

/**
 * Groups files by folder, resolves the nearest action metadata, and executes
 * action steps for each file in that folder.
 */
export async function processFiles(files: IFileItem[]): Promise<IProcessFilesResult> {
    const grouped = files.reduce((acc, file) => {
        const folder = path.dirname(file.filter);
        if (!acc[folder]) { acc[folder] = []; }
        acc[folder].push(file);
        return acc;
    }, {} as Record<string, IFileItem[]>);

    const overallResult: IProcessFilesResult = {
        totalFiles: 0,
        succeeded: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    };

    // get the action for folder
    for (const folder in grouped) {
        logger.debug(`[ACTION] Processing folder: ${folder}`);
        const action: Action | null = await getActionMetadata(folder);
        if (action === null || !action.enable) {
            const skippedCount = grouped[folder].length;
            overallResult.totalFiles += skippedCount;
            overallResult.skipped += skippedCount;
            logger.info(`[PROCESS] Folder skipped: ${folder}. skipped=${skippedCount}`);
            continue;
        }
        // get unique extensions in the folder, sort by action.extensionOrder, then process files in that order (files with extensions not in action.extensionOrder will be processed last)
        const uniqueExtensions = Array.from(
            new Set(
                grouped[folder]
                    .map(file => {
                        const idx = file.path.lastIndexOf('.');
                        return idx >= 0 ? file.path.slice(idx+1) : ''; // extension or empty string
                    })
                    .filter(ext => ext) // skip files with no extension, remove if you want to keep them
            )
        );
        // merge action order extension and add existing extensions in folder, to ensure we process files in the order defined by action.extensionOrder, but also include any extensions that are present in the folder but not defined in action.extensionOrder (these will be processed last)
        const processingExtensions = Array.from(new Set([...action.extensionOrder, ...uniqueExtensions]));

        const orderedFiles: IFileItem[] = [];
        processingExtensions.forEach(ext => {
            orderedFiles.push(
                ...grouped[folder].filter(file => file.path.endsWith(ext))
            );
        });

        if (orderedFiles.length === 0) {
            continue;
        }

        const folderResult: IProcessFilesResult = {
            totalFiles: 0,
            succeeded: 0,
            skipped: 0,
            failed: 0,
            errors: [],
        };

        for (const file of orderedFiles) {
            logger.info(`[ACTION] Processing file: ${file.path}`);
            try {
                const executionResult: IActionExecutionResult = await executeAction(action, file);
                folderResult.totalFiles += 1;
                if (executionResult.skipped) {
                    folderResult.skipped += 1;
                } else if (executionResult.success) {
                    folderResult.succeeded += 1;
                } else {
                    folderResult.failed += 1;
                    folderResult.errors.push(...executionResult.errors);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`[ERROR] ❌ Failed to process file ${file.path}: ${errorMessage}`);
                folderResult.totalFiles += 1;
                folderResult.failed += 1;
                folderResult.errors.push({ filePath: file.path, stepName: 'fatal', message: errorMessage });
            }
        }

        overallResult.totalFiles += folderResult.totalFiles;
        overallResult.succeeded += folderResult.succeeded;
        overallResult.skipped += folderResult.skipped;
        overallResult.failed += folderResult.failed;
        overallResult.errors.push(...folderResult.errors);

        logger.info(`[PROCESS] Folder summary for ${folder}: processed=${folderResult.totalFiles}, succeeded=${folderResult.succeeded}, skipped=${folderResult.skipped}, failed=${folderResult.failed}`);
        if (folderResult.errors.length > 0) {
            logger.error(`[PROCESS] Folder errors for ${folder}:`);
            for (const error of folderResult.errors) {
                logger.error(`[ERROR] ${error.filePath} | step=${error.stepName} | ${error.message}`);
            }
        }
    }

    return overallResult;
}