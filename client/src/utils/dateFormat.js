import { useAuth } from '../context/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const asDate = (date) => (typeof date === 'string' ? new Date(date) : date);

/**
 * Format a date as dd/MMM/yyyy, e.g. 02/Sep/2026 (the project's canonical
 * date format). Returns '' for null/invalid input.
 */
export const toDDMMM = (date) => {
    const d = asDate(date);
    if (!d || isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

/**
 * Parse a dd/MMM/yyyy date string (also tolerates "-", ".", spaces and full
 * month names, e.g. "2-September-2026"). Returns a local Date or null.
 */
export const parseDDMMM = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    if (!s) return null;
    const m = s.match(/^(\d{1,2})[/\-.\s]+\s*([A-Za-z]{3,9})[/\-.\s]+\s*(\d{2,4})$/);
    if (m) {
        const day = +m[1];
        const mon = String(m[2]).slice(0, 3).toLowerCase();
        let year = +m[3];
        if (year < 100) year += 2000;
        if (MONTH_MAP[mon] !== undefined) {
            const d = new Date(year, MONTH_MAP[mon], day);
            if (d.getFullYear() === year && d.getMonth() === MONTH_MAP[mon] && d.getDate() === day) return d;
        }
        return null;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Format a date according to user preferences
 * @param {Date|string} date - The date to format
 * @param {string} formatOverride - Optional format override (default uses user preference)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatOverride = null) => {
    if (!date) return '';

    const dateObj = asDate(date);
    if (isNaN(dateObj.getTime())) return '';

    // Get format from override or default to MM/DD/YYYY
    const format = formatOverride || 'MM/DD/YYYY';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    switch (format) {
        case 'DD/MMM/YYYY':
            return toDDMMM(dateObj);
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
        default:
            return `${month}/${day}/${year}`;
    }
};

/**
 * Hook to get formatDate function with user's preference
 */
export const useDateFormat = () => {
    const { user } = useAuth();
    const userFormat = user?.preferences?.dateFormat || 'MM/DD/YYYY';

    return (date) => formatDate(date, userFormat);
};
