. (Join-Path $PSScriptRoot "..\_helpers.ps1")
Invoke-PbbSmoke -Method GET -Path "/api/health" -ExpectedStatus 200 | Out-Null
