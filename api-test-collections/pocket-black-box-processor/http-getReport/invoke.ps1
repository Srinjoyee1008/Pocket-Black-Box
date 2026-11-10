. (Join-Path $PSScriptRoot "..\_helpers.ps1")
$report = Get-PbbSampleJson (Join-Path $PSScriptRoot "..\http-createReport\sample-data.json")
Add-Member -InputObject $report -NotePropertyName id -NotePropertyValue ([guid]::NewGuid().ToString()) -Force
$created = Invoke-PbbSmoke -Method POST -Path "/api/reports" -ExpectedStatus 201 -JsonBody ($report | ConvertTo-Json -Depth 10 -Compress)
$createdBody = $created.Body | ConvertFrom-Json
$reportId = $createdBody.report.id
Invoke-PbbSmoke -Method GET -Path "/api/reports/$reportId" -ExpectedStatus 200 | Out-Null
Invoke-PbbSmoke -Method GET -Path "/api/reports/00000000-0000-0000-0000-000000000001" -ExpectedStatus 404 | Out-Null
