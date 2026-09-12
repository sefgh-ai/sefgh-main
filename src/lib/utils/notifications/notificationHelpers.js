// Re-export from shared utilities
export {
  getNotificationTypeIcon as getNotificationIcon,
  getNotificationTypeColor as getNotificationColor,
} from "@/lib/utils/colors";

export { formatRelativeTime as formatTimestamp } from "@/lib/utils/formatters";

export {
  saveToLocalStorage,
  loadFromLocalStorage,
  getUserStorageKey,
} from "@/lib/utils/localStorage";

// Import for internal use
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/utils/localStorage";

/**
 * Save notification-specific data to localStorage
 * @param {string} userId - User ID
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function saveNotificationData(userId, key, value) {
  const storageKey = `notifications_${key}_${userId}`;
  saveToLocalStorage(storageKey, value);
}

/**
 * Load notification-specific data from localStorage
 * @param {string} userId - User ID
 * @param {string} key - Storage key
 * @returns {any} Loaded value or empty array
 */
export function loadNotificationData(userId, key) {
  const storageKey = `notifications_${key}_${userId}`;
  return loadFromLocalStorage(storageKey, []);
}
