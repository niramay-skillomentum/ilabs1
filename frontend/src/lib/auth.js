// ======================================
// Shared auth helpers — sessionStorage-based session management
// Avoids passing userId/fullName in URL query params (PII exposure)
// ======================================

/**
 * Get the stored JWT token from sessionStorage.
 */
export function getToken() {
  return sessionStorage.getItem("auth_token") || null;
}

/**
 * Build Authorization headers for API calls.
 */
export function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  };
}

/**
 * Save session data to sessionStorage after login.
 * @param {string} userId - User email
 * @param {string} fullName - User display name
 */
export function saveSession(userId, fullName) {
  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("fullName", fullName);
}

/**
 * Load userId from sessionStorage.
 * @returns {string|null}
 */
export function loadUserId() {
  return sessionStorage.getItem("userId");
}

/**
 * Load fullName from sessionStorage.
 * @returns {string|null}
 */
export function loadFullName() {
  return sessionStorage.getItem("fullName");
}

/**
 * Clear all session data from sessionStorage.
 */
export function clearSession() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("fullName");
}

/**
 * Check if user has an active session (token + userId present).
 * @returns {boolean}
 */
export function hasSession() {
  return !!(getToken() && loadUserId());
}
