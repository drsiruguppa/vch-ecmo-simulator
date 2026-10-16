#!/bin/zsh
cd "$(dirname "$0")"

echo "=========================================================="
echo " Starting Pediatric & Neonatal ECMO Simulation Engine..."
echo "=========================================================="

# Check and kill any stale python or server processes holding port 8765-8769
for p in 8765 8766 8767 8768 8769; do
  pids=$(lsof -ti :$p 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Clearing occupied port $p (PID: $pids)..."
    kill -9 $pids 2>/dev/null
  fi
done

# Launch local simulation server
/usr/bin/python3 server.py
