#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');

const EXCLUDED = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md']);

// Wiki-links from published notes sometimes point at research notes that live in
// sibling vault folders and are deliberately NOT published (podcast summaries,
// clipped third-party articles). Rather than publish that content, resolve those
// links to the original source URL recorded in each note's frontmatter. Fields
// are tried in order; the first that holds an http(s) URL wins. Folders that are
// absent at build time are skipped, so the link falls back to a missing-link span.
const SIDECAR_SOURCES = [
  { dir: path.resolve(repoRoot, '..', 'Snipd'), fields: ['episode_url', 'source'] },
  { dir: path.resolve(repoRoot, '..', 'Clippings'), fields: ['source'] },
];

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseFrontmatter(lines) {
  const data = {};
  let currentKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(listMatch[1].trim());
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      data[currentKey] = value === '' ? [] : value;
      continue;
    }

    currentKey = null;
  }

  return data;
}

function renderInline(text, resolveLink) {
  // Links are resolved against the raw text: escaping first would rewrite "&" to
  // "&amp;" and "'" to "&#39;" inside the target, so normalize()/slugify() would
  // derive the wrong key and the lookup would miss, and the label and href would
  // end up escaped twice. Each link is swapped for a placeholder, which passes
  // through escapeHtml unchanged, and its HTML is spliced back in at the end.
  const PLACEHOLDER = /WIKILINKREF(\d+)ENDREF/g;
  const links = [];
  const stash = (html) => `WIKILINKREF${links.push(html) - 1}ENDREF`;

  let out = text.replace(PLACEHOLDER, '').replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
    const trimmed = target.trim();
    const resolved = resolveLink(trimmed);
    const label = escapeHtml(trimmed.replace(/\.md$/i, ''));
    let html;
    if (resolved?.type === 'internal') {
      html = `<a href="#note=${encodeURIComponent(resolved.slug)}">${label}</a>`;
    } else if (resolved?.type === 'external') {
      html = `<a href="${escapeHtml(resolved.url)}" target="_blank" rel="noreferrer noopener">${label}</a>`;
    } else {
      html = `<span class="missing-link">${label}</span>`;
    }
    return stash(html);
  });

  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, href) =>
    stash(
      `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)}</a>`,
    ),
  );

  out = escapeHtml(out);

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  // A stashed link can itself contain a placeholder (a wiki-link inside a
  // markdown label), and replace() does not rescan what it splices in, so repeat
  // until stable. Nested links always reference a lower index, so this
  // terminates.
  let previous;
  do {
    previous = out;
    out = out.replace(PLACEHOLDER, (_, index) => links[Number(index)]);
  } while (out !== previous);

  return out;
}

function renderMarkdown(text, resolveLink) {
  const lines = text.split('\n');
  const html = [];
  let paragraph = [];
  let list = [];
  let quote = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(' '), resolveLink)}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    const items = list
      .map((item) => {
        if (/^https?:\/\/\S+$/.test(item)) {
          const href = escapeHtml(item);
          return `<li><a href="${href}" target="_blank" rel="noreferrer noopener">${href}</a></li>`;
        }

        return `<li>${renderInline(item, resolveLink)}</li>`;
      })
      .join('');
    html.push(`<ul>${items}</ul>`);
    list = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    const body = quote.map((line) => renderInline(line, resolveLink)).join(' ');
    html.push(`<blockquote><p>${body}</p></blockquote>`);
    quote = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    if (line === '---') {
      flushParagraph();
      flushList();
      flushQuote();
      html.push('<hr />');
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      flushQuote();
      list.push(line.slice(2).trim());
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      quote.push(line.slice(2).trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();

  return html.join('\n');
}

function stripMarkdown(text) {
  return text
    .replace(/\[\[([^\]]+)\]\]/g, (_, target) => target.replace(/\.md$/i, ''))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^- /gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseDate(value) {
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  return iso;
}

function extractSources(footerText) {
  if (!footerText) return [];

  const lines = footerText.split('\n');
  const sources = [];
  let inSources = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (!inSources) {
      if (/^sources:?$/i.test(line)) {
        inSources = true;
      }
      continue;
    }

    const body = line.replace(/^-+\s*/, '').trim();
    const linkMatch = body.match(/^\[[^\]]+\]\((https?:\/\/[^)\s]+)\)$/);
    const urlMatch = body.match(/(https?:\/\/\S+)/);
    const url = linkMatch ? linkMatch[1] : urlMatch ? urlMatch[1].replace(/[)\].,]+$/, '') : null;

    if (url) {
      sources.push(url);
    }
  }

  return [...new Set(sources)];
}

