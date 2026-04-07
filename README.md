# Dot8 Asset Manager

A VS Code extension for managing and processing game assets for the **Dot8 Engine**. It watches an asset folder, detects new or modified files, generates `.metadata` sidecar files, and automatically runs configurable processing pipelines via `action.metadata` scripts.

---

## Features

- **Incremental & Full scanning** — update only changed assets or regenerate all assets with `updateChangedAssets` or `updateAllAssets` commands.
- **Metadata generation** — creates `.metadata` sidecar files for all supported assets. PNG files get enriched metadata with image dimensions. TSX (Tiled tileset) files include parsed tileset information (tile width, height, columns, rows). All other formats receive basic metadata with path and timestamps.
- **Tileset support** — parses `.tsx` (Tiled tileset) files using `fast-xml-parser` to extract tile dimensions, column/row counts, and linked image sources.
- **Action pipelines** — executes per-directory `action.metadata` scripts with per-extension step definitions and metadata-interpolated arguments (e.g. `${file}`, `${cellwidth}`).
- **Live config reload** — automatically reloads settings when `settings.json` changes, no restart required.

---

## Commands

| Command | Title | Description |
|---------|-------|-------------|
| `dot8assetmanager.updateChangedAssets` | Update Changed Assets | Scans the asset folders for new and modified files, creates missing metadata, and processes only the changed assets. |
| `dot8assetmanager.updateAllAssets` | Update All Assets | Scans and processes all asset files, regenerating metadata and running action pipelines for every asset. |

All commands are accessible via the **Command Palette** (`Ctrl+Shift+P`).

---

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `dot8assetmanager.ScanFolders` | `array` | `[]` | Array of folder paths to scan for assets. |
| `dot8assetmanager.ScanExtensions` | `array` | `[]` | Array of file extensions to process (e.g., `.png`, `.tsx`, `.afb`). |

Settings can be configured in **Workspace Settings** (`settings.json`).

---

## Action Pipelines

Place an `action.metadata` JSON file in any asset directory to define processing steps for files in that directory and its subdirectories. The extension walks up the directory tree to find the nearest `action.metadata` for each asset.

### action.metadata format

```json
{
  "name": "my-pipeline",
  "description": "Optional description",
  "steps": [
    {
      "name": "common-step",
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
          "args": ["-resize", "${cellwidth}x${cellheight}", "${file}", "${filewithoutextension}.out.png"]
        }
      ]
    },
    "default": {
      "steps": []
    }
  }
}
```

### Available metadata placeholders

| Placeholder | Value |
|-------------|-------|
| `${file}` | Full file path |
| `${filewithoutextension}` | File path without extension |
| `${directory}` | Directory containing the file |
| `${name}` | Asset name |
| `${modified}` | Last modified timestamp (ISO 8601) |
| `${cellwidth}` | Tile/cell width in pixels |
| `${cellheight}` | Tile/cell height in pixels |
| `${columns}` | Number of tile columns |
| `${rows}` | Number of tile rows |
| `${width}` | Total image width (`cellwidth × columns`) |
| `${height}` | Total image height (`cellheight × rows`) |
| `${generatedBy}` | Extension version string |
| `${enabled}` | Whether the asset is enabled |

---

## Metadata file format

Each asset gets a `.metadata` sidecar file containing metadata appropriate to the file type:

### PNG / TSX files (enriched metadata)
```json
{
  "GeneratedBy": "Dot8-MetadataUpdate-0.0.1",
  "Enabled": true,
  "Name": "sprite",
  "Path": "C:/assets/sprite.png",
  "Modified": "2026-01-01T00:00:00.000Z",
  "Width": 16,
  "Height": 16,
  "Columns": 4,
  "Rows": 8
}
```

### Other formats (basic metadata)
```json
{
  "GeneratedBy": "Dot8-MetadataUpdate-0.0.1",
  "Enabled": true,
  "Name": "animation",
  "Path": "C:/assets/animation.afb",
  "Modified": "2026-01-01T00:00:00.000Z",
  "Width": 0,
  "Height": 0,
  "Columns": 0,
  "Rows": 0
}
```

---

## Requirements

- **VS Code** `^1.110.0`
- **Node.js** (for building from source)

---

## Release Notes

### 0.0.1

- Initial release.
- Added command `dot8assetmanager.updateChangedAssets` to process changed assets only.
- Added command `dot8assetmanager.updateAllAssets` to process all assets.
- Added metadata sidecar generation for supported asset files.
- Added `.tsx` tileset parsing and metadata interpolation for action pipelines.
