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

    private normalizeStep(step: IStep): IStep {
        return {
            enable: step.enable ?? true,
            ...step,
        };
    }

    constructor(data: IActionFile) {
        this.name = data.name;
        this.description = data.description;
        this.steps = data.steps.map(step => this.normalizeStep(step));
        this.byExtension = {} as { [extension: string]: IExtensionSteps; default: IExtensionSteps };
        for (const extension in data.byExtension) {
            this.byExtension[extension] = {
                steps: data.byExtension[extension].steps.map(step => this.normalizeStep(step)),
            };
        }
        this.extensionOrder = data.extensionOrder;
        this.enable = data.enable ?? true;
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