import { IFileItem } from '../models/IFileItem';
import { IMetadata } from '../models/IMetadata';
import { appendExtension, executeFile, fileExists, isLikelyFileName, changeExtension, findFileUpward, mapMetadataToDictionary, applyMetadataToArgument } from '../utils/utils';
import { saveMetadata, getMetadata, updateMetadataType, getMetadataGeneric } from './metadata';
import { Action } from '../models/action';
import path from 'path';
import { logger } from '../services/logger';


/**
 * Resolves the closest action metadata file for a folder and returns a parsed
 * Action model when available.
 */
export async function getActionMetadata(folder: string): Promise<Action | null> {
    try {
        const actionPath = findFileUpward(folder, 'action.metadata');
        if (actionPath !== null) {
            logger.debug(`[ACTION] Found action file: ${actionPath}`);
            return Action.fromFile(actionPath);
        } else {
            logger.debug(`[ACTION] ⚠️ No action file found for ${folder}`);
        }
    } catch (error) {
        logger.error(`[ACTION] ❌ Fatal error processing ${folder}: ${error instanceof Error ? error.message : String(error)}`);
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
        logger.debug(`[ACTION] Found ${steps.length} steps to execute`);

        let metaData = await getMetadata(file.path);
        metaData = updateMetadataType(metaData, file.path) as IMetadata;
        
        // Skip processing if file is disabled
        if (metaData.Enabled === false) {
            logger.debug(`[ACTION] ⏭️  Skipping disabled file: ${file.path}`);
            return;
        }

        const metaDataDict: Record<string, string> = {};
        mapMetadataToDictionary(metaDataDict, metaData as IMetadata);
        metaDataDict['trigger'] = file.path;
        metaDataDict['triggerwithoutextension'] = changeExtension(file.path, '');
        metaDataDict['triggerdirectory'] =  path.dirname(file.path);
        let allStepsResult: boolean = true;



        for (const step of steps) {
            logger.debug(`[STEP] Executing: ${step.name}`);
            const metadataDictStep: Record<string, string> = {};

            if (step.metadata !== undefined && step.metadata.length > 0) {
                for (const metadataSource of step.metadata) {
                    // standard metadata file
                    if (metadataSource[0] === '.') {
                        const metadataStepPath = changeExtension(file.path, metadataSource);
                        let metaDataStep = await getMetadata(metadataStepPath);
                        metaData = updateMetadataType(metaData, metadataStepPath) as IMetadata;
                        mapMetadataToDictionary(metadataDictStep, metaData as IMetadata);
                    }
                    // generic metadata file consumed as key value pair
                    else {
                        let pathSource = metadataSource;
                        if (isLikelyFileName(metadataSource)) {
                            pathSource = path.join(path.dirname(file.path), metadataSource);
                        }

                        if (await fileExists(pathSource)) {
                            const ext = await getMetadataGeneric(pathSource);
                            // merge content with  current dictionary
                            for (const key in ext) {
                                if (!(key in metadataDictStep)) {
                                    metadataDictStep[key] = String(ext[key]);
                                }
                            }
                        }
                    }
                }
            }

            try {
                const args = step.args.map(arg => applyMetadataToArgument(arg, metaDataDict)).map(arg => applyMetadataToArgument(arg, metadataDictStep));
                const workingDir = step.workingDirectory
                    ? applyMetadataToArgument(step.workingDirectory, metaDataDict)
                    : path.dirname(file.path);
                const fullCommand = `${step.command} ${args.join(' ')}`;
                const stepSuccess = executeFile(step.command, args.join(' '), workingDir);
                if (!stepSuccess) {
                    logger.error(`[STEP] ❌ Step failed: ${step.name}`);
                    allStepsResult = false;
                    break;
                }
                logger.debug(`[STEP] ✅  Step succeeded: ${step.name}`);
            } catch (error) {
                logger.error(`[STEP] ❌ Step error: ${error instanceof Error ? error.message : String(error)}`);
                allStepsResult = false;
                break;
            }
        }

        if (allStepsResult) {
            const now = new Date();
            const metadataPath = appendExtension(file.path, 'metadata');
            metaData.Modified = now.toISOString();
            saveMetadata(metaData, metadataPath);
            logger.debug(`[ACTION] ✅  All steps completed, metadata updated at ${now.toISOString()}`);
        } else {
            logger.error(`[ACTION] ❌ Action failed, metadata not updated`);
        }
    } catch (error) {
        logger.error(`[ACTION] ❌ Fatal error executing action for ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
}


