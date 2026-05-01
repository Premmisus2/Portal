#!/usr/bin/env bash
# Premmisus Sales Portal — post-commit build journal stub
#
# Auto-appends a 🟡 STUB entry to BUILD-JOURNAL.md after every commit.
# The stub captures: date, commit SHA, commit message, files changed.
# Required manual enrichment: idea, what shipped, rollback, verification,
# watch-for. Stubs are tagged with 🟡 STUB until enriched.
#
# Skipped if:
#   - Commit already touched BUILD-JOURNAL.md (manual entry exists)
#   - Commit message contains [skip-journal]
#
# INSTALL (one-time, per machine):
#   cd "/path/to/Sales Portal/deploy"
#   ln -sf "$(pwd)/scripts/post-commit-journal.sh" .git/hooks/post-commit
#   chmod +x scripts/post-commit-journal.sh
#
# Or copy instead of symlink (slightly safer if scripts/ ever gets deleted):
#   cp scripts/post-commit-journal.sh .git/hooks/post-commit
#   chmod +x .git/hooks/post-commit
#
# Failures here do NOT block the commit (post-commit hooks are advisory).
# This is intentional — a journal hook bug should never prevent shipping.

set +e  # Don't fail the hook if anything goes wrong; we're just logging.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
    echo "[journal hook] not in a git repo — skipping" >&2
    exit 0
fi

JOURNAL="${REPO_ROOT}/BUILD-JOURNAL.md"
if [ ! -f "$JOURNAL" ]; then
    echo "[journal hook] BUILD-JOURNAL.md not found at $JOURNAL — skipping" >&2
    exit 0
fi

COMMIT_SHA_SHORT=$(git log -1 --format=%h)
COMMIT_SHA_FULL=$(git log -1 --format=%H)
COMMIT_MSG_SUBJECT=$(git log -1 --format=%s)
COMMIT_DATE=$(git log -1 --format=%cd --date=format:%Y-%m-%d)

# Skip if commit message contains [skip-journal]
if echo "$COMMIT_MSG_SUBJECT" | grep -q '\[skip-journal\]'; then
    echo "[journal hook] commit has [skip-journal] tag — skipping auto-stub"
    exit 0
fi

# Skip if BUILD-JOURNAL.md was modified in this commit
# (the file path is at repo root, so check name-only output for an exact match)
if git log -1 --name-only --format= | grep -qx "BUILD-JOURNAL.md"; then
    echo "[journal hook] commit touched BUILD-JOURNAL.md — skipping auto-stub"
    exit 0
fi

# Build files list (markdown bullets)
FILES_BULLETS=$(git log -1 --name-only --format= | grep -v '^$' | sed 's|.*|- `&`|')
if [ -z "$FILES_BULLETS" ]; then
    FILES_BULLETS="- _(no files reported)_"
fi

# Build the stub in a temp file (safer than embedding in shell heredoc)
STUB_FILE=$(mktemp -t pmss-journal-stub.XXXXXX)
cat > "$STUB_FILE" <<EOF

## $COMMIT_DATE [UNTAGGED] $COMMIT_MSG_SUBJECT

**Status:** 🟡 STUB — needs enrichment

**Commit:** \`$COMMIT_SHA_FULL\` (\`$COMMIT_SHA_SHORT\`)

**Files:**
$FILES_BULLETS

**Idea (Elliott's intent):** _(to be filled in)_

**What shipped:** _(to be filled in — 1-3 sentences)_

**Rollback:**
\`\`\`bash
git revert $COMMIT_SHA_SHORT
\`\`\`

**Verification:** _(to be filled in — what was actually run/observed)_

**Watch for:** _(to be filled in — failure modes, related env vars, coupled files)_

---
EOF

# Insert AFTER the "<!-- ENTRIES BELOW -->" marker so newest is at top.
# Use python3 for cross-platform safety (macOS sed has flag quirks).
python3 - "$JOURNAL" "$STUB_FILE" <<'PY'
import sys
journal_path, stub_path = sys.argv[1], sys.argv[2]
with open(journal_path, 'r') as f:
    content = f.read()
with open(stub_path, 'r') as f:
    stub = f.read()
marker = '<!-- ENTRIES BELOW -->'
if marker not in content:
    # Fallback: append to end
    with open(journal_path, 'a') as f:
        f.write(stub)
else:
    new = content.replace(marker, marker + stub, 1)
    with open(journal_path, 'w') as f:
        f.write(new)
PY

PYTHON_EXIT=$?
rm -f "$STUB_FILE"

if [ $PYTHON_EXIT -ne 0 ]; then
    echo "[journal hook] failed to insert stub (python exit $PYTHON_EXIT) — see above" >&2
    exit 0
fi

echo "[journal hook] appended 🟡 STUB for $COMMIT_SHA_SHORT to BUILD-JOURNAL.md — please enrich"
exit 0
