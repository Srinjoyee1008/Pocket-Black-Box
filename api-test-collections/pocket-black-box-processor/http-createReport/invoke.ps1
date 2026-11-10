. (Join-Path $PSScriptRoot "..\_helpers.ps1")
$report = Get-PbbSampleJson (Join-Path $PSScriptRoot "sample-data.json")
Add-Member -InputObject $report -NotePropertyName id -NotePropertyValue ([guid]::NewGuid().ToString()) -Force
$body = $report | ConvertTo-Json -Depth 10 -Compress
Invoke-PbbSmoke -Method POST -Path "/api/reports" -ExpectedStatus 201 -JsonBody $body | Out-Null
$invalidBody = Get-PbbSampleJson (Join-Path $PSScriptRoot "invalid-request.json") | ConvertTo-Json -Depth 10 -Compress
$invalidResponse = Invoke-PbbSmoke -Method POST -Path "/api/reports" -ExpectedStatus 422 -JsonBody $invalidBody
if (($invalidResponse.Body | ConvertFrom-Json).error.code -ne "VALIDATION_ERROR") {
    throw "Invalid request did not return the structured VALIDATION_ERROR response."
}
