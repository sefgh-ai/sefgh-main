'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/error-tracking'
import { useSendNotification, NotificationTemplates } from '@/hooks/useSendNotification'

/**
 * Custom hook for managing profile data with rate limiting
 * @param {Object} user - Current user from auth context
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Object} result
 * @returns {Object} result.formData - Form data object {fullName, email, bio, website, avatarUrl}
 * @returns {boolean} result.loading - Loading state indicator
 * @returns {Function} result.updateProfile - Update profile in database (async, rate-limited 3s)
 * @returns {Function} result.updateFormData - Update form data state
 * @returns {Function} result.handleAvatarUpload - Handle avatar file upload (async)
 */
export const useProfileData = (user, refreshUser) => {
  const [supabase] = useState(() => createClient())
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(0)
  const { sendFromTemplate } = useSendNotification()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    bio: '',
    website: '',
    avatarUrl: ''
  })

  // Fetch profile data from profiles table
  const fetchProfile = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      logError('profile_fetch_failed', error, { userId: user?.id })
      return
    }

    if (data) {
      setProfile(data)
      setFormData({
        fullName: data.full_name || '',
        email: data.email || '',
        bio: data.bio || '',
        website: data.website || '',
        avatarUrl: data.avatar_url || ''
      })
    }
  }, [user, supabase])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Update avatar URL when user changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setFormData(prev => ({
        ...prev,
        avatarUrl: user.user_metadata.avatar_url
      }))
    }
  }, [user])

  /**
   * Update profile data in Supabase
   * @param {Object} updates - Fields to update
   */
  const updateProfile = async (updates) => {
    // Rate limiting: 3 second cooldown
    const now = Date.now()
    if (now - lastUpdate < 3000) {
      toast.error("Please wait before updating again", {
        description: "Wait a few seconds between updates"
      })
      return false
    }

    setLoading(true)

    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.fullName,
        }
      })

      if (authError) throw authError

      setLastUpdate(now)

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          bio: updates.bio,
          website: updates.website,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Refresh user data
      await refreshUser()

      toast.success("Profile updated! ✨", {
        description: "Your profile information has been saved successfully.",
        duration: 3000,
      })
      
      // Send notification
      await sendFromTemplate(null, NotificationTemplates.profileUpdated())

      return true
    } catch (error) {
      console.error('Profile update failed:', error)
      logError('profile_update_failed', error, { userId: user?.id, updates })
      toast.error("Update failed", {
        description: error.message,
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update form data state
   * @param {string} field - Field name to update
   * @param {*} value - New value
   */
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  /**
   * Handle avatar upload success
   * @param {string} newAvatarUrl - New avatar URL
   */
  const handleAvatarUpload = (newAvatarUrl) => {
    setFormData(prev => ({
      ...prev,
      avatarUrl: newAvatarUrl
    }))
  }

  return {
    profile,
    formData,
    loading,
    updateProfile,
    updateFormData,
    handleAvatarUpload
  }
}
