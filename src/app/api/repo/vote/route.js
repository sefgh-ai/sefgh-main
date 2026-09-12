import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { repoFullName, voteType } = await request.json()

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    // Validate voteType
    if (voteType && !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "upvote" or "downvote"' },
        { status: 400 }
      )
    }

    // If voteType is null, remove the vote
    if (!voteType) {
      const { error: deleteError } = await supabase
        .from('repo_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)

      if (deleteError) {
        console.error('Delete vote error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        )
      }
    } else {
      // Upsert vote (insert or update if exists)
      const { error: upsertError } = await supabase
        .from('repo_votes')
        .upsert(
          {
            user_id: user.id,
            repo_full_name: repoFullName,
            vote_type: voteType,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,repo_full_name'
          }
        )

      if (upsertError) {
        console.error('Upsert vote error:', upsertError)
        return NextResponse.json(
          { error: 'Failed to save vote' },
          { status: 500 }
        )
      }
    }

    // Fetch updated vote stats
    const { data: voteStats, error: statsError } = await supabase
      .rpc('get_repo_vote_stats', { repo_name: repoFullName })

    if (statsError) {
      console.error('Fetch stats error:', statsError)
      // Fallback to manual count if RPC fails
      const { data: allVotes } = await supabase
        .from('repo_votes')
        .select('vote_type')
        .eq('repo_full_name', repoFullName)

      const upvotes = allVotes?.filter(v => v.vote_type === 'upvote').length || 0
      const downvotes = allVotes?.filter(v => v.vote_type === 'downvote').length || 0

      return NextResponse.json({
        success: true,
        votes: {
          upvotes,
          downvotes,
          net_votes: upvotes - downvotes
        },
        userVote: voteType
      })
    }

    return NextResponse.json({
      success: true,
      votes: voteStats || { upvotes: 0, downvotes: 0, net_votes: 0 },
      userVote: voteType
    })

  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch vote stats for a repository
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const repoFullName = searchParams.get('repo')

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get user if authenticated (optional for GET)
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch vote stats
    const { data: allVotes, error } = await supabase
      .from('repo_votes')
      .select('vote_type')
      .eq('repo_full_name', repoFullName)

    if (error) {
      console.error('Fetch votes error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      )
    }

    const upvotes = allVotes?.filter(v => v.vote_type === 'upvote').length || 0
    const downvotes = allVotes?.filter(v => v.vote_type === 'downvote').length || 0

    // Get user's vote if logged in
    let userVote = null
    if (user) {
      const { data: userVoteData } = await supabase
        .from('repo_votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)
        .single()

      userVote = userVoteData?.vote_type || null
    }

    return NextResponse.json({
      votes: {
        upvotes,
        downvotes,
        net_votes: upvotes - downvotes
      },
      userVote
    })

  } catch (error) {
    console.error('Get votes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
