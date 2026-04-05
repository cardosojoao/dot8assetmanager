// import * as vscode from 'vscode';
// import {reloadConfig} from './config';
// export async function setupCommand(context: vscode.ExtensionContext): Promise<boolean> {

//     // ─── Step 1: Server URL ───────────────────────────────────────────────────
//     // const serverUrl = await vscode.window.showInputBox({
//     //     title:         'Setup (1/3) — Server URL',
//     //     prompt:        'Enter the server URL',
//     //     value:         'http://localhost:3000',
//     //     ignoreFocusOut: true,
//     //     validateInput: (v) => {
//     //         try   { new URL(v); return null; }
//     //         catch { return 'Enter a valid URL (e.g. http://localhost:3000)'; }
//     //     }
//     // });
//     // if (serverUrl === undefined) return false;

//     // ─── Step 2: API Key ──────────────────────────────────────────────────────
//     // const apiKey = await vscode.window.showInputBox({
//     //     title:         'Setup (2/3) — API Key',
//     //     prompt:        'Enter your API key',
//     //     ignoreFocusOut: true,
//     //     password:      true,
//     //     validateInput: (v) => v.trim().length === 0 ? 'API key cannot be empty' : null
//     // });
//     // if (apiKey === undefined) return false;
    
//     // ─── Step 3: Timeout ──────────────────────────────────────────────────────
//     // const timeoutStr = await vscode.window.showInputBox({
//     //     title:         'Setup (3/3) — Timeout',
//     //     prompt:        'Enter timeout in milliseconds',
//     //     value:         '5000',
//     //     ignoreFocusOut: true,
//     //     validateInput: (v) => {
//     //         const n = Number(v);
//     //         if (isNaN(n))  return 'Must be a number';
//     //         if (n < 1000)  return 'Minimum is 1000ms';
//     //         if (n > 30000) return 'Maximum is 30000ms';
//     //         return null;
//     //     }
//     // });
//     // if (timeoutStr === undefined) return false;
//     // ─── Save Settings ────────────────────────────────────────────────────────
//     // // const target = vscode.ConfigurationTarget.WorkspaceFolder;
//     // // const scope  = vscode.workspace.workspaceFolders?.[0]?.uri;
//     // // const cfg    = vscode.workspace.getConfiguration('dot8assetmanager', scope);

//     try {
//     // //     await cfg.update('rootPath', "d:\\test",          target);
//     // //     //await cfg.update('apiKey',    apiKey,             target);
//     // //     //await cfg.update('timeout',   Number(timeoutStr), target);
//     // //     //await cfg.update('enabled',   true,               target);

//     // //     //await context.workspaceState.update('hasRunBefore', true);
//         reloadConfig();
//         vscode.window.showInformationMessage('✅ Setup complete!');
//         return true;

//     } catch (err) {
//         vscode.window.showErrorMessage(`❌ Setup failed: ${err}`);
//         return false;
//     }
// }