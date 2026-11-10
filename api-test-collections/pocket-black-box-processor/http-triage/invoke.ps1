. (Join-Path $PSScriptRoot "..\_helpers.ps1")
$body = Get-PbbSampleJson (Join-Path $PSScriptRoot "sample-data.json") | ConvertTo-Json -Depth 10 -Compress
$response = Invoke-PbbSmoke -Method POST -Path "/api/triage" -ExpectedStatus 200 -JsonBody $body
$result = $response.Body | ConvertFrom-Json
if (-not $result.suggestions -or -not $result.modelStatus) {
    throw "Triage response is missing suggestions or modelStatus."
}
