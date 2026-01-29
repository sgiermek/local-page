/* Start page - minimal, no deps */

const CATEGORY_ORDER = ["local", "tools", "ai"];
const CATEGORY_LABELS = {
  local: "local",
  tools: "tools",
  ai: "ai",
};

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

const elGridMain = $("#gridMain");
const elGridOther = $("#gridOther");
const elSearch = /** @type {HTMLInputElement} */ ($("#search"));
const elSourcePill = $("#sourcePill");
const elCountPill = $("#countPill");

/** @typedef {{category: string, name: string, url: string, desc?: string, tag?: string, order?: number}} Link */

/** @type {Link[]} */
let allLinks = [];
let currentQuery = "";
let currentSource = "—";

function normalizeCategory(raw) {
  const c = String(raw || "").trim().toLowerCase();
  if (!c) return "other";
  // keep a bit of backwards-compat for Polish section names
  if (c === "lokalne") return "local";
  if (c === "narzedzia" || c === "narzędzia") return "tools";
  return c;
}

function safeUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  // allow http(s), file, local hostnames, custom schemes
  return u;
}

function compact(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function detectFormat(text) {
  const trimmed = String(text || "").trim();
  const firstLine = trimmed.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#")) || "";

  // Pipe-delimited: category|name|url|...
  if (firstLine.includes("|")) return "pipe";

  // INI-ish sections: [local]
  if (/^\s*\[[^\]]+\]\s*$/.test(firstLine)) return "sections";

  return "unknown";
}

/** @returns {Link[]} */
function parseLinks(text) {
  const format = detectFormat(text);
  const lines = String(text || "").split(/\r?\n/);

  /** @type {Link[]} */
  const out = [];

  if (format === "sections") {
    let current = "other";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^\[([^\]]+)\]$/);
      if (m) {
        current = normalizeCategory(m[1]);
        continue;
      }
      // name, url, optional desc (comma) OR name | url
      if (line.includes("|")) {
        const parts = line.split("|").map((p) => p.trim());
        const name = parts[0] || "";
        const url = parts[1] || "";
        const desc = parts[2] || "";
        if (name && url) out.push({ category: current, name, url: safeUrl(url), desc: compact(desc) });
      } else {
        const parts = line.split(",").map((p) => p.trim());
        const name = parts[0] || "";
        const url = parts[1] || "";
        const desc = parts.slice(2).join(",").trim();
        if (name && url) out.push({ category: current, name, url: safeUrl(url), desc: compact(desc) });
      }
    }
    return out;
  }

  if (format === "pipe") {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split("|").map((p) => p.trim());
      // category|name|url|desc|tag|order
      const category = normalizeCategory(parts[0]);
      const name = parts[1] || "";
      const url = parts[2] || "";
      const desc = parts[3] || "";
      const tag = parts[4] || "";
      const order = parts[5] ? Number(parts[5]) : undefined;
      if (name && url) out.push({ category, name, url: safeUrl(url), desc: compact(desc), tag: compact(tag), order });
    }
    return out;
  }

  // If no recognized format, return empty (wymagamy TXT z sekcjami albo z "|")
  return [];
}

function groupLinks(links) {
  /** @type {Map<string, Link[]>} */
  const map = new Map();
  for (const l of links) {
    const cat = normalizeCategory(l.category);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push({ ...l, category: cat });
  }
  // stable ordering inside category
  for (const [cat, arr] of map.entries()) {
    arr.sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order : 9999;
      const bo = Number.isFinite(b.order) ? b.order : 9999;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "pl");
    });
    map.set(cat, arr);
  }
  return map;
}

function categorySortKey(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}

