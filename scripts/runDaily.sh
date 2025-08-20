#!/usr/bin/env bash
set -euo pipefail

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use your Node version (adjust if different)
nvm use 20 >/dev/null

# Go to project folder
cd /Users/Thomas/Documents/buckys-menu

# Run the daily job and log output
npm run job:daily >> logs/daily.log 2>&1
