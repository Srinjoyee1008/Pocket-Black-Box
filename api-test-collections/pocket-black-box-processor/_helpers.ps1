$ErrorActionPreference = "Stop"

function Invoke-PbbSmoke {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PATCH")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$ExpectedStatus,
        [string]$JsonBody,
        [string]$AudioFile
    )

    $baseUrl = if ($env:PBB_API_BASE_URL) { $env:PBB_API_BASE_URL.TrimEnd("/") } else { "http://127.0.0.1:8765" }
    $curlArgs = @("--silent", "--show-error", "--write-out", "`n__STATUS__:%{http_code}", "-X", $Method)
    $tempBodyPath = $null
    if ($JsonBody) {
        $tempBodyPath = Join-Path ([System.IO.Path]::GetTempPath()) ("pbb-smoke-" + [guid]::NewGuid().ToString() + ".json")
        [System.IO.File]::WriteAllText($tempBodyPath, $JsonBody, (New-Object System.Text.UTF8Encoding -ArgumentList $false))
        $curlArgs += @("--header", "Content-Type: application/json", "--data-binary", "@$tempBodyPath")
    }
    if ($AudioFile) {
        $curlArgs += @("--form", "audio=@$AudioFile;type=audio/wav")
    }
    $curlArgs += "$baseUrl$Path"
    try {
        $raw = & curl.exe @curlArgs
        $curlExitCode = $LASTEXITCODE
    } finally {
        if ($tempBodyPath -and (Test-Path -LiteralPath $tempBodyPath)) {
            Remove-Item -LiteralPath $tempBodyPath -Force
        }
    }
    if ($curlExitCode -ne 0) {
        throw "curl.exe failed with exit code $curlExitCode for $Method $Path"
    }

    $response = $raw -join "`n"
    $statusMatch = [regex]::Match($response, "(?:`r?`n)?__STATUS__:(\d{3})$")
    if (-not $statusMatch.Success) {
        throw "Could not read the HTTP status from curl.exe output for $Method $Path"
    }
    $statusCode = [int]$statusMatch.Groups[1].Value
    $body = $response.Substring(0, $statusMatch.Index)
    if ($statusCode -ne $ExpectedStatus) {
        throw "$Method $Path expected HTTP $ExpectedStatus but received HTTP $statusCode. Body: $body"
    }
    Write-Host "$Method $Path -> HTTP $statusCode"
    if ($body) {
        Write-Host (($body -replace "\s+", " ").Trim())
    }
    return [pscustomobject]@{ StatusCode = $statusCode; Body = $body }
}

function Get-PbbSampleJson {
    param([Parameter(Mandatory = $true)][string]$FileName)
    return (Get-Content -LiteralPath $FileName -Raw | ConvertFrom-Json)
}
