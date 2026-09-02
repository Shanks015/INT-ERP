import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { toDDMMM, parseDDMMM } from '../utils/dateFormat';

/**
 * Date field that stores/parses only dd/MMM/yyyy (e.g. 02/Sep/2026).
 * Value is a JS Date (or null); a native calendar picker is offered via the
 * calendar button, and its choice is written back in dd/MMM/yyyy text.
 */
const ScholarsDateField = ({ value, onChange, required = false, className = '' }) => {
    const [text, setText] = useState('');
    const [invalid, setInvalid] = useState(false);
    const nativeRef = useRef(null);

    // Sync text when the Date value changes externally (edit prefill / clear)
    useEffect(() => {
        setText(value ? toDDMMM(value) : '');
        setInvalid(false);
    }, [value]);

    const syncFromText = (raw) => {
        setText(raw);
        if (!raw.trim()) {
            setInvalid(false);
            onChange(null);
            return;
        }
        const parsed = parseDDMMM(raw);
        setInvalid(!parsed);
        onChange(parsed); // may be null when invalid
    };

    const onNativePick = (e) => {
        const iso = e.target.value; // yyyy-mm-dd from the browser picker
        if (iso) {
            const [y, mo, d] = iso.split('-').map(Number);
            const date = new Date(y, mo - 1, d);
            setText(toDDMMM(date));
            setInvalid(false);
            onChange(date);
        }
        e.target.value = '';
    };

    const openPicker = () => {
        const el = nativeRef.current;
        if (!el) return;
        try {
            if (el.showPicker) { el.showPicker(); return; }
        } catch (err) { /* some browsers block programmatic open */ }
        el.focus();
    };

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="text"
                placeholder="dd/MMM/yyyy"
                className={`input input-bordered w-full pr-10 focus:input-primary transition-all ${invalid ? 'input-error' : ''} ${className}`}
                value={text}
                onChange={(e) => syncFromText(e.target.value)}
            />
            <button
                type="button"
                onClick={openPicker}
                tabIndex={-1}
                className="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Open calendar"
            >
                <Calendar size={16} className="text-base-content/60" />
            </button>
            <input
                ref={nativeRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', right: '2px', top: '50%', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                onChange={onNativePick}
            />
            {required && !text.trim() && (
                <label className="label py-0 mt-0.5"><span className="label-text-alt text-error">Required</span></label>
            )}
            {invalid && text.trim() && (
                <label className="label py-0 mt-0.5"><span className="label-text-alt text-error">Use dd/MMM/yyyy (e.g. 02/Sep/2026)</span></label>
            )}
        </div>
    );
};

export default ScholarsDateField;
