/**
 * Get color classes for notification types
 * @param {string} type - Notification type: "success", "warning", "error", "info"
 * @returns {string} Tailwind CSS classes for the notification type
 */
export function getNotificationTypeColor(type) {
  const colors = {
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    error: "text-red-500 bg-red-500/10 border-red-500/20",
    info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  };
  return colors[type] || colors.info;
}

/**
 * Get icon for notification type
 * @param {string} type - Notification type
 * @returns {string} Icon character
 */
export function getNotificationTypeIcon(type) {
  const icons = {
    success: "✓",
    warning: "⚠",
    error: "✕",
    info: "ℹ",
  };
  return icons[type] || icons.info;
}

/**
 * Get color for programming language
 * @param {string} language - Programming language name
 * @returns {string} Hex color code
 */
export function getLanguageColor(language) {
  const colors = {
    javascript: "#f1e05a",
    typescript: "#2b7489",
    python: "#3572A5",
    java: "#b07219",
    go: "#00ADD8",
    rust: "#dea584",
    ruby: "#701516",
    php: "#4F5D95",
    "c++": "#f34b7d",
    "c#": "#178600",
    swift: "#ffac45",
    kotlin: "#A97BFF",
    dart: "#00B4AB",
    scala: "#c22d40",
    html: "#e34c26",
  };
  return colors[language?.toLowerCase()] || "#8b949e";
}

/**
 * The badge for a trending repository's heat level, which the trending API
 * derives from its real stars per day (3 from 100 a day, 2 from 25). The
 * card used to pass this level to a version that expected a star count, so
 * every repository showed the lowest badge (bug register R-020).
 * @param {number} heatLevel - 1, 2 or 3
 * @returns {Object} Heat indicator with color and label
 */
export function getHeatIndicator(heatLevel) {
  if (heatLevel >= 3) return { color: "text-orange-500", label: "🔥 Hot" };
  if (heatLevel === 2) return { color: "text-yellow-500", label: "📈 Trending" };
  return { color: "text-green-500", label: "⬆️ Rising" };
}
