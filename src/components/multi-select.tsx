"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

/**
 * A dropdown of checkable options with search and "add your own". Selected
 * values show as removable chips on the trigger. `keepOrder` sorts the chosen
 * values in option order (sizes); otherwise they stay in the order picked.
 */
export function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Choose…",
  keepOrder = false,
  allowCustom = true,
  customHint = "Add",
}: {
  id?: string;
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  keepOrder?: boolean;
  allowCustom?: boolean;
  customHint?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? `ms-${autoId}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    setTimeout(() => search.current?.focus(), 0);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const all = [...options, ...value.filter((v) => !options.some((o) => same(o, v)))];
  const isOn = (v: string) => value.some((x) => same(x, v));
  const ordered = (list: string[]) =>
    keepOrder ? [...list].sort((a, b) => indexIn(all, a) - indexIn(all, b)) : list;

  const toggle = (v: string) =>
    onChange(isOn(v) ? value.filter((x) => !same(x, v)) : ordered([...value, v]));

  const term = query.trim();
  const shown = all.filter((o) => o.toLowerCase().includes(term.toLowerCase()));
  const canAdd = allowCustom && term && !all.some((o) => same(o, term));

  const addCustom = () => {
    if (!canAdd) return;
    onChange(ordered([...value, keepOrder ? term.toUpperCase() : term]));
    setQuery("");
  };

  return (
    <div ref={root} className="relative">
      <label
        htmlFor={triggerId}
        className="block font-mono text-[10px] text-muted-foreground uppercase mb-1"
      >
        {label}
      </label>
      <button
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="flex min-h-[38px] w-full items-center gap-1.5 bg-muted px-2 py-1.5 text-left text-sm technical-border hover:border-foreground"
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {value.length === 0 && <span className="px-1 text-muted-foreground">{placeholder}</span>}
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-surface-container px-1.5 py-0.5 font-mono text-[11px] technical-border"
            >
              {v}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${v}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 technical-border bg-surface-lowest shadow-2xl"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="border-b border-border/30 p-2">
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  // Enter picks the first match ("navy" → Navy Blue); only
                  // when nothing matches does it add the typed value.
                  if (term && shown.length > 0) {
                    toggle(shown[0]);
                    setQuery("");
                  } else if (canAdd) addCustom();
                }
              }}
              aria-label={`Search ${label.toLowerCase()}`}
              placeholder={allowCustom ? "Search or type a new one…" : "Search…"}
              className="w-full bg-muted px-2 py-1.5 text-sm technical-border"
            />
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto py-1">
            {shown.map((o) => {
              const on = isOn(o);
              return (
                <li key={o} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(o)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center border ${
                        on
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-border"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    {o}
                  </button>
                </li>
              );
            })}
            {canAdd && (
              <li>
                <button
                  type="button"
                  onClick={addCustom}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-primary hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" /> {customHint} “
                  {keepOrder ? term.toUpperCase() : term}”
                </button>
              </li>
            )}
            {shown.length === 0 && !canAdd && (
              <li className="px-3 py-2 font-mono text-[11px] text-muted-foreground">No match.</li>
            )}
          </ul>
          <div className="flex items-center justify-between border-t border-border/30 px-3 py-2 font-mono text-[10px]">
            <span className="text-muted-foreground">{value.length} selected</span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => onChange(ordered(all))}
                className="text-primary hover:underline"
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-muted-foreground hover:underline"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-bold hover:underline"
              >
                DONE
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const indexIn = (list: string[], v: string) => {
  const i = list.findIndex((x) => same(x, v));
  return i === -1 ? list.length : i;
};
