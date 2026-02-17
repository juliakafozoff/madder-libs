/**
 * Safely decode JWT token payload without logging sensitive data
 * Returns decoded payload or null if invalid
 */
export const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (second part)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    try {
      const decoded = JSON.parse(atob(padded));
      return decoded;
    } catch (e) {
      console.error('Failed to decode JWT payload:', e);
      return null;
    }
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Extract safe fields from JWT payload for logging
 */
export const getSafeJwtFields = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }
  
  return {
    aud: payload.aud,
    iss: payload.iss,
    azp: payload.azp,
    exp: payload.exp,
    iat: payload.iat,
    email: payload.email,
    // Don't log other sensitive fields
  };
};


