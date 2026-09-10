# `npm run cucumber:level2:report` — failure analysis

Environment: Windows, cmd.exe as npm script shell, Node v22.18.0.

## Symptom

```text
> HEADED=1 cucumber-js --profile level2 && open tta-report/index.html

'HEADED' is not recognized as an internal or external command,
operable program or batch file.
```

## Cause 1 — POSIX env-var prefix does not work in cmd.exe

The scripts in `package.json` use the `VAR=value command` syntax:

```json
"cucumber:level0": "HEADED=1 cucumber-js --profile level0",
"cucumber:level1": "HEADED=1 cucumber-js --profile level1",
"cucumber:level2": "HEADED=1 cucumber-js --profile level2",
"cucumber:level2:report": "HEADED=1 cucumber-js --profile level2 && open tta-report/index.html",
"cucumber:headed": "HEADED=1 cucumber-js",
```

That syntax is POSIX shell (bash/zsh/sh). npm on Windows runs scripts through
`cmd.exe` (`npm config get script-shell` is unset), and cmd.exe has no such
construct — it treats `HEADED` as the program name to execute. Hence the error.
The scripts are correct for macOS/Linux, but not for Windows.

Verified: running the same prefix under Git Bash
(`C:\Program Files\Git\bin\bash.exe`) works, i.e. the prefix itself is fine —
only the shell differs.

## Cause 2 — ts-node crashes on the auto-installed TypeScript 7

Fixing Cause 1 alone is not enough. With `HEADED` set correctly (the Windows
way: `set "HEADED=1" && npx cucumber-js --profile level2`), cucumber-js still
fails to start:

```text
TypeError: Cannot read properties of undefined (reading 'fileExists')
    at readConfig (node_modules/ts-node/dist/configuration.js:91:33)
    at findAndReadConfig (node_modules/ts-node/dist/configuration.js:50:84)
    at create (node_modules/ts-node/dist/index.js:146:69)
    ...
    at Object.<anonymous> (node_modules/ts-node/register/index.js:1:16)
```

`typescript` is not declared in `package.json`, so npm resolves ts-node's peer
dependency (`"typescript": ">=2.7"`) to the newest published version: **7.0.2**.
That is Microsoft's new native compiler: `require("typescript")` resolves to
`lib/version.cjs` and exports only a version string — `ts.sys` is `undefined`.
ts-node 10.9.2 reads `ts.sys.fileExists` and blows up at load time.

```console
$ node -p "typeof require('typescript').sys"
undefined
```

`cucumber.js` wires the runtime via
`requireModule: ["ts-node/register", "tsconfig-paths/register"]`, and
`src/cucumber/support/ttaFormatter.cjs` also calls `require("ts-node/register")`,
so both paths hit the same crash.

## Cause 3 — `tsconfig.json` targets TypeScript 6, not 7 or 5

The config carries `ignoreDeprecations: "6.0"`, still uses `baseUrl`, and pairs
`moduleResolution: "bundler"` with `module: "commonjs"` — a combination only
valid on certain versions. Compiler behaviour per version:

| typescript | `tsc --noEmit` result |
| --- | --- |
| 7.0.2 (auto-installed) | `TS5102: Option 'baseUrl' has been removed` + 6× `TS5090: Non-relative paths are not allowed` |
| 6.0.3 | clean |
| 5.9.3 | `TS5095` (`bundler` needs `module: preserve`/`es2015`+) + `TS5103: Invalid value for '--ignoreDeprecations'` |

So the project is written for TypeScript 6. Verified in a scratch directory
(no project files touched):

```console
$ TS_NODE_COMPILER=<scratch>/typescript-6.0.3 HEADED=1 npx cucumber-js --profile level2 --dry-run
2 hooks (2 skipped)
9 scenarios (9 skipped)
49 steps (49 skipped)
0m 0.70s

$ tsc@6.0.3 --noEmit -p tsconfig.json
(no output)
```

## Cause 4 — `open` is macOS-only

`open tta-report/index.html` (and `open reports/cucumber/report.html` in
`test:bdd:report`, `test:bdd:tta`) exists on macOS only. On Windows there is no
`open` executable, so that half of the `&&` chain fails too.

## Fixes

Minimum change to get it running on this machine:

1. Declare the compiler: add `"typescript": "^6.0.3"` to `devDependencies`
   (restores `ts.sys`, makes ts-node work, and makes `tsc --noEmit` pass).
2. Run the cucumber scripts from Git Bash, where the `HEADED=1` prefix is valid.

To make `npm run cucumber:level2:report` work natively from cmd/PowerShell:

1. Add `typescript@^6.0.3` as above.
2. Add `cross-env` and change the scripts to
   `cross-env HEADED=1 cucumber-js --profile ...`.
3. Replace `open` with a cross-platform opener (e.g. `open-cli`).

Note: `test:bdd:report` and `test:bdd:tta` need step 3 regardless, since they
call `open` unconditionally.

## Reproduce

```bat
:: Cause 1
npm run cucumber:level2:report

:: Cause 2 (env var set the Windows way, old shell syntax bypassed)
set "HEADED=1" && npx cucumber-js --profile level2 --dry-run

:: Cause 3
npx tsc --noEmit
```
