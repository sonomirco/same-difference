# thoughts

A collection of thoughts on the construction industry, blending product thinking, AEC, AI, and ideas from adjacent fields.

## Structure

- Each note is a standalone Markdown file in the repo root.
- Notes use YAML frontmatter with `groups:`, `tags:`, and `date:`.
- Related notes are linked with wiki-links in the body/footer.
- External citations live under `Sources:` as raw URLs in the footer.
- The GitHub Pages reader lives in `docs/` and is generated from the Markdown vault.
- The archive is date-first, grouped by year, and opens the latest note by default.
- Clicking a tag inside a note filters the catalogue immediately.

## Working with notes

- Keep notes prose-first and concise.
- Add or update `date:` in frontmatter when creating a note.
- Use `AGENTS.md` for the local agent instructions.
- Use `Sources:` only for external URLs and keep them as raw links in the markdown footer.

## Validation

Run the note linter before publishing changes:

```bash
bash ./lint-thoughts.sh
```

Generate the Pages manifest when notes change:

```bash
node ./scripts/build-site.mjs
```
