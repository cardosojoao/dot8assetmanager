# Dot8 Asset Manager

A VS Code extension for Dot8 Engine asset workflows.

It scans configured folders, creates sidecar metadata files, and executes action pipelines defined in action.metadata files.

## Features

- Incremental and full scans
  - Update Changed Assets processes assets whose metadata is stale
  - Update All Assets processes all matching assets
- Metadata sidecar generation
  - Creates .metadata files for discovered assets
  - TSX parsing extracts tile information from Tiled tilesets
- Folder-based action pipelines
  - Looks up the closest action.metadata by searching current folder and parents
  - Runs common steps plus extension-specific steps
- Live config reload
  - Watches settings changes and reloads without restart

## Commands

| Command ID | Palette Title | Description |
| --- | --- | --- |
| dot8assetmanager.updateChangedAssets | Update Changed Assets | Creates missing metadata, processes changed assets, and updates metadata timestamp only when all action steps succeed. |
| dot8assetmanager.updateAllAssets | Update All Assets | Scans and processes all matched assets, including metadata creation and action execution. |
| dot8assetmanager.updateMetadataFromExplorer | Touch Asset Metadata | Resets the Modified timestamp of .metadata file(s) so they will be reprocessed. Available in the explorer context menu for .metadata files (excluding action.metadata) and for folders (recursively touches all matching metadata files). |

## Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| dot8assetmanager.ScanFolders | string | "" | Comma-separated folder paths to scan for assets (e.g., `/assets,/sprites`). |
| dot8assetmanager.ScanExtensions | string | "" | Comma-separated file extensions to include (e.g., `.png,.tsx,.afb,.pt3`). |
| dot8assetmanager.LogLevel | enum | "info" | Log level: `silent`, `error`, `warning`, `info`, `debug`, or `trace`. |

Example workspace settings.json:

```json
{
  "dot8assetmanager.ScanFolders": "/assets,/sprites",
  "dot8assetmanager.ScanExtensions": ".png,.tsx,.afb,.pt3",
  "dot8assetmanager.LogLevel": "debug"
}
```

### Important: Scan Folders Must Be Within the Workspace

All folders specified in `ScanFolders` **must be within the current VS Code workspace**. The extension scans the workspace file system and cannot access folders outside the workspace boundaries. If a folder is outside the workspace, it will be skipped with a debug log message.

To include a folder:
1. Ensure it is part of your workspace (either in the workspace folder or a nested subdirectory)
2. Provide the path relative to the workspace root or as an absolute path within the workspace
3. The extension will validate folder accessibility during scanning

## action.metadata schema

No action.metadata file is currently committed in this repository, but the runtime schema is defined by src/models/IAction.ts and src/services/actionExecute.ts.

Required top-level fields:

- name: string
- enable: boolean
- steps: IStep[]
- byExtension: object containing extension keys and a default key

Optional top-level fields:

- description: string
- extensionOrder: string[] (defines desired file extension processing order; currently declared in type but not enforced by step resolution logic)

Enable behavior:

- `action.metadata.enable: false` disables action execution for that folder and any subfolder that inherits the same nearest `action.metadata` file.
- A closer `action.metadata` in a child folder overrides the parent folder's action selection.

Step fields used by runtime:

- name: string
- command: string
- args: string[]
- workingDirectory: string (optional, defaults to the folder of the file being processed)
- metadata: string[] (optional, additional metadata sources such as sidecar files from other extensions or generic key-value JSON files)

How step selection works:

1. Common steps from steps always run first.
2. Extension-specific steps are appended based on file extension.
3. If no extension match exists, byExtension.default.steps is used.

Example action.metadata:

```json
{
  "name": "asset-pipeline",
  "enable": true,
  "description": "Example pipeline",
  "steps": [
    {
      "name": "log-start",
      "command": "echo",
      "args": ["processing ${file}"]
    }
  ],
  "byExtension": {
    ".png": {
      "steps": [
        {
          "name": "convert-png",
          "metadata": ["pipeline.metadata"],
          "workingDirectory": "${directory}",
          "command": "convert",
          "args": [
            "${file}",
            "${filewithoutextension}.out.png"
          ]
        }
      ]
    },
    "default": {
      "steps": [
        {
          "name": "fallback-copy",
          "command": "echo",
          "args": ["No specific rule for ${file}"]
        }
      ]
    }
  }
}
```

## Metadata placeholder variables

These placeholders are replaced in args and workingDirectory:

### Standard metadata variables
- ${generatedBy}
- ${enabled}
- ${name}
- ${file}
- ${filewnameithoutextension}
- ${filewithoutextension}
- ${directory}
- ${modified}
- ${cellwidth}
- ${cellheight}
- ${columns}
- ${rows}
- ${width}
- ${height}

### Trigger variables
- ${trigger} - The full path of the physical file that triggered the event
- ${triggernamewithoutextension} - The file  that triggered the event name without extension
- ${triggerwithoutextension} - The trigger file path without its extension
- ${triggerdirectory} - The directory containing the trigger file

**Important**: The trigger is always the physical file that was changed and initiated the processing event. The file being processed (${file}) could be the trigger file itself, or it could be a different file whose metadata is derived from or referenced by the trigger file's metadata. For example, when a .tsx tileset file is modified, (${file}) metadata it might reference the .png sprite assets that the tileset references in its metadata.

Notes:

- Unknown placeholders are left unchanged.
- Values come from the asset .metadata plus optional extra metadata files listed in step.metadata.

## Asset .metadata schema

The generated sidecar file `file.ext.metadata` uses the shape defined by [src/models/IMetadata.ts](src/models/IMetadata.ts).

Important field behavior:

- `Enable: false` skips action execution for that specific asset file only.
- `Enable` does not disable sibling files, the containing folder, or child folders.
- To disable a folder or subtree, set `enable: false` in the nearest `action.metadata` file instead.

## step.metadata behavior

Each entry in step.metadata is loaded before argument substitution. Additional sidecar metadata files are not loaded automatically and must be explicitly listed in the step `metadata` property. This allows steps to reference additional metadata files that provide extra placeholder variables.

### Metadata resolution modes

#### 1. Extension-based metadata

Metadata files do not enforce strict naming rules, but by default the `.metadata` extension convention is used and appended to the asset file path:

- Example: `sprite.png.metadata` with asset `C:/assets/sprite.png` → loads `C:/assets/sprite.png.metadata`

This is useful for asset-specific metadata files that follow the same naming convention as the asset itself.

#### 2. File name-based metadata (no path separators)

No metadata files are auto-loaded in this mode. Only the base `file.ext.metadata` sidecar is loaded automatically. If an entry is explicitly listed in step `metadata` and looks like a file name (no forward slashes), it is resolved **in the same folder** as the asset:

This is useful for shared metadata files that apply to all assets in a folder when those files are explicitly referenced in step `metadata`.

#### 3. Path-based metadata (contains path separators)

If an entry contains path separators, it is used as a direct file path:

- Treated as a relative or absolute path
- Allows referencing metadata from outside the asset folder

### Metadata file format

All referenced metadata files must contain valid JSON. The JSON object is parsed and merged as additional placeholder keys available for argument substitution:

```json
{
  "customVar": "value",
  "outputDir": "out",
  "quality": "high"
}
```

These values are then available as `${customVar}`, `${outputDir}`, `${quality}` in step arguments and workingDirectory.

### Example usage

```json
{
  "name": "process-with-metadata",
  "command": "convert",
  "args": ["${file}", "-o", "${outputDir}/${filewithoutextension}.out.png"],
  "metadata": [
    "config.metadata",            // Load config.metadata
    "src/defaults.metadata"       // Load from src/defaults.metadata
  ]
}
```

## Metadata output behavior

The extension creates file.ext.metadata sidecars.

Current enrichment logic:

- .tsx: reads tileset and fills Width, Height, Columns, Rows, GeneratedBy, and updates Path to linked image path
- .png: sets GeneratedBy and Path
- .afb and .pt3: set GeneratedBy and Path
- other extensions: base metadata only unless updated by other flows
- new metadata files are created with `Enable: true`

Metadata Modified is updated to current timestamp only after all action steps for a file succeed.

## Development

Requirements:

- VS Code ^1.115.0
- Node.js 20+

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Watch mode:

```bash
npm run watch
```

Lint:

```bash
npm run lint
```

Test:

```bash
npm test
```

## Quick start for extension development

1. Open workspace in VS Code.
2. Run npm install.
3. Run npm run watch.
4. Press F5 to launch Extension Development Host.
5. Configure ScanFolders and ScanExtensions in workspace settings.
6. Run Update Changed Assets or Update All Assets from Command Palette.
