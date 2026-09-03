/**
 * For a <select>, offer the standard list but never silently drop a stored value
 * that isn't part of it (legacy records) — append it as a one-off option.
 */
export const withCurrentOption = (options, current) =>
    current && options.indexOf(current) === -1 ? [...options, current] : options;
