'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Play, Plus, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { fetchWithSession } from '@/lib/supabase/session-fetch'

export function RepoVideoTab({ repoFullName }) {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoTitle, setNewVideoTitle] = useState('')
  const [newVideoDescription, setNewVideoDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchVideos()
  }, [repoFullName])

  const fetchVideos = async () => {
    try {
      const response = await fetchWithSession(`/api/repo/videos?repo=${encodeURIComponent(repoFullName)}`)
      const data = await response.json()
      
      if (response.ok) {
        setVideos(data.videos || [])
        if (data.videos && data.videos.length > 0) {
          setSelectedVideo(data.videos[0])
        }
      }
    } catch (error) {
      console.error('Fetch videos error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast.error('Please enter a video URL')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetchWithSession('/api/repo/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          videoUrl: newVideoUrl,
          title: newVideoTitle || null,
          description: newVideoDescription || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add video')
      }

      setVideos([data.video, ...videos])
      if (!selectedVideo) {
        setSelectedVideo(data.video)
      }
      setNewVideoUrl('')
      setNewVideoTitle('')
      setNewVideoDescription('')
      setIsAddDialogOpen(false)
      toast.success('Video added successfully!')
    } catch (error) {
      console.error('Add video error:', error)
      toast.error(error.message || 'Failed to add video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVideo = async (videoId) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      const response = await fetchWithSession(`/api/repo/videos?id=${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete video')
      }

      setVideos(videos.filter(v => v.id !== videoId))
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(videos[0] || null)
      }
      toast.success('Video deleted')
    } catch (error) {
      console.error('Delete video error:', error)
      toast.error('Failed to delete video')
    }
  }

  const getEmbedUrl = (video) => {
    if (video.video_type === 'youtube') {
      const match = video.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
      const videoId = match ? match[1] : null
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    }
    return video.video_url
  }

  if (loading) {
    return (
      <Card className="p-6 bg-card/50">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Video Button */}
      {user && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Video URL *</label>
                <Input
                  placeholder="https://youtube.com/watch?v=... or GitHub video URL"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Title (optional)</label>
                <Input
                  placeholder="Video title"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                <Textarea
                  placeholder="Brief description of the video"
                  value={newVideoDescription}
                  onChange={(e) => setNewVideoDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAddVideo}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Adding...' : 'Add Video'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Video Player */}
      {selectedVideo ? (
        <Card className="p-0 bg-card/50 overflow-hidden">
          <div className="aspect-video bg-black">
            {selectedVideo.video_type === 'youtube' && getEmbedUrl(selectedVideo) ? (
              <iframe
                src={getEmbedUrl(selectedVideo)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : selectedVideo.video_type === 'github' ? (
              <video
                src={selectedVideo.video_url}
                controls
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <a
                  href={selectedVideo.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary flex items-center gap-2"
                >
                  <ExternalLink className="h-6 w-6" />
                  Open Video in New Tab
                </a>
              </div>
            )}
          </div>
          {selectedVideo.title && (
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{selectedVideo.title}</h3>
              {selectedVideo.description && (
                <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
              )}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 bg-card/50 text-center">
          <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No videos available for this repository yet.
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Click &quot;Add Video&quot; above to contribute a video!
            </p>
          )}
        </Card>
      )}

      {/* Video List */}
      {videos.length > 1 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">More Videos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videos.filter(v => v.id !== selectedVideo?.id).map((video) => (
              <Card
                key={video.id}
                className="p-3 cursor-pointer hover:border-primary/50 transition-colors bg-card/30"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="flex gap-3">
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title || 'Video'}
                      className="w-24 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {video.title || 'Untitled Video'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {video.video_type}
                    </p>
                  </div>
                  {user && user.id === video.uploaded_by && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteVideo(video.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
