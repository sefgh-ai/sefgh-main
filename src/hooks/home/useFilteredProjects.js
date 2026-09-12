import { useMemo } from "react"

/**
 * Custom hook to filter projects by category and user preferences
 * @param {Array} allProjects - All available projects
 * @param {string} selectedCategory - Currently selected category filter
 * @param {Object} userPreferences - User's preference settings {tags: Array, mode: 'OR'|'AND'}
 * @returns {Array} Filtered projects based on category and preferences (memoized)
 */
export function useFilteredProjects(allProjects, selectedCategory, userPreferences) {
  return useMemo(() => {
    let filtered = [...allProjects]

    // Filter by selected category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((project) => {
        return (
          project.category === selectedCategory ||
          project.tags?.some((tag) => tag === selectedCategory)
        )
      })
    }

    // Apply preference filtering if preferences are set
    if (userPreferences.tags.length > 0) {
      const preferenceTagNames = userPreferences.tags.map((t) => t.name)

      if (userPreferences.mode === "OR") {
        filtered = filtered.filter((project) => {
          return (
            preferenceTagNames.includes(project.category) ||
            project.tags?.some((tag) => preferenceTagNames.includes(tag)) ||
            preferenceTagNames.includes(project.language)
          )
        })
      } else {
        filtered = filtered.filter((project) => {
          const projectTags = [
            project.category,
            ...(project.tags || []),
            project.language,
          ].filter(Boolean)

          return preferenceTagNames.every((prefTag) =>
            projectTags.includes(prefTag)
          )
        })
      }
    }

    return filtered
  }, [allProjects, selectedCategory, userPreferences])
}
