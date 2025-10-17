param(
    [string]$EnvFile = ".env"
)

if (-not (Test-Path $EnvFile)) {
    Write-Error "Environment file '$EnvFile' was not found. Create it from .env.example before running this script."
    exit 1
}

$envLines = Get-Content $EnvFile | Where-Object { $_ -and ($_ -notmatch '^\s*#') }

if (-not $envLines) {
    Write-Warning "No environment variable definitions were found in '$EnvFile'."
    exit 0
}

foreach ($line in $envLines) {
    if ($line -match '^\s*([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $rawValue = $matches[2].Trim()
        # Remove surrounding quotes if present
        if ($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
            $value = $rawValue.Substring(1, $rawValue.Length - 2)
        } else {
            $value = $rawValue
        }

        if (-not $name) {
            continue
        }

        try {
            setx $name $value | Out-Null
            $env:$name = $value
            Write-Host "Set $name"
        }
        catch {
            Write-Error "Failed to set environment variable '$name': $_"
        }
    }
}

Write-Host "Environment variables from '$EnvFile' have been applied." -ForegroundColor Green
Write-Host "Restart any open terminals or IDEs to ensure they pick up the new values."
