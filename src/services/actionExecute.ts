import { IFileItem } from '../models/IFileItem';
import { IMetadata } from '../models/IMetadata';
import { ExecuteFile, getMetadataFilePath } from '../utils/utils';
import { changeExtension, findFileUpward, mapMetadataToDictionary, argumentApplyMetadata } from '../utils/utils';
import { outputChannel } from '../extension';
import { saveMetadata, getMetadata, updateMetadataType } from './metaData';
import { Action } from '../models/action';

export async function getActionMetadata(folder: string): Promise<Action | null> {
    try {
        const actionPath = findFileUpward(folder, 'action.metadata');
        if (actionPath !== null) {
            outputChannel.appendLine(`[ACTION] Found action file: ${actionPath}`);
            return Action.fromFile(actionPath);
        } else {
            outputChannel.appendLine(`[ACTION] ⚠️ No action file found for ${folder}`);
        }
    } catch (error) {
        outputChannel.appendLine(`[ACTION] ❌ Fatal error processing ${folder}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
}

export async function executeAction(action: Action, file: IFileItem): Promise<void> {

    try {
        const steps = action.getStepsForFile(file.path);
        outputChannel.appendLine(`[ACTION] Found ${steps.length} steps to execute`);

        let metaData = await getMetadata(file.path);
        metaData = updateMetadataType(metaData,file.path) as IMetadata;
        //saveMetadata(metaData,getMetadataFilePath(metaData.Path));
        const metaDataDict = mapMetadataToDictionary(metaData as IMetadata);
        let allStepsResult: boolean = true;

        for (const step of steps) {
            outputChannel.appendLine(`[STEP] Executing: ${step.name}`);
            try {
                const args = step.args.map(arg => argumentApplyMetadata(arg, metaDataDict));
                const fullCommand = `${step.command} ${args.join(' ')}`;
                //outputChannel.appendLine(`[STEP] Command: ${fullCommand}`);

                const stepSuccess = ExecuteFile(step.command, args.join(' '));
                if (!stepSuccess) {
                    outputChannel.appendLine(`[STEP] ❌ Step failed: ${step.name}`);
                    allStepsResult = false;
                    break;
                }
                outputChannel.appendLine(`[STEP] ✅  Step succeeded: ${step.name}`);
            } catch (error) {
                outputChannel.appendLine(`[STEP] ❌ Step error: ${error instanceof Error ? error.message : String(error)}`);
                allStepsResult = false;
                break;
            }
        }

        if (allStepsResult) {
            const now = new Date();
            const metadataPath = changeExtension(file.path, '.metadata');
//            const metadata = await getMetadata(file.path);
            metaData.Modified = now.toISOString();
            saveMetadata(metaData, metadataPath);
            outputChannel.appendLine(`[ACTION] ✅  All steps completed, metadata updated at ${now.toISOString()}`);
        } else {
            outputChannel.appendLine(`[ACTION] ❌ Action failed, metadata not updated`);
        }
    } catch (error) {
        outputChannel.appendLine(`[ACTION] ❌ Fatal error executing action for ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}


