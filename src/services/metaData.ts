import fs from 'fs';
import path from 'path';
import { version } from '../../package.json';
import { readTileSet } from '../services/TileSet';
import { changeExtension, getMetadataFilePath } from '../utils/utils';
import { IMetadata } from '../models/IMetadata';
import { IFileItem } from '../models/IFileItem';

const GENERATED_BY = `Dot8-MetadataUpdate-${version}`;

export function CreateMetadata(targetPath: string): void {
    const metadataPath = getMetadataFilePath(targetPath);
    if (!fs.existsSync(metadataPath)) {
        const modified = fs.statSync(targetPath).mtime;
        const metadata: IMetadata = {
            Enabled: true,
            Modified: modified.toISOString(),
            Path: targetPath,
        } as IMetadata;
        const update = updateMetadataType(metadata,targetPath);
        saveMetadata(update, metadataPath);
    }
}


export function updateMetadataType(metadata: IMetadata, filePath: string): IMetadata {
    let update = metadata;
    switch (path.extname(filePath).toLowerCase()) {
        case '.tsx':
            update = updateTileSet(metadata, filePath);
            break;
        case '.png':
            update = updatePattern(metadata,filePath);
            break;
        case '.afb':
        case '.pt3':
            update = updateGeneric(metadata,filePath);
            break;
        default:
            break;
    }
    return update;
}



export function saveMetadata(metadata: IMetadata, metadataPath: string): void {
    const json = JSON.stringify(metadata, null, 2);
    fs.writeFileSync(metadataPath, json, 'utf-8');
}

//
// Update metadata for a tileset file.
//
function updateTileSet(metadata: IMetadata, filePath: string): IMetadata {
    const tileSet = readTileSet(filePath);
    const pathData = path.join(path.dirname(metadata.Path), tileSet.image.source);

    metadata.GeneratedBy = GENERATED_BY;
    metadata.Width = tileSet.tilewidth;
    metadata.Height = tileSet.tileheight;
    metadata.Columns = tileSet.columns;
    metadata.Rows = tileSet.tilecount / tileSet.columns;
    metadata.Path = pathData;
    return metadata;
}

//
// Update metadata for a pattern file (e.g. .png).
//
function updatePattern(metadata: IMetadata, filePath: string): IMetadata {
    //const metadataPath = getMetadataFilePath(metadata.Path);

    metadata.GeneratedBy = GENERATED_BY;
    metadata.Path = filePath;
    return metadata;
}

//
// Update metadata for generic files (e.g. .afb, .pt3).
//
function updateGeneric(metadata: IMetadata, filePath: string): IMetadata {
    //const metadataPath = getMetadataFilePath(metadata.Path);

    metadata.GeneratedBy = GENERATED_BY;
    metadata.Path = filePath;
    return metadata;
}

export async function getMetadata(fileData: string): Promise<IMetadata> {
    const filePathMetadata = changeExtension(fileData, '.metadata');
    const raw = await fs.promises.readFile(filePathMetadata, 'utf-8');
    const parsed = JSON.parse(raw) as IMetadata;
    return parsed;
}
