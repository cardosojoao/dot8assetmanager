import * as vscode from 'vscode';
import { IFileItem } from '../models/IFileItem';
import { IMetadata } from '../models/IMetadata';
import { appendExtension, executeFile, fileExists, changeExtension, findFileUpward, mapMetadataToDictionary, applyMetadataToArgument, resolvePathFromFileDirectory, mapMetadataToDictionaryTrigger } from '../utils/utils';
import { saveMetadata, getMetadata, updateMetadataType, getMetadataGeneric } from './metadata';
import { Action } from '../models/action';
import path from 'path';
import { logger } from '../services/logger';

export interface IActionExecutionError {
    filePath: string;
    stepName: string;
    message: string;
}

export interface IActionExecutionResult {
    filePath: string;
    success: boolean;
    skipped: boolean;
    errors: IActionExecutionError[];
}

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
            logger.warn(`[ACTION] ⚠️ No action file found for ${folder}`);
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
export async function executeAction(action: Action, file: IFileItem): Promise<IActionExecutionResult> {
    const result: IActionExecutionResult = {
        filePath: file.path,
        success: true,
        skipped: false,
        errors: [],
    };

    try {
        const steps = action.getStepsForFile(file.path);
        if (steps.length === 0) {
            logger.debug(`[ACTION] ⏭️  no steps found for: ${file.path}`);
            // no steps, mark file a processed
            const now = new Date();
            const metadataPath = appendExtension(file.path, 'metadata');
            let metaData = await getMetadata(file.path);
            metaData.Modified = now;
            metaData.ModifiedLocal = metaData.Modified.toLocaleString();
            saveMetadata(metaData, metadataPath);
            file.modified = now;
            return result;
        }

        logger.debug(`[ACTION] Found ${steps.length} steps to execute`);

        let metaData = await getMetadata(file.path);
        metaData = updateMetadataType(metaData, file.path) as IMetadata;

        // Skip processing if file is disabled
        if (metaData.Enable === false) {
            logger.debug(`[ACTION] ⏭️  Skipping disabled file: ${file.path}`);
            result.success = false;
            result.skipped = true;
            return result;
        }

        const metaDataDict: Record<string, string> = {};
        mapMetadataToDictionaryTrigger(metaDataDict, file.path);

        // workspace roots as root, root0, root1... to support multi-root workspaces and related metadata in steps
        const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(wf => wf.uri.fsPath);
        let rootIndex = 0;
        for (const root of workspaceRoots) {
            metaDataDict[`root${rootIndex}`] = root;
            rootIndex++;
        }
        if (workspaceRoots.length > 0) {
            metaDataDict['root'] = workspaceRoots[0];
        }

        mapMetadataToDictionary(metaDataDict, metaData as IMetadata);
        let allStepsResult: boolean = true;

        for (const step of steps) {
            if (step.enable === undefined || step.enable) {

                logger.info(`[STEP] Executing: ${step.name}`);
                const metadataDictStep: Record<string, string> = {};

                if (step.metadata !== undefined && step.metadata.length > 0)  {
                    for (const metadataSource of step.metadata) {
                        // standard metadata file
                        if (metadataSource[0] === '.') {
                            const metadataStepPath = changeExtension(file.path, metadataSource);
                            try {
                                if (await fileExists(metadataStepPath)) {
                                    let metaDataStep = await getMetadata(metadataStepPath);
                                    metaData = updateMetadataType(metaData, metadataStepPath) as IMetadata;
                                    mapMetadataToDictionary(metadataDictStep, metaData as IMetadata);
                                }
                                else {
                                    logger.warn(`[STEP] ⚠️ Extend metadata not available: ${metadataStepPath}`);
                                }
                            }
                            catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                logger.warn(`[STEP] ❌  can't load extended metadata file: ${metadataStepPath}`);
                                result.errors.push({ filePath: file.path, stepName: step.name, message: `Failed to load extended metadata: ${errorMessage}` });
                            }
                        }
                        // generic metadata file consumed as key value pair
                        else {
                            const pathSource = resolvePathFromFileDirectory(file.path, metadataSource);
                            if (await fileExists(pathSource)) {
                                const ext = await getMetadataGeneric(pathSource);
                                // merge content with  current dictionary
                                for (const key in ext) {
                                    if (!(key in metadataDictStep)) {
                                        metadataDictStep[key] = String(ext[key]);
                                    }
                                }
                            }
                            else {
                                logger.warn(`[STEP] ⚠️ Extend metadata not available: ${pathSource}`);
                            }
                        }
                    }
                }

                try {
                    const args = step.args.map(arg => applyMetadataToArgument(arg, metaDataDict)).map(arg => applyMetadataToArgument(arg, metadataDictStep));
                    const workingDir = step.workingDirectory
                        ? applyMetadataToArgument(step.workingDirectory, metaDataDict)
                        : path.dirname(file.path);
                    const stepSuccess = executeFile(step.command, args.join(' '), workingDir);
                    if (!stepSuccess) {
                        const errorMessage = `Step command failed: ${step.command}`;
                        logger.error(`[STEP] ❌ Step failed: ${step.name}`);
                        result.errors.push({ filePath: file.path, stepName: step.name, message: errorMessage });
                        allStepsResult = false;
                        break;
                    }

                    const now = new Date();
                    const metadataPath = appendExtension(file.path, 'metadata');
                    metaData.Modified = now;
                    metaData.ModifiedLocal = metaData.Modified.toLocaleString();
                    saveMetadata(metaData, metadataPath);
                    file.modified = now;

                    logger.info(`[STEP] ✅  Step succeeded: ${step.name}`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger.error(`[STEP] ❌ Step error: ${errorMessage}`);
                    result.errors.push({ filePath: file.path, stepName: step.name, message: errorMessage });
                    allStepsResult = false;
                    break;
                }
            }
            else {
                logger.debug(`[STEP] skip step: ${step.name}`);
            }
        }

        if (allStepsResult) {
            logger.info(`[ACTION] ✅  All steps completed, metadata updated`);
        } else {
            logger.error(`[ACTION] ❌ Action failed, metadata not updated`);
            result.success = false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[ACTION] ❌ Fatal error executing action for ${file.path}: ${errorMessage}`);
        result.errors.push({ filePath: file.path, stepName: 'fatal', message: errorMessage });
        result.success = false;
    }

    return result;
}
