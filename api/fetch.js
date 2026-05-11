import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'docs');
const PUBLIC = join(ROOT, 'public');

// Validate environment variables
const API_KEY = process.env.HACKMD_API_KEY;
const NOTE_ID = process.env.HACKMD_NOTE_ID;

if (!API_KEY) {
    console.error('Error: HACKMD_API_KEY environment variable is not set.');
    process.exit(1);
}
if (!NOTE_ID) {
    console.error('Error: HACKMD_NOTE_ID environment variable is not set.');
    process.exit(1);
}

// Fetch markdown from HackMD
async function fetchMarkdown() {
    const url = `https://api.hackmd.io/v1/notes/${NOTE_ID}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${API_KEY}`,
        },
    });

    if (!response.ok) {
        console.error(`Error: HackMD API returned status ${response.status} ${response.statusText}`);
        process.exit(1);
    }

    const note = await response.json();
    return note.content ?? note.markdown ?? '';
}

// Escape HTML special characters
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Parse markdown into structured data
function parseMarkdown(markdown) {
    const lines = markdown.split('\n');
    const laws = [];
    let currentLaw = null;
    let currentParagraph = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Match top-level law heading: # Title (ABBR)
        const lawMatch = line.match(/^#\s+(.+?)\s+\(([^)]+)\)\s*$/);
        if (lawMatch) {
            currentParagraph = null;
            currentLaw = {
                title: lawMatch[1].trim(),
                abbreviation: lawMatch[2].trim(),
                id: `law-${lawMatch[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                paragraphs: [],
            };
            laws.push(currentLaw);
            continue;
        }

        // Match paragraph heading: ## §N Text
        const paragraphMatch = line.match(/^##\s+§(\d+)\s+(.+)$/);
        if (paragraphMatch && currentLaw) {
            currentParagraph = {
                number: paragraphMatch[1],
                text: paragraphMatch[2].trim(),
                id: `${currentLaw.id}-p${paragraphMatch[1]}`,
                subparagraphs: [],
            };
            currentLaw.paragraphs.push(currentParagraph);
            continue;
        }

        // Match subparagraph: a) Text or A) Text
        const subMatch = line.match(/^([a-zA-Z])\)\s+(.+)$/);
        if (subMatch && currentParagraph) {
            currentParagraph.subparagraphs.push({
                letter: subMatch[1],
                text: subMatch[2].trim(),
            });
            continue;
        }
    }

    return laws;
}

// Generate HTML for a single paragraph card
function renderParagraph(para) {
    const subList =
        para.subparagraphs.length > 0
            ? `<ol class="subparagraphs">${para.subparagraphs
                .map(
                    (s) =>
                        `<li class="subparagraph" data-letter="${escapeHtml(s.letter)}">${escapeHtml(s.text)}</li>`
                )
                .join('')}</ol>`
            : '';

    return `<article class="paragraph" id="${escapeHtml(para.id)}" data-paragraph>
  <h3 class="paragraph-heading">
    <span class="paragraph-number">§${escapeHtml(para.number)}</span>
    <span class="paragraph-text">${escapeHtml(para.text)}</span>
  </h3>
  ${subList}
</article>`;
}

// Generate full HTML document
function renderHtml(laws) {
    const totalParagraphs = laws.reduce((sum, law) => sum + law.paragraphs.length, 0);

    const navItems = laws
        .map(
            (law) =>
                `<li class="nav-law" id="nav-${escapeHtml(law.id)}">
      <a href="#${escapeHtml(law.id)}" class="nav-law-link">${escapeHtml(law.abbreviation)}</a>
      <span class="nav-law-title">${escapeHtml(law.title)}</span>
    </li>`
        )
        .join('');

    const lawSections = laws
        .map(
            (law) =>
                `<section class="law" id="${escapeHtml(law.id)}" data-law>
  <header class="law-header">
    <h2 class="law-title">
      <span class="law-abbreviation">${escapeHtml(law.abbreviation)}</span>
      ${escapeHtml(law.title)}
    </h2>
  </header>
  <div class="law-paragraphs">
    ${law.paragraphs.map(renderParagraph).join('\n    ')}
  </div>
</section>`
        )
        .join('\n\n');

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gesetzessammlung des Königreiches Aranea</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="layout">
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-label">Gesetze</span>
      </div>
      <ul class="nav-list" id="nav-list">
        ${navItems}
      </ul>
    </nav>

    <main class="content">
      <header class="page-header">
        <h1 class="page-title">Gesetzessammlung</h1>
        <p class="page-subtitle">Königreich Aranea</p>
        <div class="statistics">
          <span class="stat"><strong>${laws.length}</strong> Gesetze</span>
          <span class="stat-divider"></span>
          <span class="stat"><strong>${totalParagraphs}</strong> Paragraphen</span>
        </div>
      </header>

      <div class="search-bar">
        <input
          type="search"
          id="search-input"
          class="search-input"
          placeholder="Gesetze und Paragraphen durchsuchen..."
          aria-label="Suche"
        >
      </div>

      <div id="no-results" class="no-results" hidden>
        Keine Ergebnisse gefunden.
      </div>

      <div class="laws-container" id="laws-container">
        ${lawSections}
      </div>
    </main>
  </div>

  <script src="search.js"></script>
</body>
</html>`;
}

async function build() {
    console.log('Fetching note from HackMD...');
    const markdown = await fetchMarkdown();

    console.log('Parsing markdown...');
    const laws = parseMarkdown(markdown);
    console.log(`Parsed ${laws.length} laws, ${laws.reduce((s, l) => s + l.paragraphs.length, 0)} paragraphs.`);

    console.log('Generating docs/...');
    if (!existsSync(DIST)) {
        await mkdir(DIST, { recursive: true });
    }

    const html = renderHtml(laws);
    await writeFile(join(DIST, 'index.html'), html, 'utf8');
    await copyFile(join(PUBLIC, 'styles.css'), join(DIST, 'styles.css'));
    await copyFile(join(PUBLIC, 'search.js'), join(DIST, 'search.js'));

    console.log('Build complete. Output in docs/.');
}

build().catch((err) => {
    console.error('Build failed:', err.message);
    process.exit(1);
});