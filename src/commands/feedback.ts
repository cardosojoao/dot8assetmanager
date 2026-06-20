import * as vscode from 'vscode';

export function registerFeedbackCommand(context: vscode.ExtensionContext) {

    const feedbackCommand = vscode.commands.registerCommand(
        'dot8assetmanager.sendFeedback',
        async () => {

            const choice = await vscode.window.showQuickPick(
                ['Bug Report', 'Feature Request', 'Question'],
                { placeHolder: 'What would you like to send?' }
            );

            if (!choice) {
                return;
            }

            let url: string;

            switch (choice) {
                case 'Bug Report':
                    url = 'https://github.com/cardosojoao/dot8assetmanager/issues/new?template=bug_report.yml';
                    break;

                case 'Feature Request':
                    url = 'https://github.com/cardosojoao/dot8assetmanager/issues/new?template=feature_request.yml';
                    break;

                default:
                    url = 'https://github.com/cardosojoao/dot8assetmanager/discussions';
                    break;
            }

            await vscode.env.openExternal(vscode.Uri.parse(url));
        });

    context.subscriptions.push(feedbackCommand);
}