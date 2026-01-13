import { useAuth } from '../context/AuthContext';

/**
 * Format a date according to user preferences
 * @param {Date|string} date - The date to format
 * @param {string} formatOverride - Optional format override (default uses user preference)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatOverride = null) => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    // Get format from override or default to MM/DD/YYYY
    const format = formatOverride || 'MM/DD/YYYY';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    switch (format) {
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
