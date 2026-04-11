import { IFileItem } from '../models/IFileItem';
import { IMetadata } from '../models/IMetadata';
import { appendExtension, ExecuteFile, getMetadataFilePath } from '../utils/utils';
import { changeExtension, findFileUpward, mapMetadataToDictionary, argumentApplyMetadata } from '../utils/utils';
import { outputChannel } from '../extension';
import { saveMetadata, getMetadata, updateMetadataType } from './metaData';
import { Action } from '../models/action';
import path from 'path';
import * as vscode from 'vscode';

/**
 * Resolves the closest action metadata file for a folder and returns a parsed
 * Action model when available.
 */
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

/**
 * Executes all matching action steps for a file and updates the file metadata
 * modified timestamp only when every step succeeds.
 */
export async function executeAction(action: Action, file: IFileItem): Promise<void> {

    try {
        const steps = action.getStepsForFile(file.path);
        outputChannel.appendLine(`[ACTION] Found ${steps.length} steps to execute`);

        let metaData = await getMetadata(file.path);
        metaData = updateMetadataType(metaData,file.path) as IMetadata;
        //saveMetadata(metaData,getMetadataFilePath(metaData.Path));
        const metaDataDict: Record<string,string> = {};
        mapMetadataToDictionary(metaDataDict, metaData as IMetadata);
        metaDataDict['trigger'] = file.path;
        let allStepsResult: boolean = true;

        for (const step of steps) {
            outputChannel.appendLine(`[STEP] Executing: ${step.name}`);
            const metadataDictStep : Record<string, string> = {};
            
            if (step.metadata !== undefined &&   step.metadata.length > 0)
            {
                for( const metadataSource of step.metadata)
                {
                    if (metadataSource[0] === '.')
                    {
                        const metadataStepPath = changeExtension(file.path, metadataSource);
                        let metaDataStep = await getMetadata( metadataStepPath);
                        metaData = updateMetadataType(metaData,metadataStepPath) as IMetadata;
                        mapMetadataToDictionary(metadataDictStep, metaData as IMetadata);                    
                    }
                    else if( await vscode.Uri.file(metadataSource).scheme )
                    {

                    }

                    //const metadataStepPath = changeExtension(file.path, "."+extension);
                    //let metaDataStep = await getMetadata( metadataStepPath);
                    //metaData = updateMetadataType(metaData,metadataStepPath) as IMetadata;
                    //mapMetadataToDictionary(metadataDictStep, metaData as IMetadata);
                }
            }

            try {
                const args = step.args.map(arg => argumentApplyMetadata(arg, metaDataDict)).map(arg => argumentApplyMetadata(arg, metadataDictStep));
                //const args = step.args.map(arg => argumentApplyMetadata(arg, metaDataDict));

                const workingDir = step.workingDirectory ? argumentApplyMetadata(step.workingDirectory, metaDataDict) : '';
                const fullCommand = `${step.command} ${args.join(' ')}`;
                const stepSuccess = ExecuteFile(step.command, args.join(' '), workingDir);
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
            const metadataPath = appendExtension(file.path, 'metadata');
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


