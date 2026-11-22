# Build and publish Dot8 Asset Manager

This guide explains how to compile, test, package, and publish the extension to the Visual Studio Marketplace.

## Prerequisites

- Node.js 20 or newer
- npm
- VS Code
- Access to the `bapa` publisher in the [Visual Studio Marketplace publisher portal](https://marketplace.visualstudio.com/manage/publishers/)

The extension identity comes from `package.json`:

```text
bapa.dot8assetmanager
```

Run all commands from the repository root.

## Install dependencies

For a clean, reproducible installation, use the committed lockfile:

```powershell
npm ci
```

Use `npm install` instead when intentionally changing dependencies.

## Compile and validate

Compile TypeScript into the `out` directory:

```powershell
npm run compile
```

Run the complete release validation:

```powershell
npm run lint
npm test
```

`npm test` compiles and lints the project before launching the VS Code integration tests.

For development, start the TypeScript compiler in watch mode and press `F5` in VS Code to open an Extension Development Host:

```powershell
npm run watch
```

## Prepare a release

1. Confirm the working tree contains only the intended release changes:

   ```powershell
   git status --short
   ```

2. Add the release notes to `CHANGELOG.md`.

3. Increment the version in both `package.json` and `package-lock.json`. This command updates both files without creating a Git commit or tag:

   ```powershell
   npm version patch --no-git-tag-version
   ```

   Use `minor` or `major` instead of `patch` when appropriate. Marketplace version numbers cannot be reused after publication.

4. Run the validation commands again:

   ```powershell
   npm run compile
   npm run lint
   npm test
   ```

## Build and inspect the VSIX package

The project includes `@vscode/vsce`, so no global installation is required. Inspect the files that will be packaged:

```powershell
npx vsce ls
```

Create a package with a stable local filename:

```powershell
npx vsce package --out dot8assetmanager.vsix
```

Packaging automatically runs the `vscode:prepublish` script, which compiles the extension.

Install the package locally for a final smoke test:

```powershell
code --install-extension .\dot8assetmanager.vsix --force
```

Restart VS Code, verify the extension version, and exercise the commands before publishing.

## Publish manually through the Marketplace portal

Manual upload is the simplest credential-free command-line workflow:

1. Build and test `dot8assetmanager.vsix` as described above.
2. Open the [publisher portal](https://marketplace.visualstudio.com/manage/publishers/).
3. Select the `bapa` publisher and the existing `dot8assetmanager` extension.
4. Upload `dot8assetmanager.vsix` as the new version.
5. Wait for Marketplace validation, then confirm the new version appears on the extension page and in VS Code.

Never commit access tokens, credentials, or environment files to the repository or include them in the VSIX package.

## Recommended automated publishing with GitHub Actions

Microsoft recommends Marketplace Trusted Publishing with OpenID Connect instead of storing a Personal Access Token.

First, create a Trusted Publishing policy:

1. Open the [publisher portal](https://marketplace.visualstudio.com/manage/publishers/) and select `bapa`.
2. Open **Trusted Publishing** and create a policy.
3. Set the repository owner to `cardosojoao`.
4. Set the repository to `dot8assetmanager`.
5. Set the workflow filename to the filename created under `.github/workflows`, such as `publish.yml`.
6. If the workflow uses a GitHub environment, enter its exact name; otherwise leave the environment empty.

Example `.github/workflows/publish.yml`:

```yaml
name: Publish VS Code extension

on:
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: xvfb-run -a npm test
      - run: npm install --global @vscode/vsce
      - run: vsce publish --oidc
```

Before running the workflow, commit and push the updated version and changelog. Trigger the workflow manually from the GitHub Actions page. The version in `package.json` must not already exist in the Marketplace.

For a private repository, run the workflow within 48 hours of creating the Trusted Publishing policy so the first successful token exchange activates it.

## Legacy PAT publishing

Publishing with `vsce login bapa` and `vsce publish` uses a Personal Access Token. Microsoft has announced the retirement of global Azure DevOps PATs on December 1, 2026, so do not build new release automation around PAT credentials. Prefer Trusted Publishing or manual VSIX upload.

## Release checklist

- `CHANGELOG.md` describes the release.
- `package.json` and `package-lock.json` contain the same new version.
- `npm run compile`, `npm run lint`, and `npm test` succeed.
- `npx vsce ls` contains only expected runtime and documentation files.
- The generated VSIX installs and works locally.
- No credentials or local environment files are packaged.
- The release version has not previously been published.

See the official [VS Code extension publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for current Marketplace requirements.
