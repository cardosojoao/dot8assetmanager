import { outputChannel } from "../extension";
import { Action } from "../models/action";
import { IFileItem } from "../models/IFileItem";
import * as Path from "path";
import { executeAction, getActionMetadata } from "./actionExecute";

export async function ProcessFiles(files: IFileItem[]): Promise<void> {
    const grouped = files.reduce((acc, file) => {
        const folder = Path.dirname(file.filter);
        if (!acc[folder]) { acc[folder] = []; }
        acc[folder].push(file);
        return acc;
    }, {} as Record<string, IFileItem[]>);

    // get the action for folder
    for (const folder in grouped) {
        outputChannel.appendLine(`[ACTION] Processing folder: ${folder}`);
        const action: Action | null = await getActionMetadata(folder);
        if (action === null) {
            continue;
        }
        for (const file of grouped[folder]) {
            outputChannel.appendLine(`[ACTION] Processing file: ${file?.path}`);
            try {
                await executeAction(<Action>action, <IFileItem>file);
            } catch (error) {
                outputChannel.appendLine(`[ERROR] ❌ Failed to process file ${file?.path}: ${error}`);
            }
        }
    }
}