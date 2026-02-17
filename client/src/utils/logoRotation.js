// Shared utility for Glad Libs logo rotation
// All pages use the same storage key to stay in sync

export const LOGO_STORAGE_KEY = "gladlibs_logo_idx";
export const LOGO_COUNT = 4; // Total number of logo images

/**
 * Get the current logo index from localStorage
 * @returns {number} Current index (0-3), defaults to 0 if not set
 */
export const getLogoIndex = () => {
  const stored = localStorage.getItem(LOGO_STORAGE_KEY);
  if (stored !== null) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < LOGO_COUNT) {
      return parsed;
    }
  }
  return 0;
};

/**
 * Set the logo index in localStorage
 * @param {number} index - The index to set (0-3)
 */
export const setLogoIndex = (index) => {
  if (index >= 0 && index < LOGO_COUNT) {
    localStorage.setItem(LOGO_STORAGE_KEY, index.toString());
    // Dispatch custom event to notify all RotatingLogo components
    window.dispatchEvent(new CustomEvent("gladlibs:logo-rotated", { detail: { index } }));
  }
};

/**
 * Advance to the next logo index (wraps around)
 * @returns {number} The new index after advancing
 */
export const advanceLogoIndex = () => {
  const currentIndex = getLogoIndex();
  const nextIndex = (currentIndex + 1) % LOGO_COUNT;
  setLogoIndex(nextIndex);
  return nextIndex;
};

