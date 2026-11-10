. (Join-Path $PSScriptRoot "..\_helpers.ps1")
Invoke-PbbSmoke -Method GET -Path "/api/reports?urgency=high&status=needs_review" -ExpectedStatus 200 | Out-Null
