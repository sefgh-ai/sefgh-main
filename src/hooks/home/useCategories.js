import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/error-tracking";

/**
 * Custom hook to fetch and manage categories from Supabase with real-time updates
 * @param {string} type - Filter by category type (optional: 'programming', 'technology', 'application', 'other', 'custom')
 * @returns {Object} result
 * @returns {Array} result.categories - Array of category objects
 * @returns {boolean} result.loading - Loading state indicator
 * @returns {Function} result.addCategory - Function to add a new category
 * @returns {Function} result.updateCategory - Function to update a category
 * @returns {Function} result.deleteCategory - Function to deactivate a category
 * @returns {Function} result.refreshCategories - Function to manually refresh categories
 */
export function useCategories(type = null) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Fetch categories from Supabase with real-time subscription
  useEffect(() => {
    let channel;
    isMountedRef.current = true;

    const fetchCategories = async () => {
      try {
        let query = supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("usage_count", { ascending: false })
          .order("name", { ascending: true });

        // Apply type filter if specified
        if (type) {
          query = query.eq("type", type);
        }

        const { data, error } = await query;

        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        if (error) {
          console.error("Error fetching categories:", error);
          logError("categories_fetch_failed", error, { type });
        } else if (data) {
          setCategories(data);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Error fetching categories:", error);
        logError("categories_fetch_failed", error, { type });
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    // Timeout to ensure loading doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.warn(
          "[useCategories] Loading timeout - forcing loading to false"
        );
        setLoading(false);
      }
    }, 5000);

    // Initial fetch
    fetchCategories();

    // Set up real-time subscription
    channel = supabase
      .channel("categories-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "categories",
        },
        (payload) => {
          if (!isMountedRef.current) return;
          console.log("Real-time category change:", payload);

          if (payload.eventType === "INSERT") {
            // Add new category if it's active and matches type filter
            if (payload.new.is_active && (!type || payload.new.type === type)) {
              setCategories((prev) =>
                [...prev, payload.new].sort((a, b) => {
                  // Sort by usage_count desc, then by name asc
                  if (b.usage_count !== a.usage_count) {
                    return b.usage_count - a.usage_count;
                  }
                  return a.name.localeCompare(b.name);
                })
              );
            }
          } else if (payload.eventType === "UPDATE") {
            // Update existing category or remove if deactivated
            if (payload.new.is_active && (!type || payload.new.type === type)) {
              setCategories((prev) =>
                prev
                  .map((cat) => (cat.id === payload.new.id ? payload.new : cat))
                  .sort((a, b) => {
                    if (b.usage_count !== a.usage_count) {
                      return b.usage_count - a.usage_count;
                    }
                    return a.name.localeCompare(b.name);
                  })
              );
            } else {
              setCategories((prev) =>
                prev.filter((cat) => cat.id !== payload.new.id)
              );
            }
          } else if (payload.eventType === "DELETE") {
            // Remove deleted category
            setCategories((prev) =>
              prev.filter((cat) => cat.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      isMountedRef.current = false;
      clearTimeout(loadingTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, type]);

  // Function to add a new category
  const addCategory = async (
    name,
    icon,
    categoryType = "custom",
    description = ""
  ) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            name,
            icon,
            type: categoryType,
            description,
            usage_count: 0,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error adding category:", error);
        logError("category_add_failed", error, { name });
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error adding category:", error);
      return { success: false, error: error.message };
    }
  };

  // Function to update a category
  const updateCategory = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating category:", error);
        logError("category_update_failed", error, { id });
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating category:", error);
      return { success: false, error: error.message };
    }
  };

  // Function to deactivate a category (soft delete)
  const deleteCategory = async (id) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error deleting category:", error);
        logError("category_delete_failed", error, { id });
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error deleting category:", error);
      return { success: false, error: error.message };
    }
  };

  // Function to manually refresh categories
  const refreshCategories = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .order("name", { ascending: true });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error refreshing categories:", error);
        logError("categories_refresh_failed", error, { type });
      } else if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error("Error refreshing categories:", error);
      logError("categories_refresh_failed", error, { type });
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
  };
}
