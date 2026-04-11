export interface IStep {
    name: string;
    metadata: string[];
    command: string;
    workingDirectory?: string;
    args: string[];
}

export interface IExtensionSteps {
    steps: IStep[];
}

export interface IActionFile {
    name: string;
    description?: string;
    steps: IStep[];
    extensionOrder: string[]; // defines the order of extensions to process, e.g. ["png", "nxp", "default"]
    byExtension: {
        [extension: string]: IExtensionSteps;  // handles ".ts", ".py", etc.
        default: IExtensionSteps;              // fallback
    };
}


// example data structure for actions.json, which defines how to process different file types with specific commands and arguments.
/*
{
  "name": "build-action",
  "description": "Compile and process files",
  "steps": [
    {
      "name": "common-step",
      "command": "echo",
      "args": ["starting process"]
    }
  ],
  "byExtension": {
    ".ts": {
      "steps": [
        {
          "name": "compile-ts",
          "command": "tsc",
          "args": ["${file}"]
        }
      ]
    },
    ".py": {
      "steps": [
        {
          "name": "run-python",
          "command": "python",
          "args": ["${file}"]
        }
      ]
    },
    "default": {
      "steps": [
        {
          "name": "copy-file",
          "command": "cp",
          "args": ["${file}", "${outputDir}"]
        }
      ]
    }
  }
}
*/


// example filled by code
/*
const action: IActionFile = {
    name: "build-action",
    description: "Compile and process files",
    steps: [
        { name: "common-step", command: "echo", args: ["starting"] }
    ],
    byExtension: {
        ".ts": {
            steps: [{ name: "compile-ts", command: "tsc", args: ["${file}"] }]
        },
        default: {
            steps: [{ name: "copy-file", command: "cp", args: ["${file}", "${outputDir}"] }]
        }
    }
};

*/