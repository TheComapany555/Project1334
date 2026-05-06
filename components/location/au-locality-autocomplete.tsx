"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AuResolvedPlace = {
  suburb: string;
  state: string;
  postcode: string;
};

type ApiSuggestion = {
  id: string;
  label: string;
  secondary?: string;
  suburb: string;
  state: string;
  postcode: string;
};

type Props = {
  id?: string;
  /** For native form submit (e.g. search GET form). */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onResolved?: (place: AuResolvedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  /** Shown when the server has no Geoapify key configured. */
  fallbackHint?: string;
};

const DEBOUNCE_MS = 280;
const MIN_QUERY = 2;

/**
 * Australian suburb / city autocomplete via `/api/places/autocomplete` (Geoapify on the server).
 * No Google Maps / Places on the client.
 */
export function AuLocalityAutocomplete({
  id: idProp,
  name,
  value,
  onChange,
  onBlur,
  onResolved,
  placeholder = "Start typing a suburb or city…",
  disabled,
  className,
  maxLength,
  fallbackHint = "Set GEOAPIFY_API_KEY on the server for suburb suggestions (Geoapify).",
}: Props) {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const id = idProp ?? `au-locality-${reactId}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/places/autocomplete")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(j.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [predictions, setPredictions] = useState<ApiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async (input: string, myReq: number) => {
    if (input.trim().length < MIN_QUERY) {
      if (myReq === reqId.current) {
        setPredictions([]);
        setOpen(false);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/places/autocomplete?q=${encodeURIComponent(input.trim())}`,
      );
      const json = (await res.json()) as {
        configured?: boolean;
        results?: ApiSuggestion[];
        error?: string;
      };
      if (myReq !== reqId.current) return;
      if (typeof json.configured === "boolean") {
        setConfigured(json.configured);
      }
      if (json.configured === false) {
        setPredictions([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      const list = Array.isArray(json.results) ? json.results : [];
      setPredictions(list);
      setOpen(list.length > 0);
      setActiveIndex(-1);
      setLoading(false);
      if (json.error) setError(json.error);
    } catch (e) {
      if (myReq !== reqId.current) return;
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      setError(e instanceof Error ? e.message : "Could not load suggestions");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      reqId.current += 1;
      const myReq = reqId.current;
      void fetchPredictions(value, myReq);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [value, fetchPredictions]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const pickPrediction = useCallback(
    async (p: ApiSuggestion) => {
      onChange(p.suburb);
      let postcode = p.postcode;
      const state = p.state;
      // City-level autocomplete hits often omit postcode; forward-geocode once to fill it.
      if (!postcode && p.suburb.trim()) {
        try {
          const qs = new URLSearchParams({ suburb: p.suburb.trim() });
          if (state) qs.set("state", state);
          const res = await fetch(`/api/places/postcode?${qs.toString()}`);
          if (res.ok) {
            const j = (await res.json()) as { postcode?: string | null };
            if (j.postcode) postcode = j.postcode;
          }
        } catch {
          /* ignore */
        }
      }
      onResolved?.({
        suburb: p.suburb,
        state,
        postcode,
      });
      setOpen(false);
      setPredictions([]);
    },
    [onChange, onResolved],
  );

  const showCombobox = configured !== false;

  if (configured === false) {
    return (
      <div className="space-y-1">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          maxLength={maxLength}
          autoComplete="address-level2"
        />
        {fallbackHint ? (
          <p className="text-[11px] text-muted-foreground">{fallbackHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        {showCombobox && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={maxLength}
          onFocus={() => {
            if (predictions.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || !predictions.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) =>
                i < predictions.length - 1 ? i + 1 : 0,
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) =>
                i > 0 ? i - 1 : predictions.length - 1,
              );
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              void pickPrediction(predictions[activeIndex]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(showCombobox && "pl-9")}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            …
          </span>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-destructive">{error}</p>
      )}

      {open && predictions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        >
          {predictions.map((p, idx) => (
            <li key={`${listboxId}-opt-${idx}`} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/80",
                  idx === activeIndex && "bg-muted",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pickPrediction(p)}
              >
                <span className="font-medium text-foreground">{p.label}</span>
                {p.secondary && (
                  <span className="text-xs text-muted-foreground">{p.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
