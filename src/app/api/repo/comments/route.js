import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Create a new comment or reply
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to comment.' },
        { status: 401 }
      )
    }

    const { repoFullName, commentText, parentId } = await request.json()

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      )
    }

    // If it's a reply, verify parent exists
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('repo_comments')
        .select('id')
        .eq('id', parentId)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }
    }

    // Insert comment
    const { data: newComment, error: insertError } = await supabase
      .from('repo_comments')
      .insert({
        user_id: user.id,
        repo_full_name: repoFullName,
        parent_id: parentId || null,
        comment_text: commentText.trim(),
        upvotes: 0,
        downvotes: 0,
        is_edited: false,
        is_deleted: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert comment error:', insertError)
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      )
    }

    // Get user info for the response
    const { data: userData } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      comment: {
        ...newComment,
        user_name: userData?.username || null,
        user_email: user.email,
        user_avatar: userData?.avatar_url || null
      }
    })

  } catch (error) {
    console.error('Comment POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch comments for a repository
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const repoFullName = searchParams.get('repo')
    const parentId = searchParams.get('parentId') // For fetching replies
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('repo_comments')
      .select('*')
      .eq('repo_full_name', repoFullName)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by parent_id (null for top-level, specific ID for replies)
    if (parentId === 'null' || !parentId) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Fetch comments error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // For each comment, get user info and reply count
    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        // Get user info
        const { data: userData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', comment.user_id)
          .single()

        // If no profile, get email from auth.users
        let userEmail = null
        if (!userData) {
          const { data: authUser } = await supabase.auth.admin.getUserById(comment.user_id)
          userEmail = authUser?.user?.email
        }

        // Get reply count
        const { count } = await supabase
          .from('repo_comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id)
          .eq('is_deleted', false)

        return {
          ...comment,
          user_name: userData?.username || null,
          user_email: userEmail,
          user_avatar: userData?.avatar_url || null,
          reply_count: count || 0
        }
      })
    )

    return NextResponse.json({
      comments: commentsWithDetails || []
    })

  } catch (error) {
    console.error('Get comments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a comment
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { commentId, commentText } = await request.json()

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      )
    }

    // Update comment (only if user owns it)
    const { data: updatedComment, error: updateError } = await supabase
      .from('repo_comments')
      .update({
        comment_text: commentText.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update comment error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    if (!updatedComment) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment
    })

  } catch (error) {
    console.error('Update comment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a comment (soft delete)
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // Soft delete (mark as deleted)
    const { error: deleteError } = await supabase
      .from('repo_comments')
      .update({
        is_deleted: true,
        comment_text: '[deleted]',
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete comment error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete comment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
