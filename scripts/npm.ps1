$ErrorActionPreference = 'Stop'
$runtimeRoot = Join-Path $PSScriptRoot '../.tools/node-v24.22.1-win-x64'
$node = Join-Path $runtimeRoot 'node.exe'
$cli = Join-Path $runtimeRoot 'node_modules/npm/bin/npm-cli.js'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) {
    throw 'Project Node.js 24 runtime is missing; the global Node.js installation will not be used.'
}
$oldPath = $env:PATH
try {
    $env:PATH = "$runtimeRoot;$oldPath"
    & $node $cli @args
    $result = $LASTEXITCODE
} finally {
    $env:PATH = $oldPath
}
exit $result
