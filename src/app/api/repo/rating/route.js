import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to rate.' },
        { status: 401 }
      )
    }

    const { repoFullName, rating, reviewText } = await request.json()

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Upsert rating (insert or update if exists)
    const { error: upsertError } = await supabase
      .from('repo_ratings')
      .upsert(
        {
          user_id: user.id,
          repo_full_name: repoFullName,
          rating: rating,
          review_text: reviewText || null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,repo_full_name'
        }
      )

    if (upsertError) {
      console.error('Upsert rating error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      )
    }

    // Fetch updated rating stats
    const { data: allRatings, error: statsError } = await supabase
      .from('repo_ratings')
      .select('rating')
      .eq('repo_full_name', repoFullName)

    if (statsError) {
      console.error('Fetch ratings error:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch updated ratings' },
        { status: 500 }
      )
    }

    const total = allRatings?.length || 0
    const average = total > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / total
      : 0

    return NextResponse.json({
      success: true,
      ratings: {
        total,
        average: Math.round(average * 10) / 10 // Round to 1 decimal
      }
    })

  } catch (error) {
    console.error('Rating API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch ratings for a repository
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

    // Fetch all ratings
    const { data: allRatings, error } = await supabase
      .from('repo_ratings')
      .select('*')
      .eq('repo_full_name', repoFullName)

    if (error) {
      console.error('Fetch ratings error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      )
    }

    const total = allRatings?.length || 0
    const average = total > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / total
      : 0

    // Get user's rating if logged in
    let userRating = null
    if (user) {
      const { data: userRatingData } = await supabase
        .from('repo_ratings')
        .select('*')
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)
        .single()

      userRating = userRatingData || null
    }

    return NextResponse.json({
      ratings: {
        total,
        average: Math.round(average * 10) / 10
      },
      userRating,
      allRatings: allRatings || []
    })

  } catch (error) {
    console.error('Get ratings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove a rating
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
    const repoFullName = searchParams.get('repo')

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('repo_ratings')
      .delete()
      .eq('user_id', user.id)
      .eq('repo_full_name', repoFullName)

    if (deleteError) {
      console.error('Delete rating error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete rating' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete rating API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
