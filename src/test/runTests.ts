import * as path from 'path';
const { runTests } = require('vscode-test');

async function main() {
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../../'),
      extensionTestsPath: path.resolve(__dirname, './suite/index')
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();