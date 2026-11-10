. (Join-Path $PSScriptRoot "..\_helpers.ps1")
$report = Get-PbbSampleJson (Join-Path $PSScriptRoot "..\http-createReport\sample-data.json")
Add-Member -InputObject $report -NotePropertyName id -NotePropertyValue ([guid]::NewGuid().ToString()) -Force
$created = Invoke-PbbSmoke -Method POST -Path "/api/reports" -ExpectedStatus 201 -JsonBody ($report | ConvertTo-Json -Depth 10 -Compress)
$reportId = ($created.Body | ConvertFrom-Json).report.id
$update = Get-PbbSampleJson (Join-Path $PSScriptRoot "sample-data.json") | ConvertTo-Json -Depth 10 -Compress
$updated = Invoke-PbbSmoke -Method PATCH -Path "/api/reports/$reportId" -ExpectedStatus 200 -JsonBody $update
$updatedBody = $updated.Body | ConvertFrom-Json
if ($updatedBody.report.status -ne "assigned") {
    throw "PATCH response did not contain the expected assigned status."
}
