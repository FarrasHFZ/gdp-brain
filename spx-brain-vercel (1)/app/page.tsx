"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ================================================================
   TYPES
   ================================================================ */
interface Entry {
  id: string;
  raw: string;
  title: string;
  category: string;
  tags: string[];
  links: string[];
  createdAt: number;
  updatedAt: number;
}

/* ================================================================
   LOCAL CLASSIFICATION ENGINE (no API needed)
   ================================================================ */
interface CategoryRule {
  name: string;
  keywords: string[];
  weight: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    name: "EHA Revamp",
    keywords: [
      "eha", "exception handling", "liquidation", "ncr", "non-coherence",
      "aging", "no-match", "no match", "facility", "dc ", "gudang",
      "guideline", "sop eha", "parcel aging", "dispose", "disposal",
      "warehouse", "non awb no match", "eha revamp",
    ],
    weight: 1,
  },
  {
    name: "Fraud",
    keywords: [
      "fraud", "ghost received", "ghost receive", "cod diversion", "awb manipulation",
      "repack", "repacking", "gestun", "zombie account", "termination loop",
      "fms sharing", "pda sharing", "at kosong", "hvi", "barhal",
      "mo category", "modus operandi", "investigasi", "manipulasi",
      "parcel swap", "l&d tracker", "detection tracker", "fake",
      "curang", "penipuan", "pencurian", "stolen", "hilang",
    ],
    weight: 1.2,
  },
  {
    name: "Non-AWB Matching",
    keywords: [
      "non-awb", "non awb", "match rate", "matching", "image matching",
      "variant mismatch", "zero result", "data pool", "partial match",
      "sku description", "ai matching", "algorithm", "matching system",
      "awb match", "unmatched parcel", "matched parcel",
    ],
    weight: 1,
  },
  {
    name: "Ops Process",
    keywords: [
      "hub", "sorting", "delivery", "pickup", "sic ", "weighing",
      "to bag", "yos", "first mile", "last mile", "mid mile",
      "inbound", "outbound", "sortir", "proses operasional",
      "driver", "kurir", "fleet", "route", "manifest",
      "operational", "operasional", "sprinter",
    ],
    weight: 1,
  },
  {
    name: "Returns & Refunds",
    keywords: [
      "return", "refund", "buyer claim", "cs ", "customer service",
      "retur", "pengembalian", "claim", "klaim", "complaint",
      "escalation", "eskalasi", "return rate", "rts", "return to seller",
    ],
    weight: 1,
  },
  {
    name: "Data & BI",
    keywords: [
      "tracker", "dashboard", "data", "formula", "spreadsheet",
      "google sheets", "bi ", "analytics", "reporting", "metric",
      "kpi", "query", "sql", "sumifs", "byrow", "lambda",
      "visualization", "chart", "grafik",
    ],
    weight: 0.9,
  },
  {
    name: "Strategy",
    keywords: [
      "initiative", "project", "stakeholder", "cross-functional",
      "roadmap", "timeline", "milestone", "okr", "objective",
      "strategy", "strategic", "planning", "priorit", "alignment",
      "workstream", "deck", "presentation", "proposal", "pitch",
      "pyramid principle", "issue tree", "mece",
    ],
    weight: 0.9,
  },
];

const TAG_DICTIONARY: Record<string, string[]> = {
  "match-rate": ["match rate", "matching rate", "match accuracy"],
  "ghost-received": ["ghost received", "ghost receive"],
  "cod-diversion": ["cod diversion", "cod fraud"],
  "awb-manipulation": ["awb manipulation", "awb fraud", "awb palsu"],
  "ncr": ["ncr", "non-coherence", "non coherence"],
  "partial-match": ["partial match", "partial matching"],
  "eha": ["eha", "exception handling area"],
  "liquidation": ["liquidation", "liquidasi", "dispose"],
  "repack-fraud": ["repack", "repacking"],
  "gestun": ["gestun"],
  "hvi": ["hvi", "high value item"],
  "barhal": ["barhal"],
  "zombie-account": ["zombie account", "zombie"],
  "termination-loop": ["termination loop"],
  "hub-ops": ["hub ", "hub ops", "hub operation"],
  "sorting": ["sorting", "sortir", "sortasi"],
  "first-mile": ["first mile", "fm "],
  "last-mile": ["last mile", "lm ", "delivery"],
  "mid-mile": ["mid mile", "mm ", "linehaul"],
  "return-rate": ["return rate", "retur rate"],
  "buyer-claim": ["buyer claim", "klaim buyer"],
  "cs-escalation": ["escalation", "eskalasi"],
  "data-pipeline": ["pipeline", "etl", "data flow"],
  "google-sheets": ["google sheets", "spreadsheet", "sheets formula"],
  "dashboard": ["dashboard", "tableau", "looker"],
  "issue-tree": ["issue tree", "mece", "problem decomposition"],
  "pyramid-principle": ["pyramid principle", "storyline"],
  "stakeholder": ["stakeholder", "cross-functional"],
  "project-management": ["initiative", "workstream", "milestone", "roadmap"],
  "sic": ["sic ", "sic quarterly"],
  "pda": ["pda", "fms"],
  "driver": ["driver", "kurir", "sprinter"],
  "image-matching": ["image matching", "image algorithm", "foto matching"],
  "sku": ["sku", "sku description"],
  "parcel-aging": ["aging", "parcel aging", "aging day"],
  "stuck-package": ["stuck package", "stuck parcel"],
  "lost-package": ["lost package", "lost parcel", "paket hilang"],
  "cod": ["cod ", "cash on delivery"],
  "rts": ["rts", "return to sender", "return to seller"],
};

