$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$fontDir = Join-Path $repoRoot "services\cad-api\fonts"
$families = @(
    "robotocondensed", "barlowcondensed", "oswald", "rajdhani",
    "chakrapetch", "sairacondensed", "archivoblack", "bebasneue",
    "anton", "russoone", "teko", "blackopsone", "audiowide",
    "orbitron", "michroma", "exo2", "righteous"
)

New-Item -ItemType Directory -Force $fontDir | Out-Null
$headers = @{ "User-Agent" = "SlotCrate-font-downloader" }

foreach ($family in $families) {
    $apiUrl = "https://api.github.com/repos/google/fonts/contents/ofl/$family"
    $items = Invoke-RestMethod -Uri $apiUrl -Headers $headers
    $files = @($items | Where-Object { $_.type -eq "file" -and $_.name -match "\.ttf$" })
    $static = $items | Where-Object { $_.type -eq "dir" -and $_.name -eq "static" }
    if ($static) {
        $staticItems = Invoke-RestMethod -Uri $static.url -Headers $headers
        $files += @($staticItems | Where-Object { $_.type -eq "file" -and $_.name -match "\.ttf$" })
    }

    foreach ($file in ($files | Sort-Object name -Unique)) {
        $target = Join-Path $fontDir $file.name
        Write-Host "Downloading $($file.name)"
        Invoke-WebRequest -Uri $file.download_url -Headers $headers -OutFile $target
    }
}

Write-Host "Downloaded fonts to $fontDir"
Write-Host "Arial is excluded because Microsoft Arial requires a separately licensed font file."