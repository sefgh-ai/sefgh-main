'use client'

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { isValidGitHubUrl, fetchGitHubRepoData } from "@/lib/github-api"
import { useRouter } from "next/navigation"
import { useSendNotification, NotificationTemplates } from "@/hooks/useSendNotification"

export function SubmitProjectDialog({ children }) {
  const [open, setOpen] = useState(false)
  const [projectUrl, setProjectUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { sendToSelf } = useSendNotification()
  
  // Memoize supabase client
  const supabase = useMemo(() => createClient(), [])

  // Check if user is logged in before opening modal
  const handleOpenChange = (newOpen) => {
    if (newOpen && !user) {
      toast.error("Please login to submit a project", {
        description: "You need to be logged in to submit a repository.",
      })
      router.push('/login')
      return
    }
    setOpen(newOpen)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate URL
    if (!projectUrl.trim()) {
      toast.error("Please enter a project URL")
      return
    }
    
    if (!isValidGitHubUrl(projectUrl.trim())) {
      toast.error("Invalid GitHub URL", {
        description: "Please enter a valid GitHub repository URL (https://github.com/owner/repo)"
      })
      return
    }
    
    // Validate title
    if (!title.trim()) {
      toast.error("Please enter a project title")
      return
    }
    
    if (title.length < 10 || title.length > 100) {
      toast.error("Title must be between 10-100 characters")
      return
    }
    
    // Validate description
    if (!description.trim()) {
      toast.error("Please enter a project description")
      return
    }
    
    if (description.length < 10 || description.length > 300) {
      toast.error("Description must be between 10-300 characters")
      return
    }

    setIsSubmitting(true)
    let toastId = null;
    
    try {
      // Stage 1: Validating
      toastId = toast.loading("Validating submission...");
      
      // Check if URL already exists (using maybeSingle to avoid error throw)
      const { data: existing } = await supabase
        .from('repo_submissions')
        .select('id')
        .eq('url', projectUrl.trim())
        .maybeSingle()
      
      if (existing) {
        toast.dismiss(toastId);
        toast.error("This repository has already been submitted")
        setIsSubmitting(false)
        return
      }
      
      // Stage 2: Fetching GitHub data
      toast.dismiss(toastId);
      toastId = toast.loading("Fetching repository data from GitHub...");
      
      const githubData = await fetchGitHubRepoData(projectUrl.trim())
      
      // Stage 3: Saving
      toast.dismiss(toastId);
      toastId = toast.loading("Saving submission...");
      
      // Insert submission into database
      const { data, error } = await supabase
        .from('repo_submissions')
        .insert({
          user_id: user.id,
          url: projectUrl.trim(),
          title: title.trim(),
          description: description.trim(),
          tags: githubData.tags || []
        })
        .select()
        .single()
      
      if (error) throw error
      
      toast.dismiss(toastId);
      toast.success("Project submitted successfully! 🎉", {
        description: "Your submission is now visible in your submissions page."
      })
      
      // Send notification
      await sendToSelf(
        "Repository Submitted! 🎉",
        `Your submission for "${title.trim()}" is now under review. We'll notify you when it's approved.`,
        "success",
        "/submissions"
      )
      
      // Reset form and close modal
      setOpen(false)
      setProjectUrl("")
      setTitle("")
      setDescription("")
    } catch (error) {
      console.error("Submission error:", error)
      if (toastId) toast.dismiss(toastId);
      toast.dismiss()
      
      if (error.message === 'Repository not found') {
        toast.error("Repository not found", {
          description: "The GitHub repository doesn't exist or is private."
        })
      } else if (error.message?.includes('timeout') || error.message?.includes('rate limit')) {
        toast.error("GitHub API Error", {
          description: error.message
        })
      } else if (error.message === 'Failed to fetch repository data') {
        toast.error("Failed to fetch repository data", {
          description: "Please check the URL and try again."
        })
      } else {
        toast.error("Failed to submit project", {
          description: error.message || "Please try again later."
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="glass-premium border-white/10 shadow-premium-lg rounded-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Recommend or Submit an Project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Only approved projects will be displayed on the homepage
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Project URL */}
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="Project URL"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              className="glass-premium border-white/10 rounded-xl focus:glow-border-blue transition-smooth"
              required
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>👆</span>
              <span>Only projects on GitHub are accepted</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Title: Briefly introduce the project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-premium border-white/10 rounded-xl focus:glow-border-blue transition-smooth"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Textarea
              placeholder="Description: Explain what the project is, the problems it solves, the technologies used, supported features, and use cases. (A clear description improves approval chances!)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-premium border-white/10 rounded-xl focus:glow-border-blue transition-smooth min-h-[160px] resize-none"
              required
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Word limit: 10-300 characters</span>
              <span className={`font-medium ${description.length > 300 ? 'text-red-500' : description.length >= 10 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {description.length}/300
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glass-premium bg-blue-600 hover:bg-blue-700 rounded-xl px-8 transition-smooth shadow-soft hover:shadow-soft-lg"
            >
              {isSubmitting ? "Submitting..." : "Submit →"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
