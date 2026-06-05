# Thoughts — Folder Guide

This folder contains 62 thinking notes on AEC, AI, product strategy, organisational design, and digital transformation. Each note is a single idea worked through in prose — not a reference dump.

## What a note is

A Thought is one idea, developed in 3–6 paragraphs of running prose. It is written in the first person or close to it, as if thinking out loud. It is not a summary of sources, a bullet-point list, or a structured reference document. Think of The Champion Problem or The Collapsing Distance as the reference register.

## File format

Every file must follow this exact structure:

```markdown
---
groups:
- Group Name
- Another Group
tags:
- kebab-case-tag
- another-tag
date: 2026-01-14
---
[Prose body — no ## headers anywhere, no bullet lists as the primary structure]

**[One bold sentence carrying the key insight]**

[More prose]

---

Related: [[Source Note]], [[File 1]], [[File 2]].

Sources:
- https://url-if-applicable
```

### Rules
- **YAML frontmatter**: `groups:` (title-case phrases), `tags:` (kebab-case), and `date:` (ISO `YYYY-MM-DD`) are required on every file
- **No ## section headers** anywhere in the body
- **One bold line** per note — the sentence that carries the most weight
- **No trailing hashtags** (`#AEC`, `#AI`, etc.) — tags live in the frontmatter
- **Footer block**: always after a `---` separator; contains `Related:` (2–4 wiki-links) and `Sources:` (raw URLs if applicable)
- **Wiki-links**: every note must link to at least 2 other notes via `[[filename]]`
- `Related:` = thematic neighbours in the vault — notes this one builds on, extends, or contradicts
- `Sources:` = external URLs (articles, podcasts, videos); omit if the note is original thinking with no external source

### Groups vocabulary
Use existing groups first, add new ones only when the note is genuinely new territory:
Product strategy · Technology · Industry specific · Process improvement · Future of work · Leadership skill · Organizational culture · Business model · Team management · Decision making · Engineering discipline · Digital transformation · Scaling

### Tags vocabulary
Search existing notes for established tags before inventing new ones.

## Lint check

Run the lint script to verify all notes comply:

```bash
bash /Users/biancopeve/Documents/sonomirco/Thoughts/lint-thoughts.sh
```

## Adding a new note

1. Write the note as prose first — title, body, bold insight
2. Add frontmatter with `groups:`, `tags:`, and `date:`
3. Add the footer block with at least 2 `Related:` wiki-links
4. Run lint to verify before saving

## Theme clusters

| Cluster | Key notes |
|---|---|
| AI / automation | Workflows & the agent layer · The Collapsing Distance · The Automation Ceiling · More efficiency more demand · Small Tools Bigger Question |
| Data / infrastructure | AEC data and schemas · Make readable to agents · The data flywheel we haven't built yet · PDFs as the source of knowledge · Context problem |
| Product & discovery | Everything we build is a product · Product discovery and feature factory · Listening to customers · Rigorous where it counts · Failing brewing coffee |
| Adoption / culture | The Champion Problem · Why technology adoption is poor in AEC · Communication and clarity · Corporate fear and startup agility · Building psychologically safe teams |
| Business model | From T&M to outcome · When Speed Becomes a Commodity · Why construction is trapped in delivery mode · The Software Industry Showed Us the Bill |
| Platform / architecture | Configurators and infrastructure thinking · Platform · Platformisation in the built environment · Computational design · Democratising computation |
| Institutional knowledge | OpenClaw & institutional knowledge · Skills aren't just for developers anymore · Every project makes the next one harder · Four types of debt |
| Strategy | Strategy · Strategy for scaling digital capability · Gen AI and the future of product management · Learning from Nvidia |
