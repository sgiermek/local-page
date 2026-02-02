# Start page (local links)

A simple, dark start page with categorized links. No frameworks — just HTML/CSS/TypeScript.

## Requirements

- Node.js (for TypeScript compilation)

## Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Usage

The page loads `links.txt` placed next to `index.html`.

### First-time setup

Create your local `links.txt` from the provided template:

```bash
cp links.sample.txt links.txt
```

### Run

Start a local server in the project directory:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`

### Development

Watch mode for TypeScript (auto-recompile on changes):

```bash
npm run dev
```

## Project structure

```
├── src/
│   └── app.ts        # Source (TypeScript)
├── dist/
│   └── app.js        # Compiled output (generated)
├── index.html
├── styles.css
├── links.txt         # Your links (git-ignored)
└── links.sample.txt  # Template
```

## File format

Two formats are supported:

### 1) Sections

```txt
[local]
Jenkins, http://jenkins.local, CI/CD

[tools]
GitHub, https://github.com/, Repositories
```

### 2) Pipe separator

```txt
local|Jenkins|http://jenkins.local|CI/CD|Jenkins|10
tools|GitHub|https://github.com/|Repositories|Code|20
```

Format: `category|name|url|description|tag|order`

## Categories

Main categories: `local`, `tools`, `ai` (displayed as columns).

Any other categories will appear below in a separate section.
