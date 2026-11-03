#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path // empty')
PROTECTED_PATTERNS=(".env" ".secret.local" "package-lock.json" ".git/")
for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done
exit 0
