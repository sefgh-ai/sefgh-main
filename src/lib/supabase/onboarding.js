/**
 * Onboarding Data Management
 * CRUD operations for user onboarding flow
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Get a fresh Supabase client for each operation
 * This ensures auth state is current
 */
function getSupabase() {
  return createClient();
}

/**
 * Get user's onboarding data
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Onboarding data or null
 */
export async function getOnboardingData(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("onboarding_data")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found - user hasn't started onboarding
      return null;
    }

    if (error.code === "42P01") {
      // Table doesn't exist - throw so caller can handle
      console.error(
        "Onboarding table does not exist. Please run: supabase/onboarding-schema.sql"
      );
      const dbError = new Error(
        "Onboarding table does not exist. Please run the database migration."
      );
      dbError.code = "42P01";
      throw dbError;
    }

    console.error("Error fetching onboarding data:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    throw error;
  }

  return data;
}

/**
 * Create initial onboarding record
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created onboarding data
 */
export async function createOnboardingData(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("onboarding_data")
    .insert([
      {
        user_id: userId,
        current_step: 1,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating onboarding data:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    // Provide helpful error messages
    if (error.code === "42P01") {
      throw new Error(
        "Onboarding table does not exist. Please run the database migration in supabase/onboarding-schema.sql"
      );
    }

    if (error.code === "23505") {
      // Unique constraint violation - user already has onboarding data
      console.log("User already has onboarding data, fetching existing...");
      return getOnboardingData(userId);
    }

    throw error;
  }

  return data;
}

/**
 * Update onboarding step data
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated onboarding data
 */
export async function updateOnboardingData(userId, updates) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("onboarding_data")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating onboarding data:", {
      message: error.message,
      code: error.code,
      details: error.details,
      updates,
    });

    if (error.code === "42P01") {
      throw new Error(
        "Onboarding table does not exist. Please run the database migration in supabase/onboarding-schema.sql"
      );
    }

    throw error;
  }

  return data;
}

/**
 * Update current step
 * @param {string} userId - User ID
 * @param {number} step - Step number (1-5)
 * @returns {Promise<Object>} - Updated data
 */
export async function updateOnboardingStep(userId, step) {
  return updateOnboardingData(userId, { current_step: step });
}

/**
 * Mark onboarding as completed
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated data
 */
export async function completeOnboarding(userId) {
  return updateOnboardingData(userId, {
    completed: true,
    completed_at: new Date().toISOString(),
  });
}

/**
 * Mark onboarding as skipped
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated data
 */
export async function skipOnboarding(userId) {
  return updateOnboardingData(userId, {
    skipped: true,
    skipped_at: new Date().toISOString(),
  });
}

/**
 * Check if user needs onboarding
 * Returns true if user should see onboarding flow
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function needsOnboarding(userId) {
  console.log("[needsOnboarding] Checking for userId:", userId);
  try {
    const data = await getOnboardingData(userId);
    console.log("[needsOnboarding] Got data:", data);

    // Needs onboarding if:
    // - No data exists, OR
    // - Data exists but not completed AND not skipped
    const result = !data || (!data.completed && !data.skipped);
    console.log("[needsOnboarding] Result:", result);
    return result;
  } catch (error) {
    console.error("[needsOnboarding] Error:", error);
    // If there's an error, assume user needs onboarding (will be created on first use)
    return true;
  }
}

/**
 * Save Step 1: Role & Experience
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @param {string} experienceLevel - Experience level
 * @returns {Promise<Object>}
 */
export async function saveStepRole(userId, role, experienceLevel) {
  return updateOnboardingData(userId, {
    role,
    experience_level: experienceLevel,
    current_step: 2,
  });
}

/**
 * Save Step 2: Tech Stack
 * @param {string} userId - User ID
 * @param {Array<string>} techStack - Selected technologies
 * @param {string} primaryLanguage - Primary programming language
 * @returns {Promise<Object>}
 */
export async function saveStepTechStack(userId, techStack, primaryLanguage) {
  return updateOnboardingData(userId, {
    tech_stack: techStack,
    primary_language: primaryLanguage,
    current_step: 3,
  });
}

/**
 * Save Step 3: Goals
 * @param {string} userId - User ID
 * @param {Array<string>} goals - User goals
 * @returns {Promise<Object>}
 */
export async function saveStepGoals(userId, goals) {
  return updateOnboardingData(userId, {
    goals,
    current_step: 4,
  });
}

/**
 * Save Step 4: GitHub Connection
 * @param {string} userId - User ID
 * @param {boolean} connected - Whether GitHub is connected
 * @param {string} username - GitHub username (optional)
 * @returns {Promise<Object>}
 */
export async function saveStepGitHub(userId, connected, username = null) {
  return updateOnboardingData(userId, {
    github_connected: connected,
    github_username: username,
    current_step: 5,
  });
}

/**
 * Save Step 5: Preferences
 * @param {string} userId - User ID
 * @param {string} notificationPref - Notification preference
 * @param {string} language - Preferred language
 * @returns {Promise<Object>}
 */
export async function saveStepPreferences(userId, notificationPref, language) {
  return updateOnboardingData(userId, {
    notification_preference: notificationPref,
    preferred_language: language,
    current_step: 5,
    completed: true,
    completed_at: new Date().toISOString(),
  });
}

/**
 * Reset onboarding (for testing or allowing users to redo)
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export async function resetOnboarding(userId) {
  const { error } = await supabase
    .from("onboarding_data")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error resetting onboarding:", error);
    throw error;
  }

  return createOnboardingData(userId);
}
