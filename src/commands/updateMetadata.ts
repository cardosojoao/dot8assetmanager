import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { changeExtension, fileExists } from '../utils/utils';
import { loadMetadata, saveMetadata } from '../services/metadata';
import { getFile, getFiles } from '../services/files';

/**
 * Returns true only for an asset sidecar whose source asset still exists.
 * Action configuration also uses the .metadata extension, but it is a
 * different schema and must never be handled as asset metadata.
 */
export async function isAssetMetadataFile(metadataPath: string): Promise<boolean> {
  if (path.extname(metadataPath).toLowerCase() !== '.metadata') {
    return false;
  }

  if (path.basename(metadataPath).toLowerCase() === 'action.metadata') {
    return false;
  }

  return fileExists(changeExtension(metadataPath, ''));
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
          const filesMetadata = await getFiles([selectedPath], ["metadata"]);
          let updatedCount = 0;
          for (const metadataPath of filesMetadata) {
            if (!(await isAssetMetadataFile(metadataPath.path))) {
              continue;
            }

            let metadata = await loadMetadata(metadataPath.path);
            if (!metadata) {
              continue; // Skip if metadata cannot be loaded
            }
            metadata.Modified = new Date(0);
            metadata.ModifiedLocal = new Date(0).toLocaleString();
            await saveMetadata(metadata, metadataPath.path);
            updatedCount++;
          }
          vscode.window.showInformationMessage(`Updated metadata for ${updatedCount} files in folder ${path.basename(selectedPath)}`);
        } else {

          const fileMetadata = getFile(selectedPath);
          // Handle single file

          if (!(await isAssetMetadataFile(fileMetadata.path))) {
            vscode.window.showErrorMessage('Only asset metadata sidecars can be updated.');
            return;
          }

          const metadata = await loadMetadata(fileMetadata.path);

          if (!metadata) {
            vscode.window.showErrorMessage('Failed to load metadata file.');
            return;
          }
          metadata.Modified = new Date(0);
          metadata.ModifiedLocal = new Date(0).toLocaleString();          
          await saveMetadata(metadata, fileMetadata.path);
          vscode.window.showInformationMessage(`Updated metadata: ${path.basename(selectedPath)}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Error accessing selected path. ${error}`);
      }
    }
  );
  context.subscriptions.push(disposable);
}
