import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { changeExtension, fileExists } from '../utils/utils';
import { saveMetadata } from '../services/metadata';
import { IMetadata } from '../models/IMetadata';
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

/**
 * Resets only the processing timestamps on an asset metadata sidecar.
 *
 * Do not use loadMetadata here: it applies runtime defaults (including
 * Enable: true), which would make a touch rewrite properties the user did not
 * ask to change.
 */
export async function touchAssetMetadata(metadataPath: string): Promise<void> {
  const raw = await fs.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(raw) as IMetadata;
  const resetDate = new Date(0);
  metadata.Modified = resetDate;
  metadata.ModifiedLocal = resetDate.toLocaleString();
  saveMetadata(metadata, metadataPath);
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

            await touchAssetMetadata(metadataPath.path);
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

          await touchAssetMetadata(fileMetadata.path);
          vscode.window.showInformationMessage(`Updated metadata: ${path.basename(selectedPath)}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Error accessing selected path. ${error}`);
      }
    }
  );
  context.subscriptions.push(disposable);
}
