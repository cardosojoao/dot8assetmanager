import path from "path";
import fs from "fs";
import { IMetadata } from "../models/IMetadata";
import { execSync } from "child_process";
import { logger } from "../services/logger";
/**
 * Returns a file path with the same base name and a different extension.
 */
export function changeExtension(filePath: string, newExt: string): string {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    return path.join(dir, `${base}${newExt}`);
}

export function appendExtension(filePath: string, newExt: string): string {
    return filePath + "." + newExt;
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


export function mapMetadataToDictionaryTrigger(store: Record<string, string>, metadata: IMetadata): Record<string, string> {
    if (metadata.Path !== undefined) {
        addIfNotExists(store, 'file', metadata.Path);
    }

    if (metadata.Path !== undefined) {
        addIfNotExists(store, 'filewithoutextension', changeExtension(metadata.Path, ''));
    }

    if (metadata.Path !== undefined) {
        addIfNotExists(store, 'filenamewithoutextension', path.basename(store['filewithoutextension']));
    }
    if (metadata.Path !== undefined) {
        addIfNotExists(store, 'directory', path.dirname(metadata.Path));
    }
    return store;
}
 

/**
 * Maps metadata fields to string placeholders used by action arguments.
 */
export function mapMetadataToDictionary(store: Record<string, string>, metadata: IMetadata): Record<string, string> {
    if (metadata.GeneratedBy !== undefined) {
        addIfNotExists(store, 'generatedBy', metadata.GeneratedBy);
    }

    if (metadata.Enable !== undefined) {
        addIfNotExists(store, 'enabled', String(metadata.Enable));
    }

    if (metadata.Name !== undefined) {
        addIfNotExists(store, 'name', metadata.Name);
    }



    if (metadata.Modified !== undefined) {
        addIfNotExists(store, 'modified', metadata.Modified);
    }

    if (metadata.CellWidth !== undefined) {
        addIfNotExists(store, 'cellwidth', String(metadata.CellWidth));
    }

    if (metadata.CellHeight !== undefined) {
        addIfNotExists(store, 'cellheight', String(metadata.CellHeight));
    }

    if (metadata.Columns !== undefined) {
        addIfNotExists(store, 'columns', String(metadata.Columns));
    }

    if (metadata.Rows !== undefined) {
        addIfNotExists(store, 'rows', String(metadata.Rows));
    }

    if (metadata.Width !== undefined) {
        addIfNotExists(store, 'width', String(metadata.Width));
    }

    if (metadata.Height !== undefined) {
        addIfNotExists(store, 'height', String(metadata.Height));
    }


    return store;
}


function addIfNotExists(store: Record<string, string>, key: string, value: string) {
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
        logger.debug(`[EXEC] Running: ${cmd}`);
        const output = execSync(cmd, {
            encoding: 'utf-8',
            cwd: workingDirectory,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        logger.debug(`[EXEC] Output: ${output.trim()}`);
        return true;
    } catch (error: unknown) {
        const errorObj = error as { stderr?: string; message?: string; code?: number };
        const stderr = errorObj.stderr || errorObj.message || String(error);
        const code = errorObj.code || 'UNKNOWN';
        logger.error(`[EXEC] Failed with code ${code}: ${stderr.trim()}`);
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

export function isLikelyFileName(input: string): boolean {
    return path.basename(input) === input;
}

export function isTrulyAbsolutePath(inputPath: string): boolean {
    // On Windows, path.isAbsolute('/foo') is true (rooted on current drive).
    // Treat single-leading-slash paths as relative in extension metadata config.
    if (process.platform === 'win32' && /^[/\\](?![/\\])/.test(inputPath)) {
        return false;
    }

    return path.isAbsolute(inputPath);
}

export function resolvePathFromFileDirectory(triggerFilePath: string, sourcePath: string): string {
    const normalizedSource = sourcePath.trim();

    if (isTrulyAbsolutePath(normalizedSource)) {
        return path.normalize(normalizedSource);
    }

    const relativeSource = process.platform === 'win32'
        ? normalizedSource.replace(/^[/\\]+/, '')
        : normalizedSource;

    return path.normalize(path.join(path.dirname(triggerFilePath), relativeSource));
}

// export function isLikelyFilePath(input: string): boolean {
//     return path.dirname(input) !== '.';
// }

export function getPatternDimensions(input: string): [width: number, height: number] {
    const buffer = fs.readFileSync(input);
    const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
    if (!isPng) {
        throw new Error("Not a PNG file");
    }
    // Read dimensions
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return [width, height];
}