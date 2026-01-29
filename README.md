# Start page (local links)

A simple, dark start page with categorized links. No frameworks — just HTML/CSS/JS.

## Usage

The page **always** loads `links.txt` placed next to `index.html`.

### First-time setup

Create your local `links.txt` from the provided template:

```bash
cp links.sample.txt links.txt
```

### Run (recommended — via HTTP)

Run a simple server in the project directory, e.g.:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/`

## File format

### TXT

Two formats are supported:

#### 1) Sections

```txt
[local]
Jenkins, http://jenkins.local, CI/CD

[tools]
GitHub, https://github.com/, Repositories
```

#### 2) `|` separator

```txt
local|Jenkins|http://jenkins.local|CI/CD|Jenkins|10
tools|GitHub|https://github.com/|Repositories|Code|20
```

## Categories

Preferred: `local`, `tools`, `ai`. Any other categories will also work (they’ll show below).

