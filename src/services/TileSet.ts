import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { ITileset } from '../models/ITileSet';
export function readTileSet(pathFile: string): ITileset {
    const xml = fs.readFileSync(pathFile, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const parsed = parser.parse(xml);
    return parsed.tileset as ITileset;
}



