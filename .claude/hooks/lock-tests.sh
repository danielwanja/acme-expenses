#!/bin/bash
# .claude/hooks/lock-tests.sh  (chmod +x)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
LOCKS="$CLAUDE_PROJECT_DIR/.claude/locked-tests.txt"
[[ -z "$FILE_PATH" || ! -f "$LOCKS" ]] && exit 0
while IFS= read -r pattern; do
  [[ -z "$pattern" ]] && continue
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH is a locked test. Change the code," >&2
    echo "not the test. If the test is wrong, stop and say why." >&2
    exit 2
  fi
done < "$LOCKS"
exit 0
