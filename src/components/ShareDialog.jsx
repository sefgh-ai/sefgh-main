"use client"

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Link2, Copy, Check, Globe, Lock, Twitter, Facebook, Linkedin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSendNotification, NotificationTemplates } from '@/hooks/useSendNotification'

export default function ShareDialog({ open, onOpenChange, conversation, snapshot, onAfterShare }) {
  const [title, setTitle] = useState(conversation?.title || '')
  const [summary, setSummary] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const { sendFromTemplate } = useSendNotification()

  const canShare = conversation && Array.isArray(snapshot) && snapshot.length > 0

  const doShare = async () => {
    if (!canShare) return
    setCreating(true)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic, title: title || conversation.title, summary }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create link')
      setShareUrl(json.url)
      toast.success('Share link ready')
      
      // Send notification
      await sendFromTemplate(null, NotificationTemplates.conversationShared(title || conversation?.title || 'Conversation'))
      
      onAfterShare?.(json)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteShare = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/share`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to delete share')
      }
      setShareUrl('')
      toast.success('Share link deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shareTo = (platform) => {
    const text = encodeURIComponent(`Check out this AI chat: ${title || conversation?.title || ''}`)
    const url = encodeURIComponent(shareUrl)
    if (!url) return
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create a link to share this chat. Choose visibility and add a short summary.
          </DialogDescription>
        </DialogHeader>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <Button variant={isPublic ? 'default' : 'outline'} size="sm" onClick={() => setIsPublic(true)}>
            <Globe className="h-4 w-4 mr-2" /> Public
          </Button>
          <Button variant={!isPublic ? 'default' : 'outline'} size="sm" onClick={() => setIsPublic(false)}>
            <Lock className="h-4 w-4 mr-2" /> Private
          </Button>
          <Badge variant="secondary" className="ml-auto">
            {snapshot?.length || 0} messages
          </Badge>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Conversation title" />
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Summary</label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description to help others understand the chat" rows={3} />
        </div>

        {/* Create / Link */}
        {!shareUrl ? (
          <Button onClick={doShare} disabled={!canShare || creating}>
            <Link2 className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create share link'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} />
              <Button variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={deleteShare}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Post it on socials:</span>
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
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Public links can be reshared. Share responsiblyOpens in a new window, deleteOpens in a new window at any time. If sharing with third parties, their policies apply.
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
