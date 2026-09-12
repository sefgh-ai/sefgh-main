/**
 * Get initial user preferences from localStorage
 * @returns {Object} User preferences with tags and mode
 */
export function getInitialPreferences() {
  if (typeof window === "undefined") return { tags: [], mode: "OR" }
  try {
    const saved = localStorage.getItem("projectPreferences")
    return saved ? JSON.parse(saved) : { tags: [], mode: "OR" }
  } catch {
    return { tags: [], mode: "OR" }
  }
}

/**
 * Clear saved user preferences from localStorage
 */
export function clearSavedPreferences() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("projectPreferences")
  }
}
