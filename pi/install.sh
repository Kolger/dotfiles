#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
agent_dir=${PI_CODING_AGENT_DIR:-"$HOME/.pi/agent"}
for cmd in pi node npm; do
  command -v "$cmd" >/dev/null || fail "Missing command: $cmd. Install Pi, Node.js, and npm."
done
mkdir -p -- "$agent_dir"
agent_dir=$(cd -- "$agent_dir" && pwd -P)
case "$agent_dir/" in
  "$repo_dir/"*) fail "Choose a profile outside the repository. Pi may store credentials and sessions in it." ;;
esac
export PI_CODING_AGENT_DIR="$agent_dir"

settings="$agent_dir/settings.json"
cc_config="$agent_dir/pi-cc-extensions.json"
cc_preset="$repo_dir/pi/pi-cc-extensions.json"
preset="$repo_dir/pi/preset.json"

[[ ! -L "$settings" ]] || fail "settings.json is a symlink. Use a local copy for the full profile."
[[ ! -e "$settings" || -f "$settings" ]] || fail "settings.json must be a regular file."
[[ ! -e "$cc_config" || -f "$cc_config" ]] || fail "pi-cc-extensions.json must be a regular file or a symlink to one."
if [[ -f "$agent_dir/packages/pewget-todo/package.json" ]]; then
  fail "This profile already has a local pewget-todo. Remove the duplicate or use a separate PI_CODING_AGENT_DIR."
fi
for name in pewget-footer pewget-recap pewget-stash; do
  if [[ -e "$agent_dir/extensions/$name.ts" ]]; then
    fail "This profile already has a local $name. Remove the duplicate or use a separate PI_CODING_AGENT_DIR."
  fi
done

packages=$(node --input-type=commonjs - "$settings" "$preset" <<'JS'
const { existsSync, readFileSync } = require('node:fs');
const [settingsPath, presetPath] = process.argv.slice(2);
if (existsSync(settingsPath)) {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('settings.json must contain a JSON object');
  }
}
const { packages } = JSON.parse(readFileSync(presetPath, 'utf8'));
console.log(packages.join('\n'));
JS
)

if [[ -f "$settings" || -e "$cc_config" || -L "$cc_config" ]]; then
  backup_root="$(dirname -- "$agent_dir")/pewget-pi-backups"
  mkdir -p -- "$backup_root"
  backup_dir=$(mktemp -d "$backup_root/$(date +%Y%m%d-%H%M%S).XXXXXX")
  if [[ -f "$settings" ]]; then cp -- "$settings" "$backup_dir/"; fi
  if [[ -e "$cc_config" || -L "$cc_config" ]]; then cp -P -- "$cc_config" "$backup_dir/"; fi
  printf 'Configuration backup: %s\n' "$backup_dir"
fi

cd -- "$repo_dir"
npm ci --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund
pi install "$repo_dir" --no-approve
while IFS= read -r source; do
  [[ -z "$source" ]] || pi install "$source" --no-approve
done <<< "$packages"

next_settings=$(mktemp "$agent_dir/.settings.XXXXXX")
trap 'rm -f -- "$next_settings"' EXIT
node --input-type=commonjs - "$settings" "$preset" > "$next_settings" <<'JS'
const { readFileSync } = require('node:fs');
const [settingsPath, presetPath] = process.argv.slice(2);
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
const { appearance } = JSON.parse(readFileSync(presetPath, 'utf8'));
console.log(JSON.stringify({ ...settings, ...appearance }, null, 2));
JS
mv -f -- "$next_settings" "$settings"
ln -sfn -- "$cc_preset" "$cc_config"
printf 'Pewget Pi installed. Run pi to start, and set OPENCODE_API_KEY to use /recap.\n'
