export interface ITilesetImage {
    source: string;
    width: number;
    height: number;
}

export interface ITileset {
    image: ITilesetImage;
    version: number;
    tiledversion: string;
    name: string;
    tilewidth: number;
    tileheight: number;
    tilecount: number;
    columns: number;
}