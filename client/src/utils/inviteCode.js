/**
 * Generate a random 6-character invite code using uppercase letters and numbers
 * @returns {string} 6-character code (e.g., "7K3P9Q")
 */
export const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get or create a short code for a templateId
 * @param {string} templateId - The template ID (UUID)
 * @returns {string} Short code (6 characters)
 */
export const getOrCreateShortCode = (templateId) => {
  const inviteMap = JSON.parse(localStorage.getItem('inviteMap') || '{}');
  
  // Check if templateId already has a shortCode
  const existingEntry = Object.entries(inviteMap).find(([code, id]) => id === templateId);
  if (existingEntry) {
    return existingEntry[0]; // Return existing shortCode
  }
  
  // Generate new shortCode (ensure uniqueness)
  let shortCode;
  let attempts = 0;
  do {
    shortCode = generateShortCode();
    attempts++;
    // Prevent infinite loop (very unlikely but safe)
    if (attempts > 100) {
      throw new Error('Failed to generate unique short code');
    }
  } while (inviteMap[shortCode]); // Ensure code is unique
  
  // Save mapping
  inviteMap[shortCode] = templateId;
  localStorage.setItem('inviteMap', JSON.stringify(inviteMap));
  
  return shortCode;
};

/**
 * Get templateId from shortCode
 * @param {string} shortCode - The short invite code
 * @returns {string|null} Template ID or null if not found
 */
export const getTemplateIdFromShortCode = (shortCode) => {
  const inviteMap = JSON.parse(localStorage.getItem('inviteMap') || '{}');
  return inviteMap[shortCode] || null;
};

