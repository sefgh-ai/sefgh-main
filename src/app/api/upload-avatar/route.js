import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Clean up old avatar files in background
 * This runs after the response is sent to avoid blocking the upload
 */
async function cleanupOldAvatars(supabase, userId, currentFileName) {
  try {
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId)

    if (existingFiles && existingFiles.length > 1) {
      // Get the current file name without the user folder prefix
      const currentFileOnly = currentFileName.split('/').pop()
      
      // Filter out the current file and delete the rest
      const filesToDelete = existingFiles
        .filter(file => file.name !== currentFileOnly)
        .map(file => `${userId}/${file.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete)
        console.log(`🧹 Cleaned up ${filesToDelete.length} old avatar(s)`)
      }
    }
  } catch (error) {
    // Log but don't throw - this is non-critical
    console.warn('⚠️ Avatar cleanup error:', error.message)
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the file from form data
    const formData = await request.formData()
    const file = formData.get('avatar')

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload new avatar FIRST (don't wait for cleanup)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Avatar upload failed:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        name: uploadError.name,
        error: uploadError,
        fileName,
        fileType: file.type,
        fileSize: file.size,
        userId: user.id
      })
      
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const avatarsBucket = buckets?.find(b => b.name === 'avatars')
      
      if (!avatarsBucket) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not configured. Please run supabase/avatar-storage-setup.sql to set up the avatars bucket.',
            details: uploadError.message
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to upload avatar',
          details: uploadError.message 
        },
        { status: 500 }
      )
    }

    // Get public URL with timestamp for cache busting
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    // Add timestamp to force browser cache refresh
    const publicUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`

    // Update user metadata with new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: publicUrlWithTimestamp
      }
    })

    if (updateError) {
      console.error('❌ User metadata update failed:', {
        message: updateError.message,
        error: updateError,
        publicUrl,
        userId: user.id
      })
      return NextResponse.json(
        { 
          error: 'Failed to update user profile',
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlWithTimestamp })
      .eq('id', user.id)

    if (profileError) {
      console.error('⚠️ Profiles table update failed (non-critical):', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        error: profileError,
        userId: user.id
      })
      // Don't return error - avatar is already uploaded and user metadata updated
      console.log('ℹ️ Note: If profiles table does not exist, run supabase/avatar-storage-setup.sql')
    }

    console.log('✅ Avatar upload successful:', {
      userId: user.id,
      fileName,
      publicUrl: publicUrlWithTimestamp
    })

    // Clean up old avatars in background (fire-and-forget)
    // Don't await this - let it run after response is sent
    cleanupOldAvatars(supabase, user.id, fileName).catch(err => 
      console.warn('⚠️ Background cleanup failed:', err.message)
    )

    return NextResponse.json({
      success: true,
      avatar_url: publicUrlWithTimestamp
    })

  } catch (error) {
    console.error('❌ Unexpected server error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      error
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
