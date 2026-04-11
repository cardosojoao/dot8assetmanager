import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { IFileItem } from '../models/IFileItem';
import { outputChannel } from '../extension';
import { appendExtension, changeExtension } from '../utils/utils';

export interface IFileChangeEvent extends IFileItem {
    changeType: 'created' | 'changed' | 'deleted';
}

export const fileChanges: IFileChangeEvent[] = [];

/**
 * Scans configured folders and returns matching files with normalized metadata
 * used by the processing pipeline.
 */
export async function getFiles(scanFolders: string[], extensions: string[] = []): Promise<IFileItem[]> {
    let allFiles: IFileItem[] = [];
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            outputChannel.appendLine('[FILES] ❌ Error: No workspace folder open!');
            vscode.window.showErrorMessage('No workspace folder open!');
            return [];
        }

        //outputChannel.appendLine(`[FILES] Scanning workspace: ${workspaceRoot}`);

        for (const folder of scanFolders) {
            //outputChannel.appendLine(`[FILES] Configured scan folder: ${folder}`);
            const targetFolder = path.resolve(workspaceRoot, '..', folder);
            //outputChannel.appendLine(`[FILES] Target folder: ${targetFolder}`);

            const pattern = new vscode.RelativePattern(targetFolder, `**/*.{${extensions.join(',')}}`);
            const files = await vscode.workspace.findFiles(
                pattern, '**/*.{metadata,cmd,ini}'
            );

            //outputChannel.appendLine(`[FILES] Found ${files.length} files matching pattern`);

            allFiles = allFiles.concat(files.map(file => {
                try {
                    const stat = fs.statSync(file.fsPath);
                    const pathFile = file.fsPath;

                    return {
                        path: pathFile,
                        modified: stat.mtime,
                        filter: path.join(path.dirname(pathFile), path.basename(pathFile, path.extname(pathFile))).toLowerCase()
                    };
                } catch (error) {
                    outputChannel.appendLine(`[FILES] ⚠️ Warning: Failed to stat ${file.fsPath}: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
            }));
        }
    } catch (error) {
        outputChannel.appendLine(`[FILES] ❌ Fatal error scanning files: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }

    return allFiles;
}

/**
 * Reads metadata sidecar files for the provided source files and returns only
 * metadata entries that exist and can be parsed successfully.
 */
export async function getMetadataFiles(files: IFileItem[]): Promise<IFileItem[]> {
    const items: IFileItem[] = [];
    //outputChannel.appendLine(`[METADATA] Processing ${files.length} files for metadata`);

    for (const fileData of files) {
        try {
            //const fileMetadata = changeExtension(fileData.path, '.metadata');
            const fileMetadata = appendExtension(fileData.path, '.metadata');
            if (fs.existsSync(fileMetadata)) {
                const raw = await fs.promises.readFile(fileMetadata, 'utf-8');
                const parsed = JSON.parse(raw);
                items.push({
                    path: parsed.Path,
                    modified: new Date(parsed.Modified),
                    filter: path.join(path.dirname(parsed.Path), path.basename(parsed.Path, path.extname(parsed.Path))).toLowerCase()
                });
            } else {
                outputChannel.appendLine(`[METADATA] No metadata file for: ${fileData.path}`);
            }
        } catch (error) {
            outputChannel.appendLine(`[METADATA] ❌ Error processing ${fileData.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    //outputChannel.appendLine(`[METADATA] Loaded metadata for ${items.length}/${files.length} files`);
    return items;
}

/**
 * Watches multiple folders and appends file-system change events to the
 * provided collection.
 */
export function watchFoldersAndCollectChanges(
    scanFolders: string[],
    extensions: string[]
): vscode.Disposable {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        outputChannel.appendLine('[WATCH] ❌ Error: No workspace folder open!');
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
        // if (normalizedExtensions.size > 0 && !normalizedExtensions.has(fileExt)) {
        //     return;
        // }

        let modified = new Date();
        if (changeType !== 'deleted') {
            try {
                modified = fs.statSync(uri.fsPath).mtime;
            } catch {
                // If the file is in flux, keep current time as fallback.
            }
        }

        const filePath = uri.fsPath;
        fileChanges.push({
            path: filePath,
            modified,
            filter: path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath))).toLowerCase(),
            changeType
        });
        outputChannel.appendLine(`[WATCH] ${changeType.toUpperCase()}: ${filePath}`);
    };

    for (const folder of scanFolders) {
        const targetFolder = path.resolve(workspaceRoot, '..', folder);
        //const pattern = new vscode.RelativePattern(targetFolder, `**/*.{${extensions.join(',')}}`);
        const pattern = new vscode.RelativePattern(targetFolder, `**/*`);
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate((uri) => addChange(uri, 'created'));
        watcher.onDidChange((uri) => addChange(uri, 'changed'));
        watcher.onDidDelete((uri) => addChange(uri, 'deleted'));

        watchers.push(watcher);
        outputChannel.appendLine(`[WATCH] Monitoring folder: ${targetFolder}`);
    }

    return new vscode.Disposable(() => {
        for (const watcher of watchers) {
            watcher.dispose();
        }
    });
}