async function readNote(file) {
  const fullPath = path.join(repoRoot, file);
  const text = await fs.readFile(fullPath, 'utf8');
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const firstFence = lines.indexOf('---');
  const secondFence = lines.indexOf('---', firstFence + 1);
  const footerFence = lines.lastIndexOf('---');

  if (firstFence !== 0 || secondFence === -1) {
    throw new Error(`Invalid frontmatter in ${file}`);
  }

  const frontmatter = parseFrontmatter(lines.slice(firstFence + 1, secondFence));
  const contentLines = footerFence > secondFence ? lines.slice(secondFence + 1, footerFence) : lines.slice(secondFence + 1);
  const footerLines = footerFence > secondFence ? lines.slice(footerFence + 1) : [];
  const content = contentLines.join('\n').trim();
  const footer = footerLines.join('\n').trim();
  const title = path.basename(file, '.md');
  const slug = slugify(title);
  const stats = await fs.stat(fullPath);
  const sources = extractSources(footer);

  return {
    file,
    title,
    slug,
    groups: Array.isArray(frontmatter.groups) ? frontmatter.groups : [],
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    date: parseDate(frontmatter.date) || stats.mtime.toISOString().slice(0, 10),
    content,
    footer,
    sources,
    raw: normalized,
    contentText: stripMarkdown(content),
    footerText: stripMarkdown(footer),
    links: [],
    backlinks: [],
  };
}

async function walkMarkdown(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return []; // folder absent at build time — skip it gracefully
  }
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(full)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function extractFrontmatterUrl(raw, fields) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  const frontmatter = lines.slice(1, end);
  for (const field of fields) {
    for (const line of frontmatter) {
      const match = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
      if (!match || match[1] !== field) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '').trim();
      if (/^https?:\/\//.test(value)) return value;
    }
  }
  return null;
}

// Map basenames (and their normalized form) of sidecar research notes to the
// source URL in their frontmatter, so unpublished wiki-link targets can resolve
// to the original podcast/article instead of a dead link.
async function buildExternalLinks() {
  const map = new Map();
  for (const { dir, fields } of SIDECAR_SOURCES) {
    for (const full of await walkMarkdown(dir)) {
      let raw;
      try {
        raw = await fs.readFile(full, 'utf8');
      } catch {
        continue;
      }
      const url = extractFrontmatterUrl(raw, fields);
      if (!url) continue;
      const title = path.basename(full, '.md');
      if (!map.has(title)) map.set(title, url);
      const key = normalize(title);
      if (!map.has(key)) map.set(key, url);
    }
  }
  return map;
}

async function main() {
  const files = (await fs.readdir(repoRoot))
    .filter((file) => file.endsWith('.md') && !EXCLUDED.has(file))
    .sort((a, b) => a.localeCompare(b));

  const notes = await Promise.all(files.map(readNote));

  const lookup = new Map();
  for (const note of notes) {
    lookup.set(note.title, note.slug);
    lookup.set(path.basename(note.file, '.md'), note.slug);
    lookup.set(normalize(note.title), note.slug);
    lookup.set(normalize(path.basename(note.file, '.md')), note.slug);
    lookup.set(normalize(`${note.title}.md`), note.slug);
  }

  const externalLinks = await buildExternalLinks();

  // Internal notes win over external sidecar sources. Returns a tagged result so
  // callers can render an in-site anchor, an external anchor, or a missing-link.
  const resolveLink = (target) => {
    const slug = lookup.get(target) || lookup.get(normalize(target));
    if (slug) return { type: 'internal', slug };
    const url = externalLinks.get(target) || externalLinks.get(normalize(target));
    if (url) return { type: 'external', url };
    return null;
  };

  for (const note of notes) {
    const linkTargets = [...note.raw.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim());
    note.links = [
      ...new Set(
        linkTargets
          .map(resolveLink)
          .filter((resolved) => resolved?.type === 'internal')
          .map((resolved) => resolved.slug),
      ),
    ];
    note.bodyHtml = renderMarkdown(note.content, resolveLink);
    note.footerHtml = note.footer ? renderMarkdown(note.footer, resolveLink) : '';
    note.excerpt = note.contentText.slice(0, 220);
  }

  const noteBySlug = new Map(notes.map((note) => [note.slug, note]));
  for (const note of notes) {
    for (const slug of note.links) {
      const target = noteBySlug.get(slug);
      if (target && !target.backlinks.includes(note.slug)) {
        target.backlinks.push(note.slug);
      }
    }
  }

  notes.sort((a, b) => {
    if (a.date === b.date) return a.title.localeCompare(b.title);
    return a.date < b.date ? 1 : -1;
  });

  const groups = [...new Set(notes.flatMap((note) => note.groups))].sort((a, b) => a.localeCompare(b));
  const tags = [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b));

  const payload = {
    generatedAt: new Date().toISOString(),
    counts: {
      notes: notes.length,
      groups: groups.length,
      tags: tags.length,
    },
    groups,
    tags,
    notes: notes.map((note) => ({
      title: note.title,
      slug: note.slug,
      file: note.file,
      date: note.date,
      groups: note.groups,
      tags: note.tags,
      excerpt: note.excerpt,
      bodyHtml: note.bodyHtml,
      footerHtml: note.footerHtml,
      sources: note.sources,
      links: note.links,
      backlinks: note.backlinks,
      searchText: [
        note.title,
        note.date,
        note.groups.join(' '),
        note.tags.join(' '),
      note.contentText,
      note.footerText,
      ].join(' ').toLowerCase(),
    })),
  };

  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(path.join(docsDir, 'notes.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
