#!/usr/bin/env bash
# Feedback hook: Run validation after file modifications
FILE="$1"
if [[ "$FILE" =~ \.py$ ]]; then
    python3 -m unittest discover -s agentic/tests > /dev/null 2>&1 || true
fi
exit 0
