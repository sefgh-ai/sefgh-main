/**
 * Supabase Profiles Helper Functions
 *
 * Use these functions throughout your app to interact with the profiles table
 */

import { createClient } from "@/lib/supabase/client";

// Module-level client - created once and reused
const supabase = createClient();

/**
 * Fetch a user's profile by ID
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

/**
 * Fetch all profiles (with optional limit)
 */
export async function getAllProfiles(limit = 10) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(limit);

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }

  return data;
}

/**
 * Update current user's profile
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  return data;
}

/**
 * Search profiles by name or email
 */
export async function searchProfiles(searchTerm) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

  if (error) {
    console.error("Error searching profiles:", error);
    return [];
  }

  return data;
}

/**
 * Subscribe to profile changes in real-time
 */
export function subscribeToProfile(userId, callback) {
  const channel = supabase
    .channel(`profile:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from profile changes
 */
export async function unsubscribeFromProfile(channel) {
  await supabase.removeChannel(channel);
}
