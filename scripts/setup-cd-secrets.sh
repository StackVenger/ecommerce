#!/usr/bin/env bash
# Configure the 3 GitHub secrets the .github/workflows/deploy.yml needs.
# Run after `gh auth login`. Idempotent — safe to re-run.
#
# Usage:
#   bash scripts/setup-cd-secrets.sh [VPS_HOST] [VPS_USER] [SSH_KEY_PATH]
#
# Defaults are the values used for the current 103.187.23.21 deploy.

set -euo pipefail

VPS_HOST="${1:-103.187.23.21}"
VPS_USER="${2:-root}"
SSH_KEY="${3:-$HOME/.ssh/ecommerce_deploy}"

if ! command -v gh >/dev/null; then
  echo "[err] gh CLI not on PATH. Install it or export PATH=\$HOME/.local/bin:\$PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[err] gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "[err] SSH key not found at $SSH_KEY" >&2
  exit 1
fi

echo "Setting GitHub secrets for $(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "  VPS_HOST=$VPS_HOST"
echo "  VPS_USER=$VPS_USER"
echo "  VPS_SSH_KEY=<contents of $SSH_KEY>"
echo

gh secret set VPS_HOST    -b "$VPS_HOST"
gh secret set VPS_USER    -b "$VPS_USER"
gh secret set VPS_SSH_KEY < "$SSH_KEY"

echo
echo "Verifying:"
gh secret list | grep -E "VPS_HOST|VPS_USER|VPS_SSH_KEY"
echo
echo "Done. Next push to main will trigger .github/workflows/deploy.yml."
echo "Trigger now (without pushing) with: gh workflow run 'Deploy to VPS'"
