import { LogLevel } from "../services/logger";

export interface Dot8AssetManagerConfig {
    scanFolders: string[],
    scanExtensions: string[];
    logLevel : LogLevel
}