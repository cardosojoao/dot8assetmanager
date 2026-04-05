import { IFileItem } from '../models/IFileItem';
import { IMetadata } from '../models/IMetadata';
import { ExecuteFile } from '../utils/utils';
import { changeExtension, findFileUpward , mapMetadataToDictionary,argumentApplyMetadata} from '../utils/utils';
import { outputChannel } from '../extension';
import { saveMetadata, getMetadata } from './metaData';
import { Action } from '../models/action';

export async function getActionMetadata(file: IFileItem): Promise<void> {
    try {
        const action = findFileUpward(file.path, 'action.metadata');
        if (action !== null) {
            outputChannel.appendLine(`[ACTION] Found action file: ${action}`);

            const actionData = Action.fromFile(action);
            const steps = actionData.getStepsForFile(file.path);
            outputChannel.appendLine(`[ACTION] Found ${steps.length} steps to execute`);

            const metaData = await getMetadata(file.path);
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
                    outputChannel.appendLine(`[STEP] ✓ Step succeeded: ${step.name}`);
                } catch (error) {
                    outputChannel.appendLine(`[STEP] ❌ Step error: ${error instanceof Error ? error.message : String(error)}`);
                    allStepsResult = false;
                    break;
                }
            }

            if (allStepsResult) {
                const now = new Date();
                const metadataPath = changeExtension(file.path, '.metadata');
                const metadata = await getMetadata(file.path);
                metadata.Modified = now.toISOString();
                saveMetadata(metadata, metadataPath);
                outputChannel.appendLine(`[ACTION] ✓ All steps completed, metadata updated at ${now.toISOString()}`);
            } else {
                outputChannel.appendLine(`[ACTION] ❌ Action failed, metadata not updated`);
            }
        } else {
            outputChannel.appendLine(`[ACTION] ⚠ No action file found for ${file.path}`);
        }
    } catch (error) {
        outputChannel.appendLine(`[ACTION] ❌ Fatal error processing ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
