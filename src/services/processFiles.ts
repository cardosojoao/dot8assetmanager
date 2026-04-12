import { Action } from "../models/action";
import { IFileItem } from "../models/IFileItem";
import * as Path from "path";
import { executeAction, getActionMetadata } from "./actionExecute";
import { logLine } from "./logger";

/**
 * Groups files by folder, resolves the nearest action metadata, and executes
 * action steps for each file in that folder.
 */
export async function processFiles(files: IFileItem[]): Promise<void> {
    const grouped = files.reduce((acc, file) => {
        const folder = Path.dirname(file.filter);
        if (!acc[folder]) { acc[folder] = []; }
        acc[folder].push(file);
        return acc;
    }, {} as Record<string, IFileItem[]>);

    // get the action for folder
    for (const folder in grouped) {
        logLine(`[ACTION] Processing folder: ${folder}`);
        const action: Action | null = await getActionMetadata(folder);
        if (action === null) {
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
        // merget action order extension and add existing extensions in folder, to ensure we process files in the order defined by action.extensionOrder, but also include any extensions that are present in the folder but not defined in action.extensionOrder (these will be processed last)
        const processingExtensions = Array.from(new Set([...action.extensionOrder, ...uniqueExtensions]));

        const orderedFiles: IFileItem[] = [];
        processingExtensions.forEach(ext => {
            orderedFiles.push(
                ...grouped[folder].filter(file => file.path.endsWith(ext))
            );
        });

        for (const file of orderedFiles) {
            logLine(`[ACTION] Processing file: ${file?.path}`);
            try {
            
                await executeAction(<Action>action, <IFileItem>file);
            } catch (error) {
                logLine(`[ERROR] ❌ Failed to process file ${file?.path}: ${error}`);
            }
        }
    }
}