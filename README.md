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

## Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| dot8assetmanager.ScanFolders | string[] | [] | Folder paths to scan for assets. |
| dot8assetmanager.ScanExtensions | string[] | [] | File extensions to include (for example .png, .tsx, .afb). |

Example workspace settings.json:

```json
{
  "dot8assetmanager.ScanFolders": [
    "D:/projects/mygame/assets"
  ],
  "dot8assetmanager.ScanExtensions": [
    ".png",
    ".tsx",
    ".afb",
    ".pt3"
  ]
}
```

## action.metadata schema

No action.metadata file is currently committed in this repository, but the runtime schema is defined by src/models/IAction.ts and src/services/actionExecute.ts.

Required top-level fields:

- name: string
- steps: IStep[]
- byExtension: object containing extension keys and a default key

Optional top-level fields:

- description: string
- extensionOrder: string[] (defines desired file extension processing order; currently declared in type but not enforced by step resolution logic)

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
          "command": "convert",
          "workingDirectory": "${directory}",
          "metadata": ["pipeline.vars.json"],
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

- ${generatedBy}
- ${enabled}
- ${name}
- ${file}
- ${modified}
- ${cellwidth}
- ${cellheight}
- ${columns}
- ${rows}
- ${width}
- ${height}
- ${filewithoutextension}
- ${directory}
- ${trigger}

Notes:

- Unknown placeholders are left unchanged.
- Values come from the asset .metadata plus optional extra metadata files listed in step.metadata.

## step.metadata behavior

Each entry in step.metadata is loaded before argument substitution:

- If entry starts with . (example .sprite.metadata):
  - Treated as an extension and resolved relative to the input file path
  - Example: C:/a/sprite.png + .sprite.metadata => C:/a/sprite.sprite.metadata
- Otherwise:
  - If it looks like a file name, it is resolved in the asset directory
  - If it looks like a path, it is used directly
  - File content must be JSON object and is merged as extra placeholder keys

## Metadata output behavior

The extension creates file.ext.metadata sidecars.

Current enrichment logic:

- .tsx: reads tileset and fills Width, Height, Columns, Rows, GeneratedBy, and updates Path to linked image path
- .png: sets GeneratedBy and Path
- .afb and .pt3: set GeneratedBy and Path
- other extensions: base metadata only unless updated by other flows

Metadata Modified is updated to current timestamp only after all action steps for a file succeed.

## Development

Requirements:

- VS Code ^1.110.0
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
