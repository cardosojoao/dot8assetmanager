import * as vscode from 'vscode';
import { config, reloadConfig } from '../config/config';

let wasfocused = vscode.window.state.focused;
export function registerAutoUpdateCommand(context: vscode.ExtensionContext) {
    const disposable = vscode.window.onDidChangeWindowState((state) => {
        reloadConfig();
        if (state.focused && config.autoScan && !wasfocused) {
            // VS Code just gained focus
            vscode.commands.executeCommand('dot8assetmanager.updateChangedAssets');
        }
        wasfocused = state.focused;
    });

    context.subscriptions.push(disposable);
}