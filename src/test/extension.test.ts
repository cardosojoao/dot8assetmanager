import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

import {
    changeExtension,
    findFileUpward,
    mapMetadataToDictionary,
    applyMetadataToArgument,
    appendExtension,
    getMetadataFilePath,
    fileExists,
    isLikelyFileName,
    isTrulyAbsolutePath,
    resolvePathFromFileDirectory,
    getPatternDimensions,
    executeFile,
} from '../utils/utils';
import { Action } from '../models/action';
import { IMetadata } from '../models/IMetadata';
import { createMetadata, saveMetadata, updateMetadataType, getMetadata, getMetadataGeneric } from '../services/metadata';
import { TimerManager } from '../services/timer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'dot8test-'));
}

function writeTinyPng(filePath: string): void {
    // 1x1 transparent PNG
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    fs.writeFileSync(filePath, Buffer.from(tinyPngBase64, 'base64'));
}

function makeMetadata(overrides: Partial<IMetadata> = {}): IMetadata {
    return {
        GeneratedBy: 'test',
        Enable: true,
        Name: 'sprite',
        Path: '/assets/sub/sprite.png',
        Modified: '2026-01-01T00:00:00.000Z',
        CellHeight: 16,
        CellWidth : 16,
        Width: 64,
        Height: 48,
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
        const md = makeMetadata({ Path: '/assets/sprite.png' });
        mapMetadataToDictionary(dict, md);
        assert.strictEqual(dict['directory'], path.dirname('/assets/sprite.png'));
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

suite('utils.misc', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('appendExtension appends with dot separator', () => {
        assert.strictEqual(appendExtension('/assets/sprite.png', 'metadata'), '/assets/sprite.png.metadata');
    });

    test('getMetadataFilePath resolves sidecar path', () => {
        assert.strictEqual(getMetadataFilePath('/assets/sprite.png'), '/assets/sprite.png.metadata');
    });

    test('isLikelyFileName returns true only for bare file names', () => {
        assert.strictEqual(isLikelyFileName('config.json'), true);
        assert.strictEqual(isLikelyFileName('folder/config.json'), false);
    });

    test('isTrulyAbsolutePath handles windows single-leading-slash metadata paths', () => {
        if (process.platform === 'win32') {
            assert.strictEqual(isTrulyAbsolutePath('/sprites/sw.json'), false);
            assert.strictEqual(isTrulyAbsolutePath('\\\\server\\share\\sw.json'), true);
            assert.strictEqual(isTrulyAbsolutePath('C:\\sprites\\sw.json'), true);
            return;
        }

        assert.strictEqual(isTrulyAbsolutePath('/sprites/sw.json'), true);
    });

    test('resolvePathFromFileDirectory resolves partial metadata paths from trigger file folder', () => {
        const trigger = path.join(tmpDir, 'assets', 'sheet.png');
        const expectedFromRelative = path.join(tmpDir, 'assets', 'meta', 'sw.json');

        assert.strictEqual(
            resolvePathFromFileDirectory(trigger, 'meta/sw.json'),
            expectedFromRelative
        );

        if (process.platform === 'win32') {
            assert.strictEqual(
                resolvePathFromFileDirectory(trigger, '/meta/sw.json'),
                expectedFromRelative
            );
        }
    });

    test('fileExists returns true for existing file and false otherwise', async () => {
        const existing = path.join(tmpDir, 'exists.txt');
        fs.writeFileSync(existing, 'ok');
        assert.strictEqual(await fileExists(existing), true);
        assert.strictEqual(await fileExists(path.join(tmpDir, 'missing.txt')), false);
    });

    test('getPatternDimensions returns width and height for valid PNG', () => {
        const pngPath = path.join(tmpDir, 'tiny.png');
        writeTinyPng(pngPath);
        const [width, height] = getPatternDimensions(pngPath);
        assert.strictEqual(width, 1);
        assert.strictEqual(height, 1);
    });

    test('getPatternDimensions throws for non-PNG file', () => {
        const txtPath = path.join(tmpDir, 'not-png.png');
        fs.writeFileSync(txtPath, 'not-a-png');
        assert.throws(() => getPatternDimensions(txtPath), /Not a PNG file/);
    });

    test('executeFile returns true when command succeeds', () => {
        const nodeExe = `"${process.execPath}"`;
        const ok = executeFile(nodeExe, '-e "process.exit(0)"', tmpDir);
        assert.strictEqual(ok, true);
    });

    test('executeFile returns false when command fails', () => {
        const nodeExe = `"${process.execPath}"`;
        const ok = executeFile(nodeExe, '-e "process.exit(2)"', tmpDir);
        assert.strictEqual(ok, false);
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
        enable: true,
        description: 'unit test',
        steps: [{ name: 'common', command: 'echo', args: ['hello'] }],
        extensionOrder: ['png'],
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
        assert.strictEqual(action.enable, true);
        assert.strictEqual(action.steps.length, 1);
    });

    test('fromFile preserves disabled action state', () => {
        const file = path.join(tmpDir, 'action.metadata');
        fs.writeFileSync(file, JSON.stringify({ ...actionFixture, enable: false }));
        const action = Action.fromFile(file);
        assert.strictEqual(action.enable, false);
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
        writeTinyPng(assetPath);
        createMetadata(assetPath);
        const metaPath = getMetadataFilePath(assetPath);
        assert.ok(fs.existsSync(metaPath), '.metadata file should exist');
        const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        assert.strictEqual(parsed.Path, assetPath);
        assert.strictEqual(parsed.Enable, true);
    });

    test('does not overwrite existing .metadata file', () => {
        const assetPath = path.join(tmpDir, 'sprite.png');
        writeTinyPng(assetPath);
        const metaPath = getMetadataFilePath(assetPath);
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

suite('metaData.updateMetadataType', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('updates generic file types with path and generator', () => {
        const filePath = path.join(tmpDir, 'sound.afb');
        fs.writeFileSync(filePath, 'dummy');
        const updated = updateMetadataType(makeMetadata({ Path: filePath }), filePath);
        assert.strictEqual(updated.Path, filePath);
        assert.ok((updated.GeneratedBy ?? '').startsWith('Dot8-MetadataUpdate-'));
    });

    test('updates png metadata dimensions when missing', () => {
        const filePath = path.join(tmpDir, 'sprite.png');
        writeTinyPng(filePath);
        const updated = updateMetadataType(makeMetadata({ Path: filePath, Width: undefined, Height: undefined }), filePath);
        assert.strictEqual(updated.Width, 1);
        assert.strictEqual(updated.Height, 1);
        assert.strictEqual(updated.Path, filePath);
    });

    test('keeps existing png metadata dimensions when already present', () => {
        const filePath = path.join(tmpDir, 'sprite.png');
        writeTinyPng(filePath);
        const updated = updateMetadataType(makeMetadata({ Path: filePath, Width: 32, Height: 48 }), filePath);
        assert.strictEqual(updated.Width, 32);
        assert.strictEqual(updated.Height, 48);
    });

    test('updates tsx metadata from tileset content', () => {
        const tilesetPath = path.join(tmpDir, 'tiles.tsx');
        const tilesetXml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<tileset tilewidth="16" tileheight="16" tilecount="16" columns="4">',
            '  <image source="tiles.png" width="64" height="64"/>',
            '</tileset>'
        ].join('\n');
        fs.writeFileSync(tilesetPath, tilesetXml, 'utf-8');

        const updated = updateMetadataType(makeMetadata({ Path: tilesetPath, Width: undefined, Height: undefined, Columns: undefined, Rows: undefined }), tilesetPath);
        assert.strictEqual(updated.Width, 16);
        assert.strictEqual(updated.Height, 16);
        assert.strictEqual(updated.Columns, 4);
        assert.strictEqual(updated.Rows, 4);
        assert.strictEqual(updated.Path, tilesetPath);
    });
});

suite('metaData.getMetadata readers', () => {
    let tmpDir: string;

    setup(() => {
        tmpDir = makeTempDir();
    });

    teardown(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('getMetadata parses sidecar metadata JSON', async () => {
        const assetPath = path.join(tmpDir, 'asset.png');
        const metadataPath = appendExtension(assetPath, 'metadata');
        const payload = makeMetadata({ Path: assetPath, Name: 'asset' });
        fs.writeFileSync(metadataPath, JSON.stringify(payload), 'utf-8');

        const parsed = await getMetadata(assetPath);
        assert.strictEqual(parsed.Path, assetPath);
        assert.strictEqual(parsed.Name, 'asset');
    });

    test('getMetadataGeneric parses generic key-value JSON', async () => {
        const genericPath = path.join(tmpDir, 'vars.json');
        fs.writeFileSync(genericPath, JSON.stringify({ quality: 'high', retries: 2 }), 'utf-8');
        const parsed = await getMetadataGeneric(genericPath);
        assert.strictEqual(parsed.quality, 'high');
        assert.strictEqual(String(parsed.retries), '2');
    });
});

suite('TimerManager', () => {
    test('returns -1 when ending non-started timer', () => {
        const timer = new TimerManager();
        assert.strictEqual(timer.end('missing'), -1);
    });

    test('returns duration and clears timer after end', () => {
        const timer = new TimerManager();
        timer.start('job');
        const duration = timer.end('job');
        assert.ok(duration >= 0);
        assert.strictEqual(timer.end('job'), -1);
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
