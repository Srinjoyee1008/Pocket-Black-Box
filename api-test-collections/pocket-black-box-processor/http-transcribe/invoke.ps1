. (Join-Path $PSScriptRoot "..\_helpers.ps1")
$audioPath = Join-Path $PSScriptRoot "sample-audio.wav"
Invoke-PbbSmoke -Method POST -Path "/api/transcribe" -ExpectedStatus 503 -AudioFile $audioPath | Out-Null
