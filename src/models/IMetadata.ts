export interface IMetadata {
    GeneratedBy: string;
    /**
     * Disables action execution for this asset only.
     * Folder-wide disable behavior is controlled by action.metadata `enable`.
     */
    Enable: boolean;
    Name: string;
    Path: string;
    Modified: Date;             // date with time zone, used for compare operations
    ModifiedLocal: string;      // date just for user visualization, not used in any operations
    Width: number;
    Height: number;
    CellWidth: number;
    CellHeight: number;
    Columns: number;
    Rows: number;
}