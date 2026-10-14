#!/usr/bin/env bash
# Starts the production server in the background; log: /tmp/shetach.log
cd "$(dirname "$0")/.."
if ! curl -s -o /dev/null http://localhost:3000/register; then
  [ -d .next ] || npm run build
  nohup npx next start -p 3000 > /tmp/shetach.log 2>&1 &
fi
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/register && { echo "Shetach is running on port 3000"; exit 0; }; sleep 1; done
echo "Shetach did not start — see /tmp/shetach.log"
