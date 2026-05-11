# Legal Code Site

A static site that fetches a Markdown note from HackMD, parses it into laws and paragraphs, and publishes a clean legal-code reading interface via GitHub Pages.

## What it does

- Fetches a HackMD note using the HackMD API.
- Parses the Markdown into laws, paragraphs, and subparagraphs.
- Generates a static `dist/index.html` with navigation, search, and readable layout.
- Publishes automatically via GitHub Actions on a schedule or manually.
- Only commits generated files when the content actually changed.

## Required repository secrets

Go to your repository settings under **Settings > Secrets and variables > Actions** and add:

| Secret name       | Description                              |
|-------------------|------------------------------------------|
| `HACKMD_API_KEY`  | Your HackMD API key                      |
| `HACKMD_NOTE_ID`  | The ID of the HackMD note to publish     |

**Warning: never commit your HackMD API key to the repository. It must only be stored as a repository secret.**

## Local setup

1. Clone the repository:
   ```
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. No dependencies to install. The build script uses only built-in Node.js APIs. Node.js 22 or newer is required.

## Setting environment variables locally (PowerShell)

```powershell
$env:HACKMD_API_KEY = "YOUR_HACKMD_API_KEY"
$env:HACKMD_NOTE_ID = "YOUR_HACKMD_NOTE_ID"
```

## Running the build locally

```powershell
npm run build
```

The generated files are written to `dist/`.

## Clearing environment variables (PowerShell)

```powershell
Remove-Item Env:HACKMD_API_KEY
Remove-Item Env:HACKMD_NOTE_ID
```

## GitHub Pages setup

1. Push the repository to GitHub.
2. Add the required repository secrets (see above).
3. Run the workflow manually once via **Actions > Build Legal Code > Run workflow** to generate the initial `dist/` files.
4. Go to **Settings > Pages**.
5. Under **Source**, select **Deploy from a branch**.
6. Set **Branch** to `main` and folder to `/dist`.
7. Save. GitHub Pages will publish the site from `dist/`.

## How the workflow behaves

The workflow runs every 15 minutes and can also be triggered manually. It fetches the latest content from HackMD, rebuilds the site, and commits only if the generated files changed. If nothing changed, it prints `No changes.` and exits successfully, avoiding unnecessary commits.

## Security notes

- The HackMD API key is read only from environment variables.
- The generated static site does not contain the API key.
- The browser JavaScript does not fetch HackMD and does not contain secrets.
- `.env` is listed in `.gitignore` and must never be committed.
