import { useMemo } from 'react';
import { normalizeText } from '../../utils/taskFilters';

/**
 * Escapes regex special characters safely.
 * @param {string} str
 * @returns {string}
 */
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights words in text that match any word in the search query.
 * Renders pure React nodes (never dangerouslySetInnerHTML).
 * Safe against all regex special characters.
 *
 * @param {object} props
 * @param {string} props.text
 * @param {string} props.query
 * @param {string} [props.className]
 */
export default function HighlightedText({ text = '', query = '', className = '' }) {
    const renderedNodes = useMemo(() => {
        if (!text || typeof text !== 'string') return '';
        if (!query || typeof query !== 'string') return text;

        const normalizedQuery = normalizeText(query);
        const words = normalizedQuery.split(' ').filter(Boolean);

        if (words.length === 0) return text;

        try {
            const escapedPattern = words.map(escapeRegExp).join('|');
            const regex = new RegExp(`(${escapedPattern})`, 'gi');
            const parts = text.split(regex);

            return parts.map((part, index) => {
                const isMatch = words.some((word) => normalizeText(word) === normalizeText(part));
                if (isMatch) {
                    return (
                        <mark
                            key={index}
                            className="bg-amber-400/30 dark:bg-amber-500/25 text-amber-950 dark:text-amber-200 px-0.5 rounded-xs font-medium"
                        >
                            {part}
                        </mark>
                    );
                }
                return part;
            });
        } catch {
            return text;
        }
    }, [text, query]);

    return <span className={className}>{renderedNodes}</span>;
}

