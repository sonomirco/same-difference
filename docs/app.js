const state = {
  notes: [],
  filtered: [],
  activeSlug: null,
  search: '',
  group: 'all',
};

const els = {
  noteList: document.getElementById('note-list'),
  reader: document.getElementById('reader'),
  search: document.getElementById('search-input'),
  groupFilters: document.getElementById('group-filters'),
  resultCount: document.getElementById('result-count'),
  resultCountDup: document.getElementById('result-count-dup'),
  countNotes: document.getElementById('count-notes'),
  countGroups: document.getElementById('count-groups'),
  countTags: document.getElementById('count-tags'),
  generatedAt: document.getElementById('generated-at'),
  randomBtn: document.getElementById('random-btn'),
  latestBtn: document.getElementById('latest-btn'),
  clearBtn: document.getElementById('clear-btn'),
};

const formatDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function hashForSlug(slug) {
  return `#note=${encodeURIComponent(slug)}`;
}

function slugFromHash() {
  const match = location.hash.match(/(?:^#note=)(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setDocumentTitle(note) {
  document.title = note ? `${note.title} · Thoughts` : 'Thoughts';
}

function getNoteBySlug(slug) {
  return state.notes.find((note) => note.slug === slug) || null;
}

function noteMatches(note) {
  const search = state.search.trim().toLowerCase();
  const group = state.group;

  if (group !== 'all' && !note.groups.includes(group)) {
    return false;
  }

  if (!search) {
    return true;
  }

  return note.searchText.includes(search);
}

function renderFilters() {
  const chips = ['all', ...state.groups];
  els.groupFilters.innerHTML = chips
    .map((group) => {
      const label = group === 'all' ? 'All' : group;
      return `<button class="filter-chip" data-group="${group}" data-active="${group === state.group}">${label}</button>`;
    })
    .join('');
}

function renderList() {
  state.filtered = state.notes.filter(noteMatches);
  els.resultCount.textContent = `${state.filtered.length} note${state.filtered.length === 1 ? '' : 's'}`;
  if (els.resultCountDup) {
    els.resultCountDup.textContent = els.resultCount.textContent;
  }
  els.noteList.innerHTML = state.filtered
    .map((note) => {
      const active = note.slug === state.activeSlug;
      const groups = note.groups.slice(0, 2).join(' · ');
      const tags = note.tags.slice(0, 3);
      return `
        <button class="note-btn" data-slug="${note.slug}" data-active="${active}">
          <div class="note-meta-line">
            <time datetime="${note.date}">${formatDate.format(new Date(`${note.date}T12:00:00Z`))}</time>
            <span>${groups}</span>
          </div>
          <h3>${note.title}</h3>
          <div class="note-excerpt">${note.excerpt}</div>
          <div class="note-tags">
            ${tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join('')}
          </div>
        </button>
      `;
    })
    .join('');
}

function renderReader(note) {
  if (!note) {
    els.reader.innerHTML = `
      <div class="reader-empty">
        <div>
          <p class="reader-kicker">Thoughts</p>
          <h2>Select a note</h2>
          <p>Pick a note from the archive, search the vault, or hit random to jump somewhere unexpected.</p>
        </div>
      </div>
    `;
    setDocumentTitle(null);
    return;
  }

  const related = note.links
    .map((slug) => getNoteBySlug(slug))
    .filter(Boolean)
    .map((target) => `<a class="pill" href="${hashForSlug(target.slug)}">${target.title}</a>`)
    .join('');

  const backlinks = note.backlinks
    .map((slug) => getNoteBySlug(slug))
    .filter(Boolean)
    .map((source) => `<a class="pill" href="${hashForSlug(source.slug)}">${source.title}</a>`)
    .join('');

  els.reader.innerHTML = `
    <section class="reader-section">
      <header class="reader-head">
        <div class="reader-kicker">Note</div>
        <h2>${note.title}</h2>
        <div class="reader-meta">
          <time datetime="${note.date}">${formatDate.format(new Date(`${note.date}T12:00:00Z`))}</time>
          <span>•</span>
          <span>${note.groups.join(' · ')}</span>
        </div>
        <div class="note-tags">
          ${note.tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join('')}
        </div>
      </header>

      <div class="reader-body">${note.bodyHtml}</div>
    </section>

    <section class="reader-section">
      <div class="reader-footer">
        <div>
          <h3>Related</h3>
          <div class="related-list">
            ${related || '<span class="empty-state">No linked notes found in the footer yet.</span>'}
          </div>
        </div>

        <div>
          <h3>Linked from</h3>
          <div class="backlink-list">
            ${backlinks || '<span class="empty-state">Nothing points here yet.</span>'}
          </div>
        </div>

        ${
          note.footerHtml
            ? `<details class="footer-disclosure">
                <summary>Original footer</summary>
                <div class="reader-body footer-copy">${note.footerHtml}</div>
              </details>`
            : ''
        }
      </div>
    </section>
  `;

  setDocumentTitle(note);
}

function setActive(slug, { push = true } = {}) {
  const note = getNoteBySlug(slug) || state.filtered[0] || state.notes[0] || null;
  if (!note) {
    renderReader(null);
    return;
  }

  state.activeSlug = note.slug;
  renderList();
  renderReader(note);

  if (push) {
    history.replaceState(null, '', hashForSlug(note.slug));
  }

  requestAnimationFrame(() => {
    document.querySelector(`[data-slug="${CSS.escape(note.slug)}"]`)?.scrollIntoView({ block: 'nearest' });
  });
}

function pickRandom() {
  const pool = state.filtered.length ? state.filtered : state.notes;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  if (selected) {
    setActive(selected.slug);
  }
}

async function boot() {
  const response = await fetch('./notes.json', { cache: 'no-store' });
  const data = await response.json();

  state.notes = data.notes;
  state.groups = data.groups;
  state.tags = data.tags;

  els.countNotes.textContent = String(data.counts.notes);
  els.countGroups.textContent = String(data.counts.groups);
  els.countTags.textContent = String(data.counts.tags);
  els.generatedAt.textContent = formatDate.format(new Date(`${data.generatedAt.slice(0, 10)}T12:00:00Z`));

  if (location.hash === '#top') {
    history.replaceState(null, '', '#');
  }

  renderFilters();
  renderList();

  const initialSlug = slugFromHash() || state.notes[0]?.slug || null;
  if (initialSlug) {
    setActive(initialSlug, { push: false });
  } else {
    renderReader(null);
  }
}

els.search.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderList();
  const active = getNoteBySlug(state.activeSlug);
  const fallback = state.filtered[0] || null;
  renderReader(active && noteMatches(active) ? active : fallback);
});

els.groupFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-group]');
  if (!button) return;
  state.group = button.dataset.group;
  renderFilters();
  renderList();
  const active = getNoteBySlug(state.activeSlug);
  const fallback = state.filtered[0] || null;
  renderReader(active && noteMatches(active) ? active : fallback);
});

els.noteList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-slug]');
  if (!button) return;
  setActive(button.dataset.slug);
});

els.randomBtn.addEventListener('click', pickRandom);
els.latestBtn.addEventListener('click', () => setActive(state.notes[0]?.slug));
els.clearBtn.addEventListener('click', () => {
  state.search = '';
  state.group = 'all';
  els.search.value = '';
  renderFilters();
  renderList();
  setActive(state.notes[0]?.slug, { push: false });
});

window.addEventListener('hashchange', () => {
  const slug = slugFromHash();
  if (slug) {
    setActive(slug, { push: false });
  }
});

boot().catch((error) => {
  console.error(error);
  els.reader.innerHTML = `
    <div class="reader-empty">
      <div>
        <p class="reader-kicker">Error</p>
        <h2>Could not load notes</h2>
        <p>${error.message}</p>
      </div>
    </div>
  `;
});