function classifyLocally(text: string): { category: string; tags: string[] } {
  const lower = text.toLowerCase();

  // Score each category
  const scores: Record<string, number> = {};
  CATEGORY_RULES.forEach((rule) => {
    let score = 0;
    rule.keywords.forEach((kw) => {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = lower.match(regex);
      if (matches) score += matches.length * rule.weight;
    });
    if (score > 0) scores[rule.name] = score;
  });

  const category =
    Object.keys(scores).length > 0
      ? Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0]
      : "General";

  // Extract tags
  const tags: string[] = [];
  Object.entries(TAG_DICTIONARY).forEach(([tag, phrases]) => {
    for (const phrase of phrases) {
      if (lower.includes(phrase.toLowerCase())) {
        tags.push(tag);
        break;
      }
    }
  });

  // If few tags found, extract capitalized terms and noun-like words
  if (tags.length < 2) {
    const words = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
    const stopwords = new Set(["This", "That", "Then", "When", "What", "They", "There", "These", "Those", "From", "With", "About", "Have", "Been", "Will", "Would", "Could", "Should", "Also", "Just", "Like", "Some", "Very", "More", "Most", "Into", "Over", "After", "Before"]);
    words.forEach((w) => {
      if (!stopwords.has(w) && tags.length < 6) {
        const tag = w.toLowerCase();
        if (!tags.includes(tag)) tags.push(tag);
      }
    });
  }

  return { category, tags: tags.slice(0, 6) };
}

function generateTitle(text: string): string {
  // Take first line, clean it up
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 80) return firstLine;
  // Cut at word boundary
  const cut = firstLine.slice(0, 77);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "...";
}

