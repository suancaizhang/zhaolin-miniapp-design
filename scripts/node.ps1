$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '../.tools/node-v24.22.1-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    throw 'Project Node.js 24.22.1 runtime is missing. Restore the project runtime before continuing.'
}
& $runtime @args
exit $LASTEXITCODE
