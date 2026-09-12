import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Add repo to collection
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to save repositories.' },
        { status: 401 }
      )
    }

    const { repoFullName, collectionName, notes } = await request.json()

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    // Insert into collection
    const { error: insertError } = await supabase
      .from('repo_collections')
      .insert({
        user_id: user.id,
        repo_full_name: repoFullName,
        collection_name: collectionName || 'default',
        notes: notes || null
      })

    if (insertError) {
      // Check if already exists
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Repository already in this collection' },
          { status: 409 }
        )
      }
      console.error('Insert collection error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save repository' },
        { status: 500 }
      )
    }

    // Get updated save count
    const { data: saves } = await supabase
      .from('repo_collections')
      .select('user_id')
      .eq('repo_full_name', repoFullName)

    return NextResponse.json({
      success: true,
      saved: true,
      totalSaves: saves?.length || 0
    })

  } catch (error) {
    console.error('Collection POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check if user saved repo and get save count
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
    
    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Get total saves
    const { data: saves, error } = await supabase
      .from('repo_collections')
      .select('user_id')
      .eq('repo_full_name', repoFullName)

    if (error) {
      console.error('Fetch collections error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch save status' },
        { status: 500 }
      )
    }

    // Check if user saved it
    let userSaved = false
    if (user) {
      userSaved = saves?.some(s => s.user_id === user.id) || false
    }

    return NextResponse.json({
      saved: userSaved,
      totalSaves: saves?.length || 0
    })

  } catch (error) {
    console.error('Get collection API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove repo from collection
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
    const collectionName = searchParams.get('collection') || 'default'

    if (!repoFullName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('repo_collections')
      .delete()
      .eq('user_id', user.id)
      .eq('repo_full_name', repoFullName)
      .eq('collection_name', collectionName)

    if (deleteError) {
      console.error('Delete collection error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove from collection' },
        { status: 500 }
      )
    }

    // Get updated save count
    const { data: saves } = await supabase
      .from('repo_collections')
      .select('user_id')
      .eq('repo_full_name', repoFullName)

    return NextResponse.json({
      success: true,
      saved: false,
      totalSaves: saves?.length || 0
    })

  } catch (error) {
    console.error('Delete collection API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
