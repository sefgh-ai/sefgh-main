import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Get public shared conversation by token
export async function GET(_req, { params }) {
  try {
    const { token } = await params
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('shared_conversations')
      .select('id, share_token, is_public, title, summary, snapshot, shared_at')
      .eq('share_token', token)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!data.is_public) {
      // Only owner can see private via app UI; block public endpoint
      return NextResponse.json({ error: 'Private link' }, { status: 403 })
    }

    return NextResponse.json({ share: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
