import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { COUNTRIES } from '../constants/options';

/**
 * Searchable country picker. Suggestions are filtered by PREFIX from the first
 * typed character (e.g. typing "z" shows countries starting with Z; typing
 * "ze" narrows to those starting with "ze"). Typing remains allowed so a value
 * that is not on the list is never lost — pick a suggestion to confirm it.
 */
const CountrySelect = ({ value, onChange, required = false }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const [hl, setHl] = useState(-1); // highlighted suggestion index
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    // Sync the input text when the value changes externally (edit prefill / clear)
    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Close when a click lands outside the whole control
    useEffect(() => {
        if (!open) return;
        const onDocMouseDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [open]);

    const q = query.trim().toLowerCase();
    let suggestions = q
        ? COUNTRIES.filter((c) => c.toLowerCase().startsWith(q))
        : COUNTRIES;

    // Editing a legacy value that isn't in the list: keep it reachable when the
    // box is empty so it can still be re-confirmed without being silently lost.
    if (!q && value && suggestions.indexOf(value) === -1) {
        suggestions = [value, ...suggestions];
    }
    suggestions = suggestions.slice(0, 60);

    useEffect(() => {
        setHl(-1);
    }, [q, open]);

    const pick = (country) => {
        onChange(country);
        setQuery(country);
        setOpen(false);
        setHl(-1);
    };

    const onType = (e) => {
        const v = e.target.value;
        setQuery(v);
        setOpen(true);
        onChange(v);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHl((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHl((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            if (open && hl >= 0 && suggestions[hl]) {
                e.preventDefault();
                pick(suggestions[hl]);
            } else if (open) {
                e.preventDefault();
                setOpen(false);
            }
            // When the dropdown is closed, Enter submits the form as normal.
        } else if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                setOpen(false);
            }
        }
    };

    // Bold the matched prefix so it's clear the filter starts at char one.
    const renderName = (country) => {
        if (!q) return country;
        const i = country.toLowerCase().indexOf(q);
        if (i < 0) return country;
        return (
            <>
                {country.slice(0, i)}
                <span className="font-semibold">{country.slice(i, i + q.length)}</span>
                {country.slice(i + q.length)}
            </>
        );
    };

    return (
        <div className="relative w-full" ref={rootRef}>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    placeholder="Type to search country…"
                    className="input input-bordered w-full pl-9 pr-9 focus:input-primary transition-all"
                    onChange={onType}
                    onFocus={() => { setOpen(true); }}
                    onKeyDown={onKeyDown}
                    required={required}
                    autoComplete="off"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Toggle country list"
                    onMouseDown={(e) => {
                        e.preventDefault(); // keep focus so the list doesn't close on toggle
                        setOpen((o) => !o);
                    }}
                    className="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2"
                >
                    <ChevronDown size={16} className={`text-base-content/60 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {open && (
                <ul className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-xl">
                    {suggestions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-base-content/50">
                            No matching countries
                        </li>
                    ) : (
                        suggestions.map((country, i) => (
                            <li
                                key={country}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(country);
                                }}
                                onMouseEnter={() => setHl(i)}
                                className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between transition-colors ${i === hl ? 'bg-primary/10' : ''}`}
                            >
                                <span>{renderName(country)}</span>
                                {value === country && <Check size={14} className="text-primary shrink-0" />}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default CountrySelect;
