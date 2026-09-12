'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Copy, ExternalLink, Link2, Share2, Twitter, Facebook, Linkedin, MessageSquare, Loader2 } from 'lucide-react'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { toast } from 'sonner'

export default function SharedChatPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [share, setShare] = useState(null)
  const [copying, setCopying] = useState(false)
  const [token, setToken] = useState(null)

  useEffect(() => {
    // Unwrap params Promise
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/share/${token}`)
        if (!res.ok) throw new Error('Not found')
        const json = await res.json()
        setShare(json.share)
      } catch (e) {
        toast.error('This shared chat is unavailable')
        router.replace('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, router])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied')
    } finally {
      setCopying(false)
    }
  }

  const shareTo = (platform) => {
    const text = encodeURIComponent(`Check out this AI chat: ${share?.title || ''}`)
    const url = encodeURIComponent(shareUrl)
    let target = ''
    switch (platform) {
      case 'twitter':
        target = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        break
      case 'linkedin':
        target = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        break
      case 'facebook':
        target = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
      default:
        return
    }
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  const continueChat = async () => {
    try {
      const res = await fetch(`/api/share/${token}/fork`, { method: 'POST' })
      if (res.status === 401) {
        // redirect to login preserving return
        const dest = encodeURIComponent(`/s/${token}`)
        router.push(`/login?returnTo=${dest}`)
        return
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fork')
      router.push('/chat')
      toast.success('Forked into your chats')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!share) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Share Card */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{share.title || 'Shared Conversation'}</h1>
                <Badge variant={share.is_public ? 'default' : 'secondary'}>
                  {share.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              {share.summary ? (
                <p className="text-sm text-muted-foreground">{share.summary}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                {copying ? 'Copied' : 'Copy link'}
              </Button>
              <Button size="sm" onClick={continueChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Continue this chat
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Socials */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Share to:</span>
            <Button variant="ghost" size="sm" onClick={() => shareTo('twitter')}>
              <Twitter className="h-4 w-4 mr-2" /> Twitter
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shareTo('linkedin')}>
              <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
            </Button>
            <Button variant="ghost" size="sm" onClick={() => shareTo('facebook')}>
              <Facebook className="h-4 w-4 mr-2" /> Facebook
            </Button>
          </div>

          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Public links can be reshared. Share responsibly — opens in a new window. Delete — opens in a new window — at any time. If sharing with third parties, their policies apply.
          </div>
        </Card>

        {/* Messages */}
        <Card className="p-5 space-y-4">
          {Array.isArray(share.snapshot) && share.snapshot.length > 0 ? (
            share.snapshot.map((m, i) => (
              <div key={m.id || i} className="space-y-2">
                <div className="text-xs text-muted-foreground">{m.role === 'user' ? 'You' : 'AI'}</div>
                {m.role === 'assistant' ? (
                  <MarkdownRenderer content={m.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
                <Separator className="my-2" />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No messages in this snapshot.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
