# Dot8 Asset Manager

A VS Code extension for managing and processing game assets for the **Dot8 Engine**. It watches an asset folder, detects new or modified files, generates `.metadata` sidecar files, and automatically runs configurable processing pipelines via `action.metadata` scripts.

---

## Features

- **Automatic asset scanning** — detects new and modified asset files across configured asset directories.
- **Metadata generation** — creates `.metadata` sidecar files for each asset containing path, timestamps, dimensions, and tileset information.
- **Tileset support** — parses `.tsx` (Tiled tileset) files using `fast-xml-parser` to extract tile dimensions, column/row counts, and linked image sources.
- **Action pipelines** — executes per-directory `action.metadata` scripts with per-extension step definitions and metadata-interpolated arguments (e.g. `${file}`, `${cellwidth}`).
- **First-run setup wizard** — prompts on first workspace activation to configure the extension.
- **Live config reload** — automatically reloads settings when `settings.json` changes, no restart required.

### Supported asset types

| Extension | Description |
|-----------|-------------|
| `.png` | Sprite / pattern images |
| `.tsx` | Tiled tileset files |
| `.afb` | Dot8 animation banks |
| `.pt3` | Dot8 pattern files |
| `.json.gpl` | Colour palette files |

---

## Commands

| Command | Title | Description |
|---------|-------|-------------|
| `dot8assetmanager.scan` | Scan changes | Scans the asset root for new and modified files, creates missing metadata, and runs action pipelines for updated files. |
| `dot8assetmanager.setup` | Setup Dot8 Asset Manager | Runs the first-time setup wizard for the current workspace. |
| `dot8assetmanager.enable` | Enable Dot8 Asset Manager | Enables the extension for the current workspace. |
| `dot8assetmanager.disable` | Disable Dot8 Asset Manager | Disables the extension for the current workspace. |

All commands are accessible via the **Command Palette** (`Ctrl+Shift+P`).

---

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `dot8assetmanager.rootPath` | `string` | `../3.resources` | Root folder to scan for assets, relative to the workspace. |
| `dot8assetmanager.enableFeature` | `boolean` | `true` | Enable or disable asset processing. |
| `dot8assetmanager.buildPath` | `string` | `build/` | Path where build artifacts are generated. |

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

Each asset gets a `.metadata` sidecar file next to it:

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

---

## Requirements

- **VS Code** `^1.110.0`
- **Node.js** (for building from source)

---

## Release Notes

### 0.0.1

- Initial release.
- Asset scanning with new/modified file detection.
- Metadata generation for `.png`, `.tsx`, `.afb`, `.pt3`, `.json.gpl` files.
- Tileset parsing from `.tsx` files via `fast-xml-parser`.
- Action pipeline execution with metadata placeholder substitution.
- First-run setup wizard and live config reload.

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
