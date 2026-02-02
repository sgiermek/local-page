/* Start page - minimal, no deps */

// --- Types ---
interface Link {
  category: string;
  name: string;
  url: string;
  desc: string;
  tag: string;
  order?: number;
}

interface ParsedLine {
  category?: string;
  name: string;
  url: string;
  desc: string;
  tag?: string;
  order?: number;
}

interface RenderOptions {
  cat: string;
  title: string;
  links: Link[];
  emptyText: string;
}

type Format = "pipe" | "sections" | "unknown";

// --- Constants ---
const CATEGORY_ORDER = ["local", "tools", "ai"] as const;
const CATEGORY_LABELS: Record<string, string> = { local: "local", tools: "tools", ai: "ai" };

// --- DOM helpers ---
const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string | null
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
};

// --- State ---
let allLinks: Link[] = [];
let currentQuery = "";
let currentSource = "—";

// --- Cached elements ---
const elGridMain = $<HTMLElement>("#gridMain")!;
const elGridOther = $<HTMLElement>("#gridOther")!;
const elSearch = $<HTMLInputElement>("#search")!;
const elSourcePill = $<HTMLElement>("#sourcePill")!;
const elCountPill = $<HTMLElement>("#countPill")!;

// --- Utilities ---
const compact = (s: string | null | undefined): string =>
  String(s ?? "").replace(/\s+/g, " ").trim();

const normalizeCategory = (raw: string | null | undefined): string => {
  const c = compact(raw).toLowerCase();
  if (!c) return "other";
  if (c === "lokalne") return "local";
  if (c === "narzedzia" || c === "narzędzia") return "tools";
  return c;
};

const categorySortKey = (cat: string): number => {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(cat);
  return i === -1 ? 999 : i;
};

const match = (link: Link, q: string): boolean => {
  if (!q) return true;
  const hay = `${link.name} ${link.url} ${link.desc} ${link.tag} ${link.category}`.toLowerCase();
  return hay.includes(q.toLowerCase());
};

// --- Parsing ---
const detectFormat = (text: string | null | undefined): Format => {
  const lines = String(text ?? "").trim().split(/\r?\n/);
  const firstContent = lines.find((l) => l.trim() && !l.trim().startsWith("#")) ?? "";
  if (firstContent.includes("|")) return "pipe";
  if (/^\s*\[[^\]]+\]\s*$/.test(firstContent)) return "sections";
  return "unknown";
};

const parseLine = (line: string, separator: string): ParsedLine => {
  const parts = line.split(separator).map((p) => p.trim());

  if (separator === "|" && parts.length >= 3) {
    return {
      category: normalizeCategory(parts[0]),
      name: parts[1] ?? "",
      url: parts[2] ?? "",
      desc: compact(parts[3]),
      tag: compact(parts[4]),
      order: parts[5] ? Number(parts[5]) : undefined,
    };
  }

  return {
    name: parts[0] ?? "",
    url: parts[1] ?? "",
    desc: compact(parts.slice(2).join(",")),
  };
};

const parseLinks = (text: string | null | undefined): ParsedLine[] => {
  const format = detectFormat(text);
  const lines = String(text ?? "").split(/\r?\n/);
  const out: ParsedLine[] = [];

  if (format === "sections") {
    let currentCat = "other";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentCat = normalizeCategory(sectionMatch[1]);
        continue;
      }

      const separator = line.includes("|") ? "|" : ",";
      const parsed = parseLine(line, separator);
      if (parsed.name && parsed.url) {
        out.push({ category: currentCat, ...parsed });
      }
    }
    return out;
  }

  if (format === "pipe") {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const parsed = parseLine(line, "|");
      if (parsed.name && parsed.url) {
        out.push(parsed);
      }
    }
    return out;
  }

  return [];
};

// --- Grouping & sorting ---
const groupLinks = (links: Link[]): Map<string, Link[]> => {
  const map = new Map<string, Link[]>();

  for (const l of links) {
    const cat = l.category;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(l);
  }

  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const ao = Number.isFinite(a.order) ? a.order! : 9999;
      const bo = Number.isFinite(b.order) ? b.order! : 9999;
      return ao !== bo ? ao - bo : a.name.localeCompare(b.name, "pl");
    });
  }

  return map;
};

