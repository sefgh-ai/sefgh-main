import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Fork a shared conversation into the current user's account
export async function POST(req, { params }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await params

    // Load the shared snapshot (public only)
    const { data: share, error: shareErr } = await supabase
      .from('shared_conversations')
      .select('id, title, snapshot, is_public')
      .eq('share_token', token)
      .is('deleted_at', null)
      .single()

    if (shareErr || !share || !share.is_public) {
      return NextResponse.json({ error: 'Not found or private' }, { status: 404 })
    }

    // Insert a new conversation for the user with snapshot messages
    const { data: conv, error: insErr } = await supabase
      .from('user_conversations')
      .insert({
        user_id: user.id,
        title: share.title || 'Shared Conversation',
        messages: Array.isArray(share.snapshot) ? share.snapshot : [],
        model: 'gpt-4o',
      })
      .select('id')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

    return NextResponse.json({ conversationId: conv.id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
