import * as vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import { IFileItem } from '../models/IFileItem';
import { outputChannel } from '../extension';
import { changeExtension } from '../utils/utils';

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
            outputChannel.appendLine(`[FILES] Configured scan folder: ${folder}`);
            const targetFolder = path.resolve(workspaceRoot, '..', folder);
            outputChannel.appendLine(`[FILES] Target folder: ${targetFolder}`);

            const pattern = new vscode.RelativePattern(targetFolder, `**/*.{${extensions.join(',')}}`);
            const files = await vscode.workspace.findFiles(
                pattern, '**/*.{metadata,cmd,ini}'
            );

            outputChannel.appendLine(`[FILES] Found ${files.length} files matching pattern`);

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

export async function getMetadataFiles(files: IFileItem[]): Promise<IFileItem[]> {
    const items: IFileItem[] = [];
    outputChannel.appendLine(`[METADATA] Processing ${files.length} files for metadata`);

    for (const fileData of files) {
        try {
            const fileMetadata = changeExtension(fileData.path, '.metadata');
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

    outputChannel.appendLine(`[METADATA] Loaded metadata for ${items.length}/${files.length} files`);
    return items;
}