import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { IMetadata } from '../models/IMetadata';
import { changeExtension, fileExists } from '../utils/utils';
import { getMetadata, loadMetadata, saveMetadata } from '../services/metadata';
import { getFile, getFiles } from '../services/files';


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
            let metadata = await loadMetadata(metadataPath.path);
            if (!metadata) {
              continue; // Skip if metadata cannot be loaded
            }
            metadata.Modified = new Date(0).toISOString();
            await saveMetadata(metadata, metadataPath.path);
            updatedCount++;
          }
          vscode.window.showInformationMessage(`Updated metadata for ${updatedCount} files in folder ${path.basename(selectedPath)}`);
        } else {

          const fileMetadata = getFile(selectedPath);
          // Handle single file

          const metadata = await loadMetadata(fileMetadata.path);

          if (!metadata) {
            vscode.window.showErrorMessage('Failed to load metadata file.');
            return;
          }
          metadata.Modified = new Date(0).toISOString();
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
