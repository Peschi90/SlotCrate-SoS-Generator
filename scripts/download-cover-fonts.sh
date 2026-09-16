#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
font_dir="$repo_root/services/cad-api/fonts"
mkdir -p "$font_dir"

families=(
  robotocondensed barlowcondensed oswald rajdhani chakrapetch sairacondensed
  archivoblack bebasneue anton russoone teko blackopsone audiowide orbitron
  michroma exo2 righteous
)

for family in "${families[@]}"; do
  api_url="https://api.github.com/repos/google/fonts/contents/ofl/$family"
  files=$(curl --fail --silent --show-error -H 'User-Agent: SlotCrate-font-downloader' "$api_url")
  urls=$(printf '%s' "$files" | jq -r '.[] | select(.type == "file" and (.name | endswith(".ttf"))) | .download_url')
  static_url=$(printf '%s' "$files" | jq -r '.[] | select(.type == "dir" and .name == "static") | .url // empty')
  if [[ -n "$static_url" ]]; then
    static_files=$(curl --fail --silent --show-error -H 'User-Agent: SlotCrate-font-downloader' "$static_url")
    urls+=$'\n'$(printf '%s' "$static_files" | jq -r '.[] | select(.type == "file" and (.name | endswith(".ttf"))) | .download_url')
  fi
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    file_name="${url##*/}"
    echo "Downloading $file_name"
    curl --fail --silent --show-error --location "$url" --output "$font_dir/$file_name"
  done <<< "$(printf '%s\n' "$urls" | sort -u)"
done

echo "Downloaded fonts to $font_dir"
echo "Arial is excluded because Microsoft Arial requires a separately licensed font file."