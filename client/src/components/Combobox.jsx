import { useId } from 'react';

/**
 * "Pick or type" input: a free-text field with <datalist> suggestions.
 * Typing a value that is not on the list is always allowed (never blocks entry),
 * matching the EventForm type-field pattern and the options.js legacy-value policy.
 *
 * Props: options (string[]), value, onChange(value), name, placeholder, required,
 *        className — all optional except options/value/onChange.
 */
const Combobox = ({ options = [], value, onChange, name, placeholder, required = false, className = '', autoComplete = 'off' }) => {
    const id = useId();
    const listId = `combobox-${id.replace(/:/g, '')}`;

    return (
        <>
            <input
                type="text"
                list={listId}
                name={name}
                value={value ?? ''}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete}
                className={className}
                onChange={(e) => onChange(e.target.value)}
            />
            {options.length > 0 && (
                <datalist id={listId}>
                    {options.map((opt) => (
                        <option key={opt} value={opt} />
                    ))}
                </datalist>
            )}
        </>
    );
};

export default Combobox;
