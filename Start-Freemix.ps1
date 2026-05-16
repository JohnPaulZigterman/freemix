Set-Location -LiteralPath $PSScriptRoot
Write-Host "Starting Freemix VM-420 at http://localhost:4200"
Write-Host "Keep this PowerShell window open while using Freemix."
Start-Process "http://localhost:4200"
node .\server.js
