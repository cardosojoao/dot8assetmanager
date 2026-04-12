import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function setLoggerChannel(outputChannel: vscode.OutputChannel): void {
    channel = outputChannel;
}

export function logLine(message: string): void {
    if (channel) {
        channel.appendLine(message);
        return;
    }
    console.log(message);
}
