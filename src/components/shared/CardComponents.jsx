"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Star, GitFork, Eye } from "lucide-react"
import { memo } from "react"

/**
 * Repository card with consistent styling
 * @param {Object} props
 * @param {string} props.name - Repository name
 * @param {string} [props.description] - Repository description
 * @param {number} [props.stars] - Star count
 * @param {number} [props.forks] - Fork count
 * @param {string} [props.language] - Primary programming language
 * @param {string[]} [props.topics=[]] - Topic tags
 * @param {string} [props.href] - Repository URL
 * @param {string} [props.owner] - Repository owner
 * @returns {JSX.Element}
 */
export const RepoCard = memo(function RepoCard({ 
  name, 
  description, 
  stars, 
  forks, 
  language, 
  topics = [],
  href,
  owner 
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {owner && <span className="text-muted-foreground">{owner}/</span>}
              {name}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-2 mt-2">
                {description}
              </CardDescription>
            )}
          </div>
          {href && (
            <Button variant="ghost" size="icon" asChild>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topics.slice(0, 5).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {language && (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-primary"></span>
              {language}
            </span>
          )}
          {stars !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {stars.toLocaleString()}
            </span>
          )}
          {forks !== undefined && (
            <span className="flex items-center gap-1">
              <GitFork className="h-4 w-4" />
              {forks.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

/**
 * Stat card for displaying metrics
 * @param {Object} props
 * @param {string} props.title - Stat title
 * @param {string|number} props.value - Stat value to display
 * @param {string} [props.description] - Additional description
 * @param {React.Component} [props.icon] - Lucide icon component
 * @param {number} [props.trend] - Percentage change (positive or negative)
 * @returns {JSX.Element}
 */
export const StatCard = memo(function StatCard({ title, value, description, icon: Icon, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  )
})

/**
 * Feature card with icon
 * @param {Object} props
 * @param {React.Component} [props.icon] - Lucide icon component
 * @param {string} props.title - Feature title
 * @param {string} [props.description] - Feature description
 * @param {React.ReactNode} [props.action] - Action button or element
 * @returns {JSX.Element}
 */
export const FeatureCard = memo(function FeatureCard({ icon: Icon, title, description, action }) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {action && (
        <CardFooter>
          {action}
        </CardFooter>
      )}
    </Card>
  )
})

/**
 * Info card with custom styling
 * @param {Object} props
 * @param {string} [props.title] - Card title
 * @param {React.ReactNode} props.children - Card content
 * @param {"default"|"info"|"success"|"warning"|"danger"} [props.variant="default"] - Style variant
 * @param {React.ReactNode} [props.footer] - Footer content
 * @returns {JSX.Element}
 */
export const InfoCard = memo(function InfoCard({ title, children, variant = "default", footer }) {
  const variants = {
    default: "",
    info: "border-blue-500/50 bg-blue-500/5",
    success: "border-green-500/50 bg-green-500/5",
    warning: "border-yellow-500/50 bg-yellow-500/5",
    danger: "border-red-500/50 bg-red-500/5"
  }

  return (
    <Card className={variants[variant]}>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="border-t pt-4">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
})