// Simple text similarity for auto-linking
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  a.forEach((w) => { if (b.has(w)) intersection++; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function findRelatedEntries(
  newText: string,
  newTags: string[],
  newCategory: string,
  entries: Entry[]
): string[] {
  if (entries.length === 0) return [];

  const newTokens = tokenize(newText);
  const scored: { id: string; score: number }[] = [];

  entries.forEach((e) => {
    let score = 0;

    // Text similarity (Jaccard)
    const eTokens = tokenize(e.raw);
    score += jaccardSimilarity(newTokens, eTokens) * 3;

    // Tag overlap
    const tagOverlap = (e.tags || []).filter((t) => newTags.includes(t)).length;
    score += tagOverlap * 0.8;

    // Same category bonus
    if (e.category === newCategory) score += 0.5;

    if (score > 0.3) scored.push({ id: e.id, score });
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.id);
}

/* ================================================================
   CONSTANTS & HELPERS
   ================================================================ */
const CAT_STYLES: Record<string, { bg: string; color: string }> = {
  "EHA Revamp": { bg: "var(--accent-soft)", color: "var(--accent-text)" },
  Fraud: { bg: "var(--red-soft)", color: "var(--red-text)" },
  "Non-AWB Matching": { bg: "var(--blue-soft)", color: "var(--blue-text)" },
  "Ops Process": { bg: "var(--green-soft)", color: "var(--green-text)" },
  "Returns & Refunds": { bg: "var(--amber-soft)", color: "var(--amber-text)" },
  "Data & BI": { bg: "var(--pink-soft)", color: "var(--pink-text)" },
  Strategy: { bg: "var(--teal-soft)", color: "var(--teal-text)" },
  General: { bg: "var(--surface-3)", color: "var(--text-2)" },
};

const DB_KEY = "spx_brain_entries";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function fmtDateFull(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getCatStyle(cat: string) {
  return CAT_STYLES[cat] || CAT_STYLES["General"];
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = useCallback((data: Entry[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  }, []);

  function toast(msg: string) {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2800);
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 300) + "px";
  }

  /* ─── Submit ──────────────────────────────────────────────── */
  function submitEntry() {
    const raw = inputText.trim();
    if (!raw) return;

    const { category, tags } = classifyLocally(raw);
    const title = generateTitle(raw);

    if (editingId) {
      // Editing existing entry
      const oldEntry = entries.find((e) => e.id === editingId);
      if (!oldEntry) return;

      // Remove old backlinks
      const cleaned = entries.map((e) => {
        if (e.id === editingId) return e;
        return { ...e, links: e.links.filter((l) => l !== editingId) };
      });

      const others = cleaned.filter((e) => e.id !== editingId);
      const linkedIds = findRelatedEntries(raw, tags, category, others);

      const updated: Entry = {
        ...oldEntry, raw, title, category, tags,
        links: linkedIds, updatedAt: Date.now(),
      };

      const withBacklinks = others.map((e) => {
        if (linkedIds.includes(e.id) && !e.links.includes(editingId!)) {
          return { ...e, links: [...e.links, editingId!] };
        }
        return e;
      });

      const idx = entries.findIndex((e) => e.id === editingId);
      const newEntries = [...withBacklinks];
      newEntries.splice(idx, 0, updated);

      setEntries(newEntries);
      persist(newEntries);
      setEditingId(null);
      toast(`Updated → ${category}`);
    } else {
      // New entry
      const entry: Entry = {
        id: genId(), raw, title, category, tags,
        links: [], createdAt: Date.now(), updatedAt: Date.now(),
      };

      const linkedIds = findRelatedEntries(raw, tags, category, entries);
      entry.links = linkedIds;

      const withBacklinks = entries.map((e) => {
        if (linkedIds.includes(e.id) && !e.links.includes(entry.id)) {
          return { ...e, links: [...e.links, entry.id] };
        }
        return e;
      });

      const newEntries = [entry, ...withBacklinks];
      setEntries(newEntries);
      persist(newEntries);

      const lc = linkedIds.length;
      toast(`Saved → ${category}${lc ? ` · ${lc} connection${lc > 1 ? "s" : ""} found` : ""}`);
    }

    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  /* ─── Edit ────────────────────────────────────────────────── */
  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setInputText(entry.raw);
    setSelectedEntry(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + "px";
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }

  function cancelEdit() {
    setEditingId(null);
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  /* ─── Delete ──────────────────────────────────────────────── */
  function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    const newEntries = entries
      .filter((e) => e.id !== id)
      .map((e) => ({ ...e, links: e.links.filter((l) => l !== id) }));
    setEntries(newEntries);
    persist(newEntries);
    setSelectedEntry(null);
    toast("Deleted");
  }

  /* ─── Reclassify ──────────────────────────────────────────── */
  function reclassifyEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    // Remove old backlinks
    const cleaned = entries.map((e) => {
      if (e.id === id) return e;
      return { ...e, links: e.links.filter((l) => l !== id) };
    });

    const { category, tags } = classifyLocally(entry.raw);
    const others = cleaned.filter((e) => e.id !== id);
    const linkedIds = findRelatedEntries(entry.raw, tags, category, others);

    const updated: Entry = {
      ...entry, category, tags, links: linkedIds, updatedAt: Date.now(),
    };

    const withBacklinks = others.map((e) => {
      if (linkedIds.includes(e.id) && !e.links.includes(id)) {
        return { ...e, links: [...e.links, id] };
      }
      return e;
    });

    const idx = entries.findIndex((e) => e.id === id);
    const newEntries = [...withBacklinks];
    newEntries.splice(idx, 0, updated);

    setEntries(newEntries);
    persist(newEntries);
    setSelectedEntry(updated);
    toast(`Reclassified → ${category}`);
  }

  /* ─── Export / Import ─────────────────────────────────────── */
  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ entries, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spx-brain-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${entries.length} entries`);
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const imported = data.entries || data;
          if (!Array.isArray(imported)) throw new Error();
          const existingIds = new Set(entries.map((e) => e.id));
          let added = 0;
          const newEntries = [...entries];
          imported.forEach((e: Entry) => {
            if (!existingIds.has(e.id)) { newEntries.push(e); added++; }
          });
          setEntries(newEntries);
          persist(newEntries);
          toast(`${added} entries imported`);
        } catch { alert("Invalid file"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ─── Derived ─────────────────────────────────────────────── */
  const catCounts: Record<string, number> = {};
  entries.forEach((e) => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
  const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
  const totalLinks = entries.reduce((s, e) => s + e.links.length, 0);

  let filtered = entries;
  if (activeFilter) filtered = filtered.filter((e) => e.category === activeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((e) => {
      const hay = `${e.title} ${e.raw} ${e.tags.join(" ")} ${e.category}`.toLowerCase();
      return hay.includes(q);
    });
  }

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <>
      {/* Toast */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%",
        transform: `translateX(-50%) translateY(${showToast ? 0 : 80}px)`,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "12px 20px", fontSize: 13,
        zIndex: 999, opacity: showToast ? 1 : 0, transition: "all 0.3s ease",
        pointerEvents: "none", whiteSpace: "nowrap",
      }}>
        {toastMsg}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <header style={{
          padding: "24px 0 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0,
          background: "var(--bg)", zIndex: 100, borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, background: "var(--accent)",
              borderRadius: "var(--radius-sm)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#fff",
            }}>S</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>SPX Brain</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {entries.length} entries · {Math.round(totalLinks / 2)} connections
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn title="Import" onClick={importData}>↑</Btn>
            <Btn title="Export" onClick={exportData}>↓</Btn>
          </div>
        </header>

        {/* Capture box */}
        <div style={{
          margin: "20px 0", background: editingId ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${editingId ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius)", overflow: "hidden",
        }}>
          {editingId && (
            <div style={{
              padding: "8px 18px", background: "var(--accent-soft)",
              fontSize: 12, color: "var(--accent-text)", display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <span>Editing entry</span>
              <button onClick={cancelEdit} style={{
                background: "none", border: "none", color: "var(--accent-text)",
                cursor: "pointer", fontSize: 12, textDecoration: "underline",
              }}>Cancel</button>
            </div>
          )}
          <textarea
            ref={textareaRef} value={inputText} onChange={handleInput}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitEntry(); }}
            placeholder="Dump anything — a finding, a thought, a process note, a meeting takeaway..."
            rows={2}
            style={{
              width: "100%", background: "transparent", border: "none",
              color: "var(--text)", fontSize: 15, lineHeight: 1.65,
              padding: "16px 18px 8px", resize: "none", minHeight: 56,
              maxHeight: 300, outline: "none",
            }}
          />
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "8px 12px 12px",
          }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {inputText.length} chars · Ctrl+Enter to save
            </span>
            <button onClick={submitEntry} disabled={!inputText.trim()} style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: "var(--radius-sm)", padding: "8px 20px",
              fontSize: 13, fontWeight: 600,
              cursor: !inputText.trim() ? "not-allowed" : "pointer",
              opacity: !inputText.trim() ? 0.4 : 1,
            }}>
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>

        {/* Category chips */}
        {entries.length > 0 && (
          <div style={{
            display: "flex", gap: 8, marginBottom: 16,
            overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2,
          }}>
            <Chip active={!activeFilter} onClick={() => setActiveFilter(null)}>
              All <b>{entries.length}</b>
            </Chip>
            {sortedCats.map((cat) => (
              <Chip key={cat} active={activeFilter === cat}
                onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}>
                {cat} <b>{catCounts[cat]}</b>
              </Chip>
            ))}
          </div>
        )}

        {/* Search */}
        {entries.length > 0 && (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)", color: "var(--text-3)",
              fontSize: 16, pointerEvents: "none",
            }}>⌕</span>
            <input type="text" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your knowledge..."
              style={{
                width: "100%", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                padding: "10px 14px 10px 40px", fontSize: 14,
                color: "var(--text)", outline: "none",
              }}
            />
          </div>
        )}

        {/* Entries */}
        <div style={{ paddingBottom: 100 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-3)" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◇</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
                {entries.length === 0 ? "Your knowledge bank is empty" : "No matches found"}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
                {entries.length === 0
                  ? "Start typing above. It auto-categorizes, tags, and links your entries."
                  : "Try a different search or clear the filter."}
              </div>
            </div>
          )}

          {filtered.map((entry) => (
            <div key={entry.id} onClick={() => setSelectedEntry(entry)} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px 18px",
              marginBottom: 10, cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: 12, marginBottom: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
                  {entry.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", marginTop: 2 }}>
                  {fmtDate(entry.createdAt)}
                </div>
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-2)", lineHeight: 1.6,
                display: "-webkit-box", WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap",
              }}>
                {entry.raw}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <CatPill cat={entry.category} />
                {entry.tags.slice(0, 4).map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
                {entry.links.length > 0 && (
                  <Tag>⟁ {entry.links.length}</Tag>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selectedEntry && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setSelectedEntry(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)", zIndex: 200, display: "flex",
            alignItems: "flex-end", justifyContent: "center",
          }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "12px 12px 0 0", width: "100%", maxWidth: 720,
            maxHeight: "85dvh", overflowY: "auto", padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedEntry(null)} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-2)", fontSize: 18,
              }}>✕</button>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.35 }}>
              {selectedEntry.title}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
              {fmtDateFull(selectedEntry.createdAt)}
              {selectedEntry.updatedAt !== selectedEntry.createdAt &&
                ` · updated ${fmtDateFull(selectedEntry.updatedAt)}`}
            </div>

            <div style={{ marginBottom: 12 }}>
              <CatPill cat={selectedEntry.category} size="md" />
            </div>

            <div style={{
              fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: 16,
            }}>
              {selectedEntry.raw}
            </div>

            {selectedEntry.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Tags</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedEntry.tags.map((t) => (
                    <span key={t} onClick={() => { setSelectedEntry(null); setSearchQuery(t); }}
                      style={{
                        fontSize: 12, padding: "4px 12px", borderRadius: 999,
                        background: "var(--surface-3)", color: "var(--text-2)", cursor: "pointer",
                      }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedEntry.links.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>Connected entries ({selectedEntry.links.length})</SectionLabel>
                {selectedEntry.links.map((lid) => {
                  const le = entries.find((e) => e.id === lid);
                  if (!le) return null;
                  return (
                    <div key={lid} onClick={() => setSelectedEntry(le)} style={{
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "10px 14px",
                      marginBottom: 6, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CatPill cat={le.category} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{le.title}</span>
                      </div>
                      <div style={{
                        fontSize: 12, color: "var(--text-3)", marginTop: 4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{le.raw.slice(0, 120)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{
              display: "flex", gap: 8, marginTop: 20, paddingTop: 16,
              borderTop: "1px solid var(--border)", flexWrap: "wrap",
            }}>
              <ModalBtn onClick={() => startEdit(selectedEntry)}>✎ Edit</ModalBtn>
              <ModalBtn onClick={() => reclassifyEntry(selectedEntry.id)}>↻ Reclassify</ModalBtn>
              <button onClick={() => deleteEntry(selectedEntry.id)} style={{
                padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: 13,
                fontWeight: 500, cursor: "pointer", background: "var(--red-soft)",
                color: "var(--red-text)", border: "none",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================
   SMALL COMPONENTS
   ================================================================ */
function Btn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 36, height: 36, borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)", background: "var(--surface)",
      color: "var(--text-2)", cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: 18,
    }}>{children}</button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "var(--accent-soft)" : "var(--surface)",
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 999, padding: "6px 14px", fontSize: 13,
      color: active ? "var(--accent-text)" : "var(--text-2)",
      whiteSpace: "nowrap", cursor: "pointer", display: "flex",
      alignItems: "center", gap: 6, flexShrink: 0,
    }}>{children}</button>
  );
}

function CatPill({ cat, size = "sm" }: { cat: string; size?: "sm" | "md" }) {
  const s = getCatStyle(cat);
  return (
    <span style={{
      fontSize: size === "md" ? 12 : 11, padding: size === "md" ? "4px 14px" : "3px 10px",
      borderRadius: 999, fontWeight: 600, letterSpacing: 0.3,
      textTransform: "uppercase", background: s.bg, color: s.color,
    }}>{cat}</span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 999,
      background: "var(--surface-3)", color: "var(--text-2)",
    }}>{children}</span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, color: "var(--text-3)", textTransform: "uppercase",
      letterSpacing: 0.8, fontWeight: 600, marginBottom: 8,
    }}>{children}</div>
  );
}

function ModalBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: "var(--radius-sm)", fontSize: 13,
      fontWeight: 500, cursor: "pointer", background: "transparent",
      color: "var(--text-2)", border: "1px solid var(--border)",
    }}>{children}</button>
  );
}
