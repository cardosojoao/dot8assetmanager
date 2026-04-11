import path from "path";
import fs from "fs";
import { IMetadata } from "../models/IMetadata";
import { outputChannel } from "../extension";
import { execSync } from "child_process";

/**
 * Returns a file path with the same base name and a different extension.
 */
export function changeExtension(filePath: string, newExt: string): string {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    return path.join(dir, `${base}${newExt}`);
}

export function appendExtension(filePath: string, newExt: string): string {
    return path.join(filePath,newExt);
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
export function mapMetadataToDictionary(metadata: IMetadata): Record<string, string> {
    const dictionary: Record<string, string> = {};

    dictionary['generatedBy'] = metadata.GeneratedBy;
    dictionary['enabled'] = String(metadata.Enabled);
    dictionary['name'] = metadata.Name;
    dictionary['file'] = metadata.Path;
    dictionary['modified'] = metadata.Modified;
    dictionary['cellwidth'] = String(metadata.Width);
    dictionary['cellheight'] = String(metadata.Height);
    dictionary['columns'] = String(metadata.Columns);
    dictionary['rows'] = String(metadata.Rows);
    dictionary['width'] = String(metadata.Width * metadata.Columns);
    dictionary['height'] = String(metadata.Height * metadata.Rows);
    dictionary['filewithoutextension'] = changeExtension(metadata.Path, '');
    dictionary['directory'] = path.dirname(metadata.Path);          // this could be an issue, the default directory should be taken from the trigger file
    return dictionary;
}


/**
 * Replaces placeholder tokens in a command argument with metadata values.
 */
export function argumentApplyMetadata(argument: string, dictionary: Record<string, string>): string {
    return Object.entries(dictionary).reduce((result, [key, value]) => {
        return result.replaceAll(`\${${key}}`, value);
    }, argument);
}

/**
 * Executes an external command and logs process output to the extension output
 * channel.
 */
export const ExecuteFile = (filePath: string, parameters: string, workingDirectory: string = ''): boolean => {
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
    return changeExtension(inputPath, '.metadata');
}