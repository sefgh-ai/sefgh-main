'use client'

import { formatCompactNumber } from "@/lib/utils/formatters";
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Star, 
  GitFork, 
  Eye, 
  Users, 
  ExternalLink, 

  Code2,
  MessageSquare,
  Award,
  ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { RepoVoteSection } from '@/components/repo-details/RepoVoteSection'
import { RepoDrawer } from '@/components/repo-details/RepoDrawer'
import { RepoRatingSection } from '@/components/repo-details/RepoRatingSection'
import { RepoCommentsSection } from '@/components/repo-details/RepoCommentsSection'
import { RepoCollectButton } from '@/components/repo-details/RepoCollectButton'
import { RepoVideoTab } from '@/components/repo-details/RepoVideoTab'
import { RepoQRCode } from '@/components/repo-details/RepoQRCode'

export default function RepoDetailsLayout({ 
  repoData, 
  sefghData,
  owner,
  repoName 
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [canvasOpen, setCanvasOpen] = useState(false)

  // Format numbers (consistent for SSR)

  // Format date (consistent for SSR)
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>

        {/* Main Card */}
        <Card className="glass-premium shadow-premium border-border p-6 md:p-8">
          {/* Repository Header */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Image
                src={repoData.owner.avatar_url}
                alt={repoData.owner.login}
                width={96}
                height={96}
                unoptimized
                className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 border-border"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {owner}/{repoName}
              </h1>
              <p className="text-muted-foreground text-lg mb-4">
                {repoData.description || 'No description available'}
              </p>

            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant="default"
              size="lg"
              onClick={() => window.open(repoData.html_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit on GitHub
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setCanvasOpen(true)}
            >
              <Code2 className="h-4 w-4 mr-2" />
              View README & Code
            </Button>

            <RepoCollectButton
              repoFullName={`${owner}/${repoName}`}
              initialSaved={sefghData?.userSaved || false}
              initialCount={sefghData?.saveCount || 0}
            />

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (repoData.has_discussions) {
                  window.open(`${repoData.html_url}/discussions`, '_blank')
                } else {
                  window.open(`${repoData.html_url}/issues`, '_blank')
                }
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Discuss
            </Button>

            <RepoQRCode repoFullName={`${owner}/${repoName}`} />

            {/* Claim Button - Future implementation */}
            <Button
              variant="outline"
              size="lg"
              disabled
              title="Coming soon: Claim project ownership"
            >
              <Award className="h-4 w-4 mr-2" />
              Claim Project
            </Button>
          </div>

          {/* Vote Section */}
          <div className="mb-6">
            <RepoVoteSection
              repoFullName={`${owner}/${repoName}`}
              initialVotes={sefghData.votes}
              userVote={sefghData.userVote}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 text-center bg-card/50">
              <div className="flex items-center justify-center mb-2 text-yellow-500">
                <Star className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{formatCompactNumber(repoData.stargazers_count)}</div>
              <div className="text-sm text-muted-foreground">Stars</div>
            </Card>

            <Card className="p-4 text-center bg-card/50">
              <div className="flex items-center justify-center mb-2 text-blue-500">
                <GitFork className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{formatCompactNumber(repoData.forks_count)}</div>
              <div className="text-sm text-muted-foreground">Forks</div>
            </Card>

            <Card className="p-4 text-center bg-card/50">
              <div className="flex items-center justify-center mb-2 text-green-500">
                <Eye className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{formatCompactNumber(repoData.watchers_count)}</div>
              <div className="text-sm text-muted-foreground">Watchers</div>
            </Card>

            <Card className="p-4 text-center bg-card/50">
              <div className="flex items-center justify-center mb-2 text-purple-500">
                <Code2 className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{repoData.language || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Language</div>
            </Card>

            <Card className="p-4 text-center bg-card/50">
              <div className="flex items-center justify-center mb-2 text-orange-500">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{repoData.open_issues_count || 0}</div>
              <div className="text-sm text-muted-foreground">Issues</div>
            </Card>
          </div>

          {/* Tags/Topics */}
          {repoData.topics && repoData.topics.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                🏷️ Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {repoData.topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="px-3 py-1">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tabs Section */}
          <Tabs defaultValue="description" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">📝 Description</TabsTrigger>
              <TabsTrigger value="ratings">⭐ Ratings</TabsTrigger>
              <TabsTrigger value="video">🎥 Video</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-4">
              <Card className="p-6 bg-card/50">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-base leading-relaxed">
                    {repoData.description || 'No description available'}
                  </p>
                  
                  {/* Additional Info */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Created:</strong> {formatDate(repoData.created_at)}
                    </div>
                    <div>
                      <strong>Updated:</strong> {formatDate(repoData.updated_at)}
                    </div>
                    <div>
                      <strong>License:</strong> {repoData.license?.name || 'None'}
                    </div>
                    <div>
                      <strong>Default Branch:</strong> {repoData.default_branch}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="video" className="mt-4">
              <RepoVideoTab repoFullName={`${owner}/${repoName}`} />
            </TabsContent>
          </Tabs>

          {/* Comments Section */}
          <div className="mt-8">
            <RepoCommentsSection
              repoFullName={`${owner}/${repoName}`}
              initialComments={sefghData.comments}
            />
          </div>
        </Card>
      </div>

      {/* Canvas Drawer */}
      <RepoDrawer
        open={canvasOpen}
        onOpenChange={setCanvasOpen}
        repository={{
          full_name: `${owner}/${repoName}`,
          name: repoName,
          owner: { login: owner },
          ...repoData
        }}
      />
    </div>
  )
}
