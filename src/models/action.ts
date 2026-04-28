import fs from 'fs';
import path from 'path';
import { IStep, IExtensionSteps, IActionFile } from './IAction';

export class Action implements IActionFile {
    name: string;
    description?: string;
    enable : boolean;
    steps: IStep[];
    extensionOrder: string[];
    byExtension: {
        [extension: string]: IExtensionSteps;
        default: IExtensionSteps;
    };

    constructor(data: IActionFile) {
        this.name = data.name;
        this.description = data.description;
        this.steps = data.steps;
        this.byExtension = data.byExtension;
        this.extensionOrder = data.extensionOrder;
        this.enable = data.enable;
    }

    getStepsForFile(filePath: string): IStep[] {
        const ext = path.extname(filePath);
        const extensionSteps = this.byExtension[ext] ?? this.byExtension.default;
        return [...this.steps, ...extensionSteps.steps];
    }

    static fromFile(filePath: string): Action {
        const data: IActionFile = JSON.parse(
            fs.readFileSync(path.resolve(filePath), 'utf-8')
        );
        return new Action(data);
    }
}

// usage
// const action = Action.fromFile('action.json');
// const steps = action.getStepsForFile('main.ts');