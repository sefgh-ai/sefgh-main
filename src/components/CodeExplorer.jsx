'use client'

import { useState, useEffect } from "react"
import { ArrowLeft, Star, GitFork, Eye, ExternalLink, Copy, FileText, BarChart3, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"

export function CodeExplorer({ repository, onClose }) {
  const [activeTab, setActiveTab] = useState('readme')
  const [repoDetails, setRepoDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (repository) {
      loadRepositoryDetails()
    }
  }, [repository])

  const loadRepositoryDetails = async () => {
    setLoading(true)
    try {
      const [owner, repo] = repository.full_name.split('/')
      const response = await fetch(`/api/github/repo/${owner}/${repo}`)
      const data = await response.json()
      setRepoDetails(data)
    } catch (error) {
      console.error('Error loading repository details:', error)
      toast.error('Failed to load repository details')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(repository.html_url)
    toast.success('Repository URL copied!')
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num?.toString() || '0'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!repository) return null

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{repository.full_name}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {repository.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Star className="h-3 w-3 mr-1.5" />
            Star
          </Button>
          <Button variant="outline" size="sm">
            <GitFork className="h-3 w-3 mr-1.5" />
            Fork
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-3 w-3 mr-1.5" />
            Watch
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyUrl}>
            <Copy className="h-3 w-3 mr-1.5" />
            Copy URL
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(repository.html_url, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            GitHub
          </Button>
        </div>

        {/* Topics */}
        {repository.topics && repository.topics.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {repository.topics.slice(0, 5).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 flex-shrink-0">
          <TabsList className="w-full justify-start h-12 bg-transparent">
            <TabsTrigger value="readme" className="gap-2">
              <FileText className="h-4 w-4" />
              README
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Info className="h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* README Tab */}
                <TabsContent value="readme" className="mt-0">
                  {repoDetails?.readme ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <MarkdownRenderer content={repoDetails.readme} />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No README found</p>
                    </div>
                  )}
                </TabsContent>

                {/* Insights Tab */}
                <TabsContent value="insights" className="mt-0 space-y-6">
                  {/* Language Breakdown */}
                  {repoDetails?.languages && Object.keys(repoDetails.languages).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Language Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(repoDetails.languages)
                          .sort(([, a], [, b]) => b - a)
                          .map(([language, bytes]) => {
                            const total = Object.values(repoDetails.languages).reduce((a, b) => a + b, 0)
                            const percentage = ((bytes / total) * 100).toFixed(1)
                            return (
                              <div key={language}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">{language}</span>
                                  <span className="text-muted-foreground">{percentage}%</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Repository Activity */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Repository Activity</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(repository.stargazers_count)}</div>
                        <div className="text-sm text-muted-foreground">Stars</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(repository.forks_count)}</div>
                        <div className="text-sm text-muted-foreground">Forks</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(repository.watchers_count)}</div>
                        <div className="text-sm text-muted-foreground">Watchers</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(repository.open_issues_count)}</div>
                        <div className="text-sm text-muted-foreground">Open Issues</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* General Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">General Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner</span>
                        <span className="font-medium">{repository.owner.login}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Repository</span>
                        <span className="font-medium">{repository.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Visibility</span>
                        <Badge variant={repository.private ? 'secondary' : 'default'}>
                          {repository.private ? '🔒 Private' : '🌍 Public'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Default Branch</span>
                        <span className="font-medium">{repository.default_branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{formatDate(repository.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span className="font-medium">{formatDate(repository.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* License */}
                  {repository.license && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">License</h3>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">{repository.license.name}</div>
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Links</h3>
                    <div className="space-y-2">
                      {repository.homepage && (
                        <a
                          href={repository.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          🌐 Homepage
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <a
                        href={`${repository.html_url}/issues`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        🐛 Issues
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={`${repository.html_url}/pulls`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        🔀 Pull Requests
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
