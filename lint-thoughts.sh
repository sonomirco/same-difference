#!/usr/bin/env bash
# lint-thoughts.sh — validates all Thought notes against format standards
# Run from any directory: bash /path/to/Thoughts/lint-thoughts.sh

set -euo pipefail

THOUGHTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0
ERRORS=()

check_file() {
  local file="$1"
  local name
  name="$(basename "$file")"
  local file_errors=()

  # Skip agent docs and the lint script itself
  [[ "$name" == "AGENTS.md" || "$name" == "CLAUDE.md" || "$name" == "lint-thoughts.sh" ]] && return

  # 1. Has YAML frontmatter (first line is ---)
  if ! head -1 "$file" | rg -q "^---$"; then
    file_errors+=("missing YAML frontmatter")
  else
    # 2. Has groups: field
    if ! rg -q "^groups:" "$file"; then
      file_errors+=("missing 'groups:' field in frontmatter")
    fi
    # 3. Has tags: field
    if ! rg -q "^tags:" "$file"; then
      file_errors+=("missing 'tags:' field in frontmatter")
    fi
    # 4. Has date: field
    if ! rg -q "^date:" "$file"; then
      file_errors+=("missing 'date:' field in frontmatter")
    fi
  fi

  # 5. No ## section headers in body (after frontmatter)
  # Skip the first --- block (frontmatter), check rest of file
  local body
  body="$(awk '/^---$/{count++; if(count==2){found=1; next}} found{print}' "$file")"
  if printf '%s\n' "$body" | rg -q "^## "; then
    local headers
    headers="$(printf '%s\n' "$body" | rg "^## " | head -3 | tr '\n' '|')"
    file_errors+=("## section headers in body: $headers")
  fi

  # 6. No trailing hashtags (lines like #AEC #Construction in body)
  if printf '%s\n' "$body" | rg -q "^#[A-Z]"; then
    file_errors+=("trailing hashtags found in body")
  fi

  # 7. Has at least one wiki-link [[
  if ! rg -q "\[\[" "$file"; then
    file_errors+=("no wiki-links found (add Related: [[...]] in footer)")
  fi

  # 8. Has footer separator --- (a second --- after frontmatter close)
  local separator_count
  separator_count="$(rg -n "^---$" "$file" | wc -l | tr -d ' ')"
  if [[ "$separator_count" -lt 2 ]]; then
    file_errors+=("missing footer separator (needs '---' before Related/Sources block)")
  fi

  # 9. Has Related: anywhere in file (can be inline with Backbone: or on its own line)
  if ! rg -q "Related:" "$file"; then
    file_errors+=("missing 'Related:' in footer")
  fi

  if [[ ${#file_errors[@]} -eq 0 ]]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+=("$name")
    echo "  FAIL  $name"
    for err in "${file_errors[@]}"; do
      echo "        → $err"
    done
  fi
}

echo ""
echo "Linting Thoughts notes in: $THOUGHTS_DIR"
echo "────────────────────────────────────────────"

while IFS= read -r file; do
  check_file "$file"
done < <(rg --files -g '*.md' "$THOUGHTS_DIR" | sort)

echo "────────────────────────────────────────────"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "Fix the $FAIL file(s) above to bring them into compliance."
  exit 1
else
  echo "All notes comply with format standards."
  exit 0
fi
