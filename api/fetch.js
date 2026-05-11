import fs from "node:fs/promises";

const apiKey = process.env.HACKMD_API_KEY;
const noteId = process.env.HACKMD_NOTE_ID;

if (!apiKey || !noteId) {
    throw new Error("HACKMD_API_KEY oder HACKMD_NOTE_ID fehlt.");
}

const response = await fetch(`https://api.hackmd.io/v1/notes/${noteId}`, {
    headers: {
        Authorization: `Bearer ${apiKey}`
    }
});

if (!response.ok) {
    throw new Error(`HackMD API Fehler: ${response.status} ${response.statusText}`);
}

const note = await response.json();
const markdown = note.content ?? note.markdown ?? "";
const laws = parseLaws(markdown);

await fs.mkdir("dist", { recursive: true });
await fs.copyFile("public/styles.css", "dist/styles.css");
await fs.writeFile("dist/index.html", renderPage(laws, note.updatedAt), "utf8");

function parseLaws(markdown) {
    const lines = markdown.split(/\r?\n/);
    const laws = [];
    let law = null;
    let paragraph = null;

    for (const line of lines) {
        const text = line.trim();
        if (!text) continue;

        const lawMatch = text.match(/^#\s+(.+?)\s*\(([^)]+)\)\s*$/);
        if (lawMatch) {
            law = {
                title: lawMatch[1],
                code: lawMatch[2],
                paragraphs: []
            };
            laws.push(law);
            paragraph = null;
            continue;
        }

        const paragraphMatch = text.match(/^##\s+(§\d+)\s+(.+)$/);
        if (paragraphMatch && law) {
            paragraph = {
                number: paragraphMatch[1],
                text: paragraphMatch[2],
                items: []
            };
            law.paragraphs.push(paragraph);
            continue;
        }

        const itemMatch = text.match(/^([a-z])\)\s+(.+)$/);
        if (itemMatch && paragraph) {
            paragraph.items.push({
                letter: itemMatch[1],
                text: itemMatch[2]
            });
        }
    }

    return laws;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function slug(value) {
    return encodeURIComponent(String(value).toLowerCase());
}

function renderPage(laws, updatedAt) {
    const paragraphCount = laws.reduce((sum, law) => sum + law.paragraphs.length, 0);
    const updated = updatedAt
        ? new Date(updatedAt).toLocaleString("de-AT")
        : "unbekannt";

    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rechtskodex Aranea</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="page">
    <header class="hero">
      <h1>Rechtskodex Aranea</h1>
      <p>Letzte Aktualisierung: ${escapeHtml(updated)}</p>
      <div class="stats">
        <span>${laws.length} Gesetze</span>
        <span>${paragraphCount} Paragraphen</span>
      </div>
    </header>

    <div class="layout">
      <nav aria-label="Gesetze">
        ${laws.map(law => `
          <a href="#${slug(law.code)}">
            <strong>${escapeHtml(law.code)}</strong>
            <span>${escapeHtml(law.title)}</span>
          </a>
        `).join("")}
      </nav>

      <div class="content">
        ${laws.map(renderLaw).join("")}
      </div>
    </div>
  </main>
</body>
</html>`;
}

function renderLaw(law) {
    return `
    <section class="law" id="${slug(law.code)}">
      <header class="law-header">
        <div>
          <p>${escapeHtml(law.code)}</p>
          <h2>${escapeHtml(law.title)}</h2>
        </div>
        <span>${law.paragraphs.length} Paragraphen</span>
      </header>

      ${law.paragraphs.map(renderParagraph).join("")}
    </section>
  `;
}

function renderParagraph(paragraph) {
    return `
    <article class="paragraph">
      <h3>${escapeHtml(paragraph.number)} ${escapeHtml(paragraph.text)}</h3>
      ${paragraph.items.length ? `
        <ol>
          ${paragraph.items.map(item => `
            <li>
              <span>${escapeHtml(item.letter)})</span>
              <p>${escapeHtml(item.text)}</p>
            </li>
          `).join("")}
        </ol>
      ` : ""}
    </article>
  `;
}