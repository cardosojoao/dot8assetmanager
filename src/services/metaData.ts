import fs from 'fs';
import path from 'path';
import { version } from '../../package.json';
import { readTileSet } from '../services/TileSet';
import { changeExtension } from '../utils/utils';
import { IMetadata } from '../models/IMetadata';

const GENERATED_BY = `Dot8-MetadataUpdate-${version}`;

function getMetadataFilePath(inputPath: string): string {
    return changeExtension(inputPath, '.metadata');
}

function loadOrCreateMetadata(targetPath: string): IMetadata {
    const metadataPath = getMetadataFilePath(targetPath);
    const raw = fs.readFileSync(metadataPath, 'utf-8');
    const data: IMetadata = JSON.parse(raw);
    return data;
}


export function   CreateMetadata(targetPath: string): void {
    const metadataPath = getMetadataFilePath(targetPath);

    if (!fs.existsSync(metadataPath)) {
        const modified = fs.statSync(targetPath).mtime;
        const metadata: IMetadata = {
            Enabled: true,
            Modified: modified.toISOString(),
            Path: targetPath,
        } as IMetadata;
        updateMetadataType(metadata);
    }
}


function updateMetadataType(metdata: IMetadata): void {
    switch (path.extname(metdata.Path)) {
        case '.tsx':
            updateTileSet(metdata);
            break;
        case '.png':
            updatePattern(metdata);
            break;
        case '.afb':
        case '.pt3':
            updateGeneric(metdata);
            break;
        default:
            break;
    }
}



export function saveMetadata(metadata: IMetadata, metadataPath: string): void {
    const json = JSON.stringify(metadata, null, 2);
    fs.writeFileSync(metadataPath, json, 'utf-8');
}

//
// Update metadata for a tileset file.
//
function updateTileSet(metadata: IMetadata): void {
    const tileSet = readTileSet(metadata.Path);
    const pathData = path.join(path.dirname(metadata.Path), tileSet.image.source);
    const metadataPath = getMetadataFilePath(pathData);

    metadata.GeneratedBy = GENERATED_BY;
    metadata.Width = tileSet.tilewidth;
    metadata.Height = tileSet.tileheight;
    metadata.Columns = tileSet.columns;
    metadata.Rows = tileSet.tilecount / tileSet.columns;
    metadata.Path = pathData;

    saveMetadata(metadata, metadataPath);
}

//
// Update metadata for a pattern file (e.g. .png).
//
function updatePattern(metadata: IMetadata): void {
    const metadataPath = getMetadataFilePath(metadata.Path);

    metadata.GeneratedBy = GENERATED_BY;
    metadata.Path = metadata.Path;

    saveMetadata(metadata, metadataPath);
}

//
// Update metadata for generic files (e.g. .afb, .pt3).
//
function updateGeneric(metadata: IMetadata): void {
    const metadataPath = getMetadataFilePath(metadata.Path);

    metadata.GeneratedBy = GENERATED_BY;

    saveMetadata(metadata, metadataPath);
}

export async function getMetadata(fileData: string): Promise<IMetadata> {
    const filePathMetadata = changeExtension(fileData, '.metadata');
    const raw = await fs.promises.readFile(filePathMetadata, 'utf-8');
    const parsed = JSON.parse(raw) as IMetadata;
    return parsed;
}
