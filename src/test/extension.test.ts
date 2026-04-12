import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

import { changeExtension, findFileUpward, mapMetadataToDictionary, applyMetadataToArgument } from '../utils/utils';
import { Action } from '../models/action';
import { IMetadata } from '../models/IMetadata';
import { createMetadata, saveMetadata } from '../services/metaData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'dot8test-'));
}

function makeMetadata(overrides: Partial<IMetadata> = {}): IMetadata {
    return {
        GeneratedBy: 'test',
        Enabled: true,
        Name: 'sprite',
        Path: '/assets/sprite.png',
        Modified: '2026-01-01T00:00:00.000Z',
        Width: 16,
        Height: 16,
        Columns: 4,
        Rows: 3,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// utils — changeExtension
// ---------------------------------------------------------------------------

suite('utils.changeExtension', () => {
    test('replaces extension', () => {
        assert.strictEqual(
            changeExtension('/assets/sprite.png', '.metadata'),
            path.join('/assets', 'sprite.metadata')
        );
    });

    test('replaces with empty string (strips extension)', () => {
        assert.strictEqual(
            changeExtension('/assets/sprite.png', ''),
            path.join('/assets', 'sprite')
        );
    });

    test('works when original has no extension', () => {
        assert.strictEqual(
            changeExtension('/assets/Makefile', '.metadata'),
            path.join('/assets', 'Makefile.metadata')
        );
    });
});

// ---------------------------------------------------------------------------
// utils — findFileUpward
// ---------------------------------------------------------------------------

suite('utils.findFileUpward', () => {
    let tmpDir: string;
    let childDir: string;

    setup(() => {
        tmpDir = makeTempDir();
        childDir = path.join(tmpDir, 'a', 'b', 'c');
        fs.mkdirSync(childDir, { recursive: true });
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('finds file in ancestor directory', () => {
        const target = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(target, '{}');
        const result = findFileUpward(childDir, 'action.metadata');
        assert.strictEqual(result, target);
    });

    test('finds file in the start directory itself', () => {
        const target = path.join(childDir, 'action.metadata');
        fs.writeFileSync(target, '{}');
        const result = findFileUpward(childDir, 'action.metadata');
        assert.strictEqual(result, target);
    });

    test('returns null when file does not exist anywhere', () => {
        const result = findFileUpward(childDir, 'nonexistent.metadata');
        assert.strictEqual(result, null);
    });

    test('accepts a file path (uses its directory)', () => {
        const target = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(target, '{}');
        const filePath = path.join(childDir, 'sprite.png');
        fs.writeFileSync(filePath, '');
        const result = findFileUpward(filePath, 'action.metadata');
        assert.strictEqual(result, target);
    });
});

// ---------------------------------------------------------------------------
// utils — mapMetadataToDictionary
// ---------------------------------------------------------------------------

suite('utils.mapMetadataToDictionary', () => {
    test('maps all expected keys', () => {

        const dict : Record<string, string> = {};
        const md = makeMetadata({ Path: '/assets/sprite.png', Width: 16, Height: 16, Columns: 4, Rows: 3 });
        mapMetadataToDictionary(dict,md);

        assert.strictEqual(dict['cellwidth'], '16');
        assert.strictEqual(dict['cellheight'], '16');
        assert.strictEqual(dict['columns'], '4');
        assert.strictEqual(dict['rows'], '3');
        assert.strictEqual(dict['width'], '64');   // 16 * 4
        assert.strictEqual(dict['height'], '48');  // 16 * 3
        assert.strictEqual(dict['file'], '/assets/sprite.png');
        assert.strictEqual(dict['enabled'], 'true');
        assert.strictEqual(dict['name'], 'sprite');
    });

    test('directory key is the dirname of Path', () => {
        const dict : Record<string, string> = {};
        const md = makeMetadata({ Path: '/assets/sub/sprite.png' });
        mapMetadataToDictionary(dict, md);
        assert.strictEqual(dict['directory'], path.dirname('/assets/sub/sprite.png'));
    });
});

// ---------------------------------------------------------------------------
// utils — applyMetadataToArgument
// ---------------------------------------------------------------------------

suite('utils.applyMetadataToArgument', () => {
    test('replaces a single placeholder', () => {
        const dict = { file: '/assets/sprite.png' };
        assert.strictEqual(applyMetadataToArgument('--input ${file}', dict), '--input /assets/sprite.png');
    });

    test('replaces multiple occurrences of the same placeholder', () => {
        const dict = { file: 'sprite.png' };
        assert.strictEqual(applyMetadataToArgument('${file} ${file}', dict), 'sprite.png sprite.png');
    });

    test('leaves unknown placeholders untouched', () => {
        const dict = { file: 'sprite.png' };
        assert.strictEqual(applyMetadataToArgument('${unknown}', dict), '${unknown}');
    });

    test('replaces multiple different placeholders', () => {
        const dict = { cellwidth: '16', cellheight: '32' };
        assert.strictEqual(applyMetadataToArgument('-w ${cellwidth} -h ${cellheight}', dict), '-w 16 -h 32');
    });
});

// ---------------------------------------------------------------------------
// Action model
// ---------------------------------------------------------------------------

suite('Action', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const actionFixture = {
        name: 'test-action',
        description: 'unit test',
        steps: [{ name: 'common', command: 'echo', args: ['hello'] }],
        byExtension: {
            '.png': { steps: [{ name: 'png-step', command: 'convert', args: ['${file}'] }] },
            default: { steps: [{ name: 'fallback', command: 'cp', args: ['${file}'] }] },
        },
    };

    test('fromFile loads and constructs Action', () => {
        const file = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(file, JSON.stringify(actionFixture));
        const action = Action.fromFile(file);
        assert.strictEqual(action.name, 'test-action');
        assert.strictEqual(action.steps.length, 1);
    });

    test('getStepsForFile returns common + extension-specific steps', () => {
        const file = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(file, JSON.stringify(actionFixture));
        const action = Action.fromFile(file);
        const steps = action.getStepsForFile('/assets/sprite.png');
        assert.strictEqual(steps.length, 2);
        assert.strictEqual(steps[0].name, 'common');
        assert.strictEqual(steps[1].name, 'png-step');
    });

    test('getStepsForFile falls back to default for unknown extension', () => {
        const file = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(file, JSON.stringify(actionFixture));
        const action = Action.fromFile(file);
        const steps = action.getStepsForFile('/assets/file.xyz');
        assert.strictEqual(steps.length, 2);
        assert.strictEqual(steps[1].name, 'fallback');
    });
});

// ---------------------------------------------------------------------------
// metaData — createMetadata / saveMetadata
// ---------------------------------------------------------------------------

suite('metaData.createMetadata', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('creates .metadata file when it does not exist', () => {
        const assetPath = path.join(tmpDir, 'sprite.png');
        fs.writeFileSync(assetPath, 'fake-png');
        createMetadata(assetPath);
        const metaPath = changeExtension(assetPath, '.metadata');
        assert.ok(fs.existsSync(metaPath), '.metadata file should exist');
        const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        assert.strictEqual(parsed.Path, assetPath);
        assert.strictEqual(parsed.Enabled, true);
    });

    test('does not overwrite existing .metadata file', () => {
        const assetPath = path.join(tmpDir, 'sprite.png');
        fs.writeFileSync(assetPath, 'fake-png');
        const metaPath = changeExtension(assetPath, '.metadata');
        const original = JSON.stringify({ existing: true });
        fs.writeFileSync(metaPath, original);

        createMetadata(assetPath);

        const content = fs.readFileSync(metaPath, 'utf-8');
        assert.deepStrictEqual(JSON.parse(content), { existing: true });
    });
});

suite('metaData.saveMetadata', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('writes metadata JSON to disk', () => {
        const metaPath = path.join(tmpDir, 'sprite.metadata');
        const md = makeMetadata();
        saveMetadata(md, metaPath);
        const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as IMetadata;
        assert.strictEqual(parsed.Name, 'sprite');
        assert.strictEqual(parsed.Width, 16);
    });
});

// ---------------------------------------------------------------------------
// Extension activation smoke test (requires VS Code host)
// ---------------------------------------------------------------------------

suite('Extension activation', () => {
    test('extension activates without error', async () => {
        const ext = vscode.extensions.getExtension('dot8.dot8assetmanager');
        if (ext) {
            await ext.activate();
            assert.ok(ext.isActive, 'extension should be active');
        } else {
            // Running outside extension host — skip gracefully
            assert.ok(true, 'skipped: extension not found in host');
        }
    });
});
