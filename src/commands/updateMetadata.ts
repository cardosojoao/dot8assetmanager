import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { IMetadata } from '../models/IMetadata';
import { changeExtension, fileExists } from '../utils/utils';
import { getMetadata, saveMetadata} from '../services/metadata';

async function getMetadataFiles(folderPath: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const items = await fs.readdir(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        files.push(...await getMetadataFiles(fullPath));
      } else {
        const assetPath = changeExtension(fullPath, '');
        if (await fileExists(assetPath)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore errors during directory traversal
  }
  return files;
}

export function registerUpdateMetadataCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'dot8assetmanager.updateMetadataFromExplorer',
    async (resource: vscode.Uri | vscode.Uri[]) => {
      const uri = Array.isArray(resource) ? resource[0] : resource;
      if (!uri) {
        vscode.window.showErrorMessage('No file or folder selected to update metadata.');
        return;
      }

      const selectedPath = uri.fsPath;
      try {
        const stat = await fs.stat(selectedPath);
        if (stat.isDirectory()) {
          // Handle folder: update metadata for all files in folder and subfolders
          const metadataFiles = await getMetadataFiles(selectedPath);
          let updatedCount = 0;
          for (const metadataPath of metadataFiles) {
            const assetPath = changeExtension(metadataPath, '');
            let metadata = await getMetadata(assetPath);
            if (!metadata) {
              continue; // Skip if metadata cannot be loaded
            }
            metadata.Modified = new Date(0).toISOString();
            await saveMetadata(metadata, metadataPath);
            updatedCount++;
          }
          vscode.window.showInformationMessage(`Updated metadata for ${updatedCount} files in folder ${path.basename(selectedPath)}`);
        } else {
          // Handle single file
          const metadataPath = selectedPath;
          const assetPath = changeExtension(selectedPath, '');
          if (!(await fileExists(assetPath))) {
            vscode.window.showErrorMessage(`Asset file not found: ${assetPath}`);
            return;
          }

          let metadata: IMetadata | undefined;
          if (await fileExists(metadataPath)) {
            metadata = await getMetadata(assetPath);
          }

          if (!metadata) {
            vscode.window.showErrorMessage('Failed to load metadata file.');
            return;
          }
          metadata.Modified = new Date(0).toISOString();
          await saveMetadata(metadata, metadataPath);
          vscode.window.showInformationMessage(`Updated metadata: ${path.basename(metadataPath)}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage('Error accessing selected path.');
      }
    }
  );
  context.subscriptions.push(disposable);
}
