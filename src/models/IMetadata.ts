export interface IMetadata {
    GeneratedBy: string;
    /**
     * Disables action execution for this asset only.
     * Folder-wide disable behavior is controlled by action.metadata `enable`.
     */
    Enable: boolean;
    Name: string;
    Path: string;
    Modified: string;
    Width: number;
    Height: number;
    Columns: number;
    Rows: number;
}