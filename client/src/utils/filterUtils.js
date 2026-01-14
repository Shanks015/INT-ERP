/**
 * Helper function to get case-insensitive unique values from an array of objects
 * Prevents duplicates like "MoU" and "mou" from appearing as separate dropdown options
 * 
 * @param {Array} items - Array of objects
 * @param {string} field - Field name to extract unique values from
 * @returns {Array} Sorted array of unique values (preserving original capitalization of first occurrence)
 */
export const getCaseInsensitiveUnique = (items, field) => {
    const map = new Map();
    items.forEach(item => {
        if (item[field]) {
            const normalized = item[field].toLowerCase();
            if (!map.has(normalized)) {
                map.set(normalized, item[field]);
            }
        }
    });
    return Array.from(map.values()).sort();
};
