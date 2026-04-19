import * as path from 'path';
import * as vscode from 'vscode';
import { IMetadata } from '../models/IMetadata';
import { changeExtension, fileExists } from '../utils/utils';
import { getMetadata, saveMetadata} from '../services/metadata';

export function registerUpdateMetadataCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'dot8assetmanager.updateMetadataFromExplorer',
    async (resource: vscode.Uri | vscode.Uri[]) => {
      const uri = Array.isArray(resource) ? resource[0] : resource;
      if (!uri) {
        vscode.window.showErrorMessage('No file selected to update metadata.');
        return;
      }

      const selectedPath = uri.fsPath;
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
      // Get minimum possible Date value
      const minDate = new Date(0); // Unix epoch (1970-01-01)
      metadata.Modified = minDate.toISOString();
      saveMetadata(metadata, metadataPath);
      vscode.window.showInformationMessage(`Updated metadata: ${path.basename(metadataPath)}`);
    }
  );
  context.subscriptions.push(disposable);
}
