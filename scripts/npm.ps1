$ErrorActionPreference = 'Stop'
$runtimeRoot = Join-Path $PSScriptRoot '../.tools/node-v24.22.1-win-x64'
$node = Join-Path $runtimeRoot 'node.exe'
$cli = Join-Path $runtimeRoot 'node_modules/npm/bin/npm-cli.js'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) {
    throw '找不到本项目独立Node24；不会改用全局Node。'
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
