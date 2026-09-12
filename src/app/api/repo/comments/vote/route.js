import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Vote on a comment
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to vote.' },
        { status: 401 }
      )
    }

    const { commentId, voteType } = await request.json()

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    if (voteType && !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      )
    }

    // If voteType is null, remove the vote
    if (!voteType) {
      const { error: deleteError } = await supabase
        .from('comment_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', commentId)

      if (deleteError) {
        console.error('Delete comment vote error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        )
      }
    } else {
      // Upsert vote
      const { error: upsertError } = await supabase
        .from('comment_votes')
        .upsert(
          {
            user_id: user.id,
            comment_id: commentId,
            vote_type: voteType
          },
          {
            onConflict: 'user_id,comment_id'
          }
        )

      if (upsertError) {
        console.error('Upsert comment vote error:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save vote' },
          { status: 500 }
        )
      }
    }

    // Fetch updated comment
    const { data: comment } = await supabase
      .from('repo_comments')
      .select('upvotes, downvotes')
      .eq('id', commentId)
      .single()

    return NextResponse.json({
      success: true,
      upvotes: comment?.upvotes || 0,
      downvotes: comment?.downvotes || 0,
      userVote: voteType
    })

  } catch (error) {
    console.error('Comment vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get user's vote on a comment
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ userVote: null })
    }

    const { data: vote } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
      .single()

    return NextResponse.json({
      userVote: vote?.vote_type || null
    })

  } catch (error) {
    console.error('Get comment vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
