$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '../.tools/node-v24.22.1-win-x64/node.exe'
if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    throw '找不到本项目的独立 Node.js 24.22.1。请先完成运行环境准备；不会改用全局 Node。'
}
& $runtime @args
exit $LASTEXITCODE
