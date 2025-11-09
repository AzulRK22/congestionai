"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { MapPin, LocateFixed, X } from "lucide-react";
import { usePlacesAutocomplete } from "@/lib/hooks/usePlacesAutocomplete";

const coordRe = /^@?-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

type Props = {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  allowMyLocation?: boolean;
  name?: string;
  id?: string;

  selfId: string; // "origin" | "dest"
  activeId?: string | null;
  setActiveId?: (id: string | null) => void;

  countryHint?: string[];
  onPicked?: () => void;
};

type Pred = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

export type AutocompleteInputRef = HTMLInputElement;

export const AutocompleteInput = forwardRef<HTMLInputElement, Props>(
  (
    {
      placeholder,
      value,
      onChange,
      allowMyLocation = false,
      name,
      id,
      selfId,
      activeId,
      setActiveId,
      countryHint = ["mx"],
      onPicked,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const { ready, preds, query, select, clear } =
      usePlacesAutocomplete(countryHint);

    const [openLocal, setOpenLocal] = useState(false);
    const [hi, setHi] = useState(-1);
    const q = value ?? "";
    const debounced = useDebounce(q, 220);

    const isActive = activeId ? activeId === selfId : true;
    const open = openLocal && isActive && preds.length > 0;

    const listId = `${id ?? selfId}-listbox`;
    const activeOptId =
      open && hi >= 0 ? `${selfId}-opt-${preds[hi].place_id}` : undefined;

    const suppressNextRef = useRef(false);

    useEffect(() => {
      if (!isActive) {
        setOpenLocal(false);
        return;
      }
      if (suppressNextRef.current) {
        suppressNextRef.current = false;
        setOpenLocal(false);
        clear();
        return;
      }
      const text = q.trim();
      const isCoord = coordRe.test(text);
      if (!ready || text.length < 3 || isCoord) {
        clear();
        setOpenLocal(false);
        return;
      }
      query(debounced);
      setOpenLocal(true);
      setHi(-1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced, q, ready, isActive]);

    usePointerDownOutside(containerRef, () => {
      if (openLocal) setOpenLocal(false);
      if (activeId === selfId) setActiveId?.(null);
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const v = e.target.value;
      if (coordRe.test(v) && !v.trim().startsWith("@"))
        onChange(`@${v.trim()}`);
      else onChange(v);
      if (v.trim().length < 3) {
        setOpenLocal(false);
        setActiveId?.(null);
      }
    }

    function handleSelect(text: string) {
      suppressNextRef.current = true;
      onChange(text);
      select(); // reset token + limpia preds
      setOpenLocal(false);
      setActiveId?.(null);
      setHi(-1);
      inputRef.current?.blur();
      onPicked?.();
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (!open || !preds.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((i) => (i + 1) % preds.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((i) => (i <= 0 ? preds.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        if (hi >= 0) {
          e.preventDefault();
          handleSelect((preds[hi] as Pred).description);
        }
      } else if (e.key === "Escape") {
        setOpenLocal(false);
        setActiveId?.(null);
        setHi(-1);
      }
    }

    function setMyLocation() {
      if (!navigator.geolocation) {
        alert("Activa permisos de ubicación");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange(
            `@${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`,
          );
          clear();
          setOpenLocal(false);
          setActiveId?.(null);
          onPicked?.();
        },
        () => alert("No se pudo obtener tu ubicación"),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    }

    return (
      <div
        ref={containerRef}
        className={`relative ${isActive ? "z-40" : "z-10"}`}
        onFocus={() => setActiveId?.(selfId)}
      >
        {/* Ícono izquierda */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <MapPin className="h-4 w-4 text-slate-400" />
        </div>

        <input
          ref={inputRef}
          id={id}
          name={name}
          value={q}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptId}
          onFocus={() => {
            setActiveId?.(selfId);
            if (preds.length) setOpenLocal(true);
          }}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-20 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus:border-slate-300"
        />

        {/* Botonera derecha */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowMyLocation && (
            <button
              type="button"
              onClick={setMyLocation}
              title="Usar mi ubicación"
              className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-[0_1px_0_rgba(0,0,0,.03)]"
            >
              <LocateFixed className="h-4 w-4 text-slate-700" />
            </button>
          )}
          {!!q && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                clear();
                setOpenLocal(false);
                setActiveId?.(selfId);
                inputRef.current?.focus();
              }}
              title="Limpiar"
              className="h-8 w-8 grid place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-[0_1px_0_rgba(0,0,0,.03)]"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
            <ul id={listId} role="listbox" className="max-h-72 overflow-auto">
              {(preds as Pred[]).map((p, i) => {
                const optId = `${selfId}-opt-${p.place_id}`;
                return (
                  <li
                    key={p.place_id}
                    id={optId}
                    role="option"
                    aria-selected={hi === i}
                    className={
                      i === preds.length - 1 ? "" : "border-b border-slate-100"
                    }
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // cierra antes del blur
                        handleSelect(p.description);
                      }}
                      onMouseEnter={() => setHi(i)}
                      onMouseLeave={() => setHi(-1)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[0.92rem] ${
                        hi === i ? "bg-slate-100" : "bg-white"
                      }`}
                    >
                      <span className="h-5 w-5 shrink-0 grid place-items-center rounded-full border border-slate-300 bg-slate-50">
                        <MapPin className="h-3 w-3 text-slate-500" />
                      </span>
                      <span className="truncate">
                        <b>
                          {p.structured_formatting?.main_text ?? p.description}
                        </b>{" "}
                        <span className="text-slate-500">
                          {p.structured_formatting?.secondary_text
                            ? `— ${p.structured_formatting.secondary_text}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  },
);
AutocompleteInput.displayName = "AutocompleteInput";

/* utils */
function useDebounce<T>(value: T, delay = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function usePointerDownOutside(
  ref: React.RefObject<HTMLElement>,
  onOutside: () => void,
) {
  useEffect(() => {
    const handler: EventListener = (e) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      onOutside();
    };

    // tipado correcto, sin any
    document.addEventListener("pointerdown", handler, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handler);
    };
  }, [ref, onOutside]);
}
