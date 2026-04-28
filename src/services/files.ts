import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { IFileItem } from '../models/IFileItem';
import { appendExtension } from '../utils/utils';
import { logger } from '../services/logger';


export interface IFileChangeEvent extends IFileItem {
    changeType: 'created' | 'changed' | 'deleted';
}

export const fileChanges: IFileChangeEvent[] = [];
let debounceTimer: NodeJS.Timeout | null = null;
let pendingResolve: (() => void) | null = null;
let pendingPromise: Promise<void> | null = null;

/**
 * Marks the file changes as unstable when new events arrive, and resolves
 * the returned promise only when no new events arrive for the specified debounce duration.
 */
export function waitForFileSystemStability(debounceMs: number = 500): Promise<void> {
    if (!pendingPromise) {
        pendingPromise = new Promise((resolve) => {
            pendingResolve = resolve;
        });

        // Start a timer even if no changes ever come.
        debounceTimer = setTimeout(finish, debounceMs);
    }

    return pendingPromise;
}

function finish() {
    debounceTimer = null;

    if (pendingResolve) {
        pendingResolve();
    }

    pendingResolve = null;
    pendingPromise = null;
}

/**
 * Notifies the stability monitor that a new file change has arrived.
 */
export function notifyFileChange(debounceMs: number = 500) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;

        if (pendingResolve) {
            pendingResolve();
        }

        pendingResolve = null;
        pendingPromise = null;
    }, debounceMs);
}

/**
 * Scans configured folders and returns matching files with normalized metadata
 * used by the processing pipeline.
 */
export async function getFiles(scanFolders: string[], extensions: string[] = []): Promise<IFileItem[]> {
    let allFiles: IFileItem[] = [];
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            logger.error('[FILES] ❌ Error: No workspace folder open!');
            vscode.window.showErrorMessage('No workspace folder open!');
            return [];
        }
        for (const folder of scanFolders) {
            const uri = vscode.Uri.file(folder);
            const rootFolder = vscode.workspace.getWorkspaceFolder(uri);

            if (!rootFolder) {
                logger.debug(`[FILES] ⚠️ Folder is outside workspace: ${folder}`);
                continue;
            }

            let relative = path.relative(rootFolder.uri.fsPath, folder);
            relative = relative.replace(/\\/g, '/');
            const patternPath = relative ? `${relative}/**/*.{${extensions.join(",")}}` : `**/*.{${extensions.join(",")}`;
            const pattern = new vscode.RelativePattern(rootFolder, patternPath);

            const files = await vscode.workspace.findFiles(
                pattern, '**/*.{cmd,ini}'
            );
            allFiles = allFiles.concat(files.map(file => {
                return getFile(file.fsPath);
            }));
        }
    } catch (error) {
        logger.error(`[FILES] ❌ Fatal error scanning files: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }

    return allFiles;
}

export function getFile(filePath: string): IFileItem {
    try {
        const stat = fs.statSync(filePath);
        return {
            path: filePath,
            modified: stat.mtime,
            filter: filePath
        };
    } catch (error) {
        logger.warn(`[FILES] ⚠️ Warning: Failed to stat ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Reads metadata sidecar files for the provided source files and returns only
 * metadata entries that exist and can be parsed successfully.
 */
export async function getMetadataFiles(files: IFileItem[]): Promise<IFileItem[]> {
    const items: IFileItem[] = [];

    for (const fileData of files) {
        try {
            const fileMetadata = appendExtension(fileData.path, 'metadata');
            if (fs.existsSync(fileMetadata)) {
                const raw = await fs.promises.readFile(fileMetadata, 'utf-8');
                const parsed = JSON.parse(raw);
                items.push({
                    path: parsed.Path,
                    modified: new Date(parsed.Modified),
                    filter: fileData.path
                });
            } else {
                logger.debug(`[METADATA] No metadata file for: ${fileData.path}`);
            }
        } catch (error) {
            logger.error(`[METADATA] ❌ Error processing ${fileData.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return items;
}

/**
 * Watches multiple folders and appends file-system change events to the
 * module-level `fileChanges` queue.
 */
export async function watchFoldersAndCollectChanges(
    scanFolders: string[],
    extensions: string[]
): Promise<vscode.Disposable> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.error('[WATCH] ❌ Error: No workspace folder open!');
        throw new Error('No workspace folder open!');
    }

    const normalizedExtensions = new Set(
        extensions
            .map((ext) => ext.trim().toLowerCase())
            .filter((ext) => ext.length > 0)
            .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
    );

    const watchers: vscode.FileSystemWatcher[] = [];

    const addChange = (uri: vscode.Uri, changeType: IFileChangeEvent['changeType']) => {
        const fileExt = path.extname(uri.fsPath).toLowerCase();
        if (normalizedExtensions.size > 0 && !normalizedExtensions.has(fileExt)) {
            return;
        }
        let modified = new Date();
        try {
            modified = fs.statSync(uri.fsPath).mtime;
        } catch {
            // If the file is in flux, keep current time as fallback.
        }

        const filePath = uri.fsPath;
        fileChanges.push({
            path: filePath,
            modified,
            filter: filePath,
            changeType
        });
        logger.debug(`[WATCH] ${changeType.toUpperCase()}: ${filePath}`);
        notifyFileChange(); // Notify stability monitor of new event
    };

    for (const folder of scanFolders) {

        const uri = vscode.Uri.file(folder);
        const rootFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (!rootFolder) {
            logger.debug(`[FILES] ⚠️ Folder is outside workspace: ${folder}`);
            continue;
        }

        // Convert absolute → relative
        let relative = path.relative(rootFolder.uri.fsPath, folder);
        // Normalize for VS Code glob patterns
        relative = relative.replace(/\\/g, '/');
        // Handle case where folder === root
        const patternPath = relative ? `${relative}/**/*` : '**/*';
        const pattern = new vscode.RelativePattern(rootFolder, patternPath);

        const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

        watcher.onDidCreate((uri) => addChange(uri, 'created'));
        watcher.onDidChange((uri) => addChange(uri, 'changed'));

        watchers.push(watcher);
        logger.debug(`[WATCH] Monitoring folder: ${folder}`);
    }

    return new vscode.Disposable(() => {
        for (const watcher of watchers) {
            watcher.dispose();
        }
    });
}