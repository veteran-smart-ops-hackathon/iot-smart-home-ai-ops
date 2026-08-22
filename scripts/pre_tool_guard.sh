#!/usr/bin/env bash
# Guard hook: Prevent destructive commands
COMMAND="$1"
if [[ "$COMMAND" =~ "rm -rf /" ]] || [[ "$COMMAND" =~ "drop database" ]]; then
    echo "DENY: Destructive operation intercepted."
    exit 1
fi
exit 0