// --- Rendering ---
const createCard = (link: Link, cat: string): HTMLAnchorElement => {
  const a = el("a", "card");
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noreferrer";

  const top = el("div", "card__top");
  top.append(el("div", "card__name", link.name), el("div", "card__tag", link.tag || cat));

  a.append(top, el("div", "card__url", link.url), el("div", "card__desc", link.desc || ""));
  return a;
};

const createLinkItem = (link: Link): HTMLLIElement => {
  const a = el("a", "other-section__link", link.name);
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.title = link.url;

  const li = el("li", "other-section__item");
  li.appendChild(a);
  return li;
};

const renderCategory = ({ cat, title, links, emptyText }: RenderOptions): HTMLElement => {
  const section = el("section", "category");

  const header = el("div", "category__header");
  header.append(el("h2", "category__title", title), el("div", "category__meta", `${links.length} links`));

  const list = el("div", "links");

  if (links.length === 0) {
    list.appendChild(el("div", "empty", emptyText));
  } else {
    for (const l of links) {
      list.appendChild(createCard(l, cat));
    }
  }

  section.append(header, list);
  return section;
};

const renderOtherCategory = ({ cat, title, links, emptyText }: RenderOptions): HTMLElement => {
  const section = el("section", "other-section");
  section.appendChild(el("h3", "other-section__title", title || cat));

  const list = el("ul", "other-section__list");

  if (links.length === 0) {
    list.appendChild(el("li", "other-section__empty", emptyText));
  } else {
    for (const l of links) {
      list.appendChild(createLinkItem(l));
    }
  }

  section.appendChild(list);
  return section;
};

const render = (): void => {
  const filtered = allLinks.filter((l) => match(l, currentQuery));
  const grouped = groupLinks(filtered);
  const emptyText = currentQuery ? "No matches in this category." : "No links in this category.";

  elGridMain.innerHTML = "";
  elGridOther.innerHTML = "";

  // Main categories (always shown)
  for (const cat of CATEGORY_ORDER) {
    const links = grouped.get(cat) ?? [];
    const title = CATEGORY_LABELS[cat] ?? cat;
    elGridMain.appendChild(renderCategory({ cat, title, links, emptyText }));
  }

  // Other categories
  const otherCats = Array.from(grouped.keys())
    .filter((c) => !CATEGORY_ORDER.includes(c as typeof CATEGORY_ORDER[number]))
    .sort((a, b) => categorySortKey(a) - categorySortKey(b) || a.localeCompare(b, "pl"));

  for (const cat of otherCats) {
    const links = grouped.get(cat) ?? [];
    const title = CATEGORY_LABELS[cat] ?? cat;
    elGridOther.appendChild(renderOtherCategory({ cat, title, links, emptyText }));
  }

  elSourcePill.textContent = `Source: ${currentSource}`;
  elCountPill.textContent = `Links: ${filtered.length}`;
};

// --- Data loading ---
const applyRaw = (raw: string, srcLabel?: string): number => {
  const seen = new Set<string>();

  allLinks = parseLinks(raw)
    .map((l): Link => ({
      category: normalizeCategory(l.category),
      name: compact(l.name),
      url: compact(l.url),
      desc: compact(l.desc ?? ""),
      tag: compact(l.tag ?? ""),
      order: Number.isFinite(l.order) ? l.order : undefined,
    }))
    .filter((l) => l.name && l.url)
    .filter((l) => {
      const key = `${l.category}||${l.name}||${l.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  currentSource = srcLabel ?? "—";
  render();
  return allLinks.length;
};

// --- Init ---
const initEvents = (): void => {
  elSearch.addEventListener("input", () => {
    currentQuery = elSearch.value.trim();
    render();
  });
};

const main = async (): Promise<void> => {
  initEvents();
  render();

  try {
    const res = await fetch("./links.txt", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyRaw(await res.text(), "links.txt");
  } catch (e) {
    currentSource = "links.txt (load error)";
    render();
    console.error(e);
  }
};

main();
