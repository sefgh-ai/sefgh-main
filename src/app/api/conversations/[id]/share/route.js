import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Upsert a share for a conversation and return the share URL
export async function POST(req, { params }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const body = await req.json()
    const { isPublic = true, title, summary } = body || {}

    // Load conversation owned by user to build a snapshot
    const { data: conv, error: convErr } = await supabase
      .from('user_conversations')
      .select('id, user_id, title, messages')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Build a compact snapshot (cap at 50 messages)
    const snapshot = Array.isArray(conv.messages) ? conv.messages.slice(-50) : []

    // Call RPC to upsert the shared record
    const { data: share, error: shareErr } = await supabase.rpc('upsert_shared_conversation', {
      p_conversation_id: conversationId,
      p_is_public: isPublic,
      p_title: title || conv.title,
      p_summary: summary || null,
      p_snapshot: snapshot,
    })

    if (shareErr) {
      return NextResponse.json({ error: shareErr.message }, { status: 400 })
    }

    const requestUrl = new URL(req.url)
    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin || '').replace(/\/$/, '')
    const url = `${siteOrigin}/s/${share.share_token}`
    return NextResponse.json({ share, url })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Delete (soft) the share
export async function DELETE(req, { params }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const { data: existing, error: selErr } = await supabase
      .from('shared_conversations')
      .select('id, created_by, conversation_id')
      .eq('conversation_id', conversationId)
      .eq('created_by', user.id)
      .is('deleted_at', null)
      .single()

    if (selErr || !existing) {
      return NextResponse.json({ ok: true })
    }

    const { error: delErr } = await supabase
      .from('shared_conversations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
