import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Add video for a repository
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to add videos.' },
        { status: 401 }
      )
    }

    const { repoFullName, videoUrl, title, description } = await request.json()

    if (!repoFullName || !videoUrl) {
      return NextResponse.json(
        { error: 'Repository name and video URL are required' },
        { status: 400 }
      )
    }

    // Detect video type
    let videoType = 'direct'
    let videoId = null
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      videoType = 'youtube'
      // Extract YouTube video ID
      const match = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
      videoId = match ? match[1] : null
    } else if (videoUrl.includes('github.com')) {
      videoType = 'github'
    }

    // Insert video
    const { data: newVideo, error: insertError } = await supabase
      .from('repo_videos')
      .insert({
        repo_full_name: repoFullName,
        video_url: videoUrl,
        video_type: videoType,
        title: title || null,
        description: description || null,
        thumbnail_url: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert video error:', insertError)
      return NextResponse.json(
        { error: 'Failed to add video' },
        { status: 500 }
      )
    }

    // Get user info for response
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      video: {
        ...newVideo,
        uploader_name: profile?.username || null,
        uploader_email: user.email,
        uploader_avatar: profile?.avatar_url || null
      }
    })

  } catch (error) {
    console.error('Video POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch videos for a repository
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

    // Fetch videos
    const { data: videos, error } = await supabase
      .from('repo_videos')
      .select('*')
      .eq('repo_full_name', repoFullName)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch videos error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      )
    }

    // Enrich videos with user info
    const videosWithUserInfo = await Promise.all(
      (videos || []).map(async (video) => {
        if (!video.uploaded_by) return video

        // Try to get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', video.uploaded_by)
          .single()

        // Get email if no profile
        let userEmail = null
        if (!profile?.username) {
          const { data: { user: videoUser } } = await supabase.auth.admin.getUserById(video.uploaded_by)
          userEmail = videoUser?.email
        }

        return {
          ...video,
          uploader_name: profile?.username || null,
          uploader_email: userEmail,
          uploader_avatar: profile?.avatar_url || null
        }
      })
    )

    return NextResponse.json({
      videos: videosWithUserInfo || []
    })

  } catch (error) {
    console.error('Get videos API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a video
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
    const videoId = searchParams.get('id')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('repo_videos')
      .delete()
      .eq('id', videoId)
      .eq('uploaded_by', user.id)

    if (deleteError) {
      console.error('Delete video error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete video' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete video API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
