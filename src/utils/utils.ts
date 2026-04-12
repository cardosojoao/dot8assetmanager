import path from "path";
import fs from "fs";
import { IMetadata } from "../models/IMetadata";
import { outputChannel } from "../extension";
import { execSync } from "child_process";
import * as vscode from 'vscode';
/**
 * Returns a file path with the same base name and a different extension.
 */
export function changeExtension(filePath: string, newExt: string): string {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    return path.join(dir, `${base}${newExt}`);
}

export function appendExtension(filePath: string, newExt: string): string {
    return filePath +"." + newExt;
}

/**
 * Searches for a file from the starting location up through parent directories.
 */
export const findFileUpward = (startPath: string, fileName: string): string | null => {
    let current = fs.statSync(startPath).isFile() ? path.dirname(path.resolve(startPath)) : path.resolve(startPath);
    while (true) {
        const target = path.join(current, fileName);
        if (fs.existsSync(target)) { return target; }
        const parent = path.dirname(current);
        if (parent === current) { return null; }
        current = parent;
    }
};

/**
 * Maps metadata fields to string placeholders used by action arguments.
 */
// export function mapMetadataToDictionary(metadata: IMetadata): Record<string, string> {
//     const dictionary: Record<string, string> = {};

//     dictionary['generatedBy'] = metadata.GeneratedBy;
//     dictionary['enabled'] = String(metadata.Enabled);
//     dictionary['name'] = metadata.Name;
//     dictionary['file'] = metadata.Path;
//     dictionary['modified'] = metadata.Modified;
//     dictionary['cellwidth'] = String(metadata.Width);
//     dictionary['cellheight'] = String(metadata.Height);
//     dictionary['columns'] = String(metadata.Columns);
//     dictionary['rows'] = String(metadata.Rows);
//     dictionary['width'] = String(metadata.Width * metadata.Columns);
//     dictionary['height'] = String(metadata.Height * metadata.Rows);
//     dictionary['filewithoutextension'] = changeExtension(metadata.Path, '');
//     dictionary['directory'] = path.dirname(metadata.Path);          // this could be an issue, the default directory should be taken from the trigger file
//     return dictionary;
// }



export function mapMetadataToDictionary(store: Record<string, string> , metadata: IMetadata): Record<string, string> {
    const dictionary: Record<string, string> = {};

    if (metadata.GeneratedBy !== undefined)
    {
        addIfNotExists(store, 'generatedBy', metadata.GeneratedBy);
    }

    if (metadata.Enabled !== undefined)
    {
        addIfNotExists(store, 'enabled',  String(metadata.Enabled));
    }

    if (metadata.Name !== undefined)
    {
        addIfNotExists(store, 'name',  metadata.Name);
    }

    if (metadata.Path !== undefined)
    {
        addIfNotExists(store, 'file',  metadata.Path);
    }

    if (metadata.Modified !== undefined)
    {
        addIfNotExists(store, 'modified',  metadata.Modified);
    }

    if (metadata.Width !== undefined)
    {
        addIfNotExists(store, 'cellwidth',  String(metadata.Width));
    }

    if (metadata.Height !== undefined)
    {
        addIfNotExists(store, 'cellheight',  String(metadata.Height));
    }

    if (metadata.Columns !== undefined)
    {
        addIfNotExists(store, 'columns',  String(metadata.Columns));
    }


    if (metadata.Rows !== undefined)
    {
        addIfNotExists(store, 'rows',  String(metadata.Rows));
    }

    if (metadata.Columns !== undefined)
    {
        addIfNotExists(store, 'width',  String(metadata.Columns));
    }

    if (metadata.Width !== undefined)
    {
        addIfNotExists(store, 'width', String(metadata.Width * metadata.Columns));
    }

    if (metadata.Height !== undefined)
    {
        addIfNotExists(store, 'height', String(metadata.Height * metadata.Rows));
    }

    if (metadata.Height !== undefined)
    {
        addIfNotExists(store, 'filewithoutextension', changeExtension(metadata.Path, ''));
    }

    if (metadata.Path !== undefined)
    {
        addIfNotExists(store, 'directory', path.dirname(metadata.Path));
    }
    return dictionary;
}


function addIfNotExists(store: Record<string, string> ,key: string, value: string) {
    if (!(key in store)) {
        store[key] = value;
    }
}

/**
 * Replaces placeholder tokens in a command argument with metadata values.
 */
export function applyMetadataToArgument(argument: string, dictionary: Record<string, string>): string {
    return Object.entries(dictionary).reduce((result, [key, value]) => {
        return result.replaceAll(`\${${key}}`, value);
    }, argument);
}

/**
 * Executes an external command and logs process output to the extension output
 * channel.
 */
export const executeFile = (filePath: string, parameters: string, workingDirectory: string = ''): boolean => {
    const cmd = `${filePath} ${parameters}`;
    try {
        outputChannel.appendLine(`[EXEC] Running: ${cmd}`);
        const output = execSync(cmd, {
            encoding: 'utf-8',
            cwd: workingDirectory,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        outputChannel.appendLine(`[EXEC] Output: ${output.trim()}`);
        return true;
    } catch (error: unknown) {
        const errorObj = error as { stderr?: string; message?: string; code?: number };
        const stderr = errorObj.stderr || errorObj.message || String(error);
        const code = errorObj.code || 'UNKNOWN';
        outputChannel.appendLine(`[EXEC] Failed with code ${code}: ${stderr.trim()}`);
        return false;
    }
};

/**
 * Resolves the metadata sidecar path for an asset file path.
 */
export function getMetadataFilePath(inputPath: string): string {
    return appendExtension(inputPath, 'metadata');
}

export async function fileExists(file: string): Promise<boolean> {
    return fs.existsSync(file);
}

export function mergeNoDuplicateKeys(
  a: Record<string, string>,
  b: Record<string, string>
): Record<string, string> {
  const result = { ...a };

  for (const key in b) {
    if (!(key in result)) {
      result[key] = b[key];
    }
  }

  return result;
}




export function isLikelyFileName(input: string): boolean {
    return path.basename(input) === input;
}

export function isLikelyFilePath(input: string): boolean {
    return path.dirname(input) !== '.';
}