function match(link, q) {
  if (!q) return true;
  const hay = `${link.name} ${link.url} ${link.desc || ""} ${link.tag || ""} ${link.category}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderCategory({ cat, title, links, emptyText }) {
  const section = document.createElement("section");
  section.className = "category";

  const header = document.createElement("div");
  header.className = "category__header";

  const h = document.createElement("h2");
  h.className = "category__title";
  h.textContent = title;

  const meta = document.createElement("div");
  meta.className = "category__meta";
  meta.textContent = `${links.length} links`;

  header.appendChild(h);
  header.appendChild(meta);

  const list = document.createElement("div");
  list.className = "links";

  if (links.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = emptyText;
    list.appendChild(empty);
  }

  for (const l of links) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noreferrer";

    const top = document.createElement("div");
    top.className = "card__top";

    const name = document.createElement("div");
    name.className = "card__name";
    name.textContent = l.name;

    const tag = document.createElement("div");
    tag.className = "card__tag";
    tag.textContent = l.tag ? l.tag : cat;

    top.appendChild(name);
    top.appendChild(tag);

    const url = document.createElement("div");
    url.className = "card__url";
    url.textContent = l.url;

    const desc = document.createElement("div");
    desc.className = "card__desc";
    desc.textContent = l.desc ? l.desc : "";

    a.appendChild(top);
    a.appendChild(url);
    a.appendChild(desc);
    list.appendChild(a);
  }

  section.appendChild(header);
  section.appendChild(list);
  return section;
}

function renderOtherCategory({ cat, title, links, emptyText }) {
  const section = document.createElement("section");
  section.className = "other-section";

  const h = document.createElement("h3");
  h.className = "other-section__title";
  h.textContent = title || cat;

  const list = document.createElement("ul");
  list.className = "other-section__list";

  if (links.length === 0) {
    const li = document.createElement("li");
    li.className = "other-section__empty";
    li.textContent = emptyText;
    list.appendChild(li);
  }

  for (const l of links) {
    const a = document.createElement("a");
    a.className = "other-section__link";
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = l.name;
    a.title = l.url;

    const li = document.createElement("li");
    li.className = "other-section__item";
    li.appendChild(a);
    list.appendChild(li);
  }

  section.appendChild(h);
  section.appendChild(list);
  return section;
}

function render() {
  const q = currentQuery;
  const filtered = allLinks.filter((l) => match(l, q));
  const grouped = groupLinks(filtered);

  elGridMain.innerHTML = "";
  elGridOther.innerHTML = "";

  // 1) Trzy główne kolumny: zawsze pokazuj local/tools/ai
  for (const cat of CATEGORY_ORDER) {
    const links = grouped.get(cat) || [];
    const title = CATEGORY_LABELS[cat] || cat;
    elGridMain.appendChild(
      renderCategory({
        cat,
        title,
        links,
        emptyText: q ? "No matches in this category." : "No links in this category.",
      })
    );
  }

  // 2) Other sections from the file (e.g. [other]) below
  const otherCats = Array.from(grouped.keys())
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort((a, b) => categorySortKey(a) - categorySortKey(b) || a.localeCompare(b, "pl"));

  for (const cat of otherCats) {
    const links = grouped.get(cat) || [];
    const title = CATEGORY_LABELS[cat] || cat;
    elGridOther.appendChild(
      renderOtherCategory({
        cat,
        title,
        links,
        emptyText: q ? "No matches in this category." : "No links in this category.",
      })
    );
  }

  elSourcePill.textContent = `Source: ${currentSource}`;
  elCountPill.textContent = `Links: ${filtered.length}`;
}

function applyRaw(raw, srcLabel) {
  const links = parseLinks(raw);
  // basic validation / de-dupe
  const seen = new Set();
  allLinks = links
    .map((l) => ({
      category: normalizeCategory(l.category),
      name: compact(l.name),
      url: safeUrl(l.url),
      desc: compact(l.desc || ""),
      tag: compact(l.tag || ""),
      order: Number.isFinite(l.order) ? l.order : undefined,
    }))
    .filter((l) => l.name && l.url)
    .filter((l) => {
      const key = `${l.category}||${l.name}||${l.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  currentSource = srcLabel || "—";
  render();
  return allLinks.length;
}

function initEvents() {
  elSearch.addEventListener("input", () => {
    currentQuery = elSearch.value.trim();
    render();
  });
}

async function main() {
  initEvents();
  render(); // placeholder UI while loading

  const src = "./links.txt";
  try {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    applyRaw(text, "links.txt");
  } catch (e) {
    currentSource = "links.txt (load error)";
    render();
    // no banner/status — just footer + empty sections
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

main();
