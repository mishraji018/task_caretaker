import { useMediaQuery } from './useMediaQuery';

/**
 * Returns the active layout mode:
 * - 'laptop': 1024px and above (desktop view: sidebar, centered task list, right detail panel)
 * - 'tablet': 768px to 1023.98px (collapsed icon sidebar, bottom sheet details)
 * - 'mobile': below 768px (bottom dock navigation, bottom sheet task add & details)
 *
 * @returns {'mobile' | 'tablet' | 'laptop'}
 */
export function useLayoutMode() {
    const isLaptop = useMediaQuery('(min-width: 1024px)');
    const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023.98px)');

    if (isLaptop) return 'laptop';
    if (isTablet) return 'tablet';
    return 'mobile';
}

export default useLayoutMode;

