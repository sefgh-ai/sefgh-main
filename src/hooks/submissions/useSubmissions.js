'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logError } from '@/lib/error-tracking'

/**
 * Custom hook for managing user submissions
 * @param {Object} user - Current authenticated user
 * @returns {Object} result
 * @returns {Array} result.submissions - Array of submission objects
 * @returns {boolean} result.loading - Loading state indicator
 * @returns {Function} result.handleDelete - Delete submission handler (async)
 * @returns {Function} result.refetch - Refetch submissions from database
 */
export const useSubmissions = (user) => {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  const fetchSubmissions = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('repo_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      setSubmissions(data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
      logError('submissions_fetch_failed', error, { userId: user?.id })
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchSubmissions()
    }
  }, [user, fetchSubmissions])

  const handleDelete = useCallback(async (submissionId) => {
    // Optimistic update
    const backup = submissions
    setSubmissions(prev => prev.filter(s => s.id !== submissionId))

    try {
      const { error } = await supabase
        .from('repo_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('user_id', user.id) // Security: ensure user owns the submission

      if (error) throw error

      toast.success("Submission deleted permanently")
    } catch (error) {
      // Rollback on error
      setSubmissions(backup)
      console.error('Delete failed:', error)
      logError('submission_delete_failed', error, { submissionId, userId: user?.id })
      toast.error("Failed to delete submission")
    }
  }, [submissions, supabase, user])

  return {
    submissions,
    loading,
    handleDelete,
    refetch: fetchSubmissions
  }
}
