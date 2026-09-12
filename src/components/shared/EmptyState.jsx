"use client"

import { Button } from "@/components/ui/button"
import { memo, useMemo } from "react"
import { 
  FileQuestion, 
  Search, 
  Database, 
  Inbox, 
  AlertCircle,
  FileX,
  Users,
  Settings
} from "lucide-react"

const icons = {
  search: Search,
  database: Database,
  inbox: Inbox,
  alert: AlertCircle,
  file: FileX,
  users: Users,
  settings: Settings,
  default: FileQuestion
}

/**
 * Reusable empty state component
 * Used across pages for consistent empty states
 * @param {Object} props
 * @param {string} [props.icon="default"] - Icon name (search, database, inbox, alert, file, users, settings, default)
 * @param {string} props.title - Main heading text
 * @param {string} [props.description] - Descriptive text
 * @param {string} [props.actionLabel] - Button text
 * @param {Function} [props.onAction] - Click handler for button
 * @param {string} [props.actionHref] - Navigation link for button
 * @param {React.ReactNode} [props.children] - Custom content
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 */
export const EmptyState = memo(function EmptyState({
  icon = "default",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  children,
  className = ""
}) {
  const Icon = useMemo(() => icons[icon] || icons.default, [icon])

  return (
    <div 
      className={`flex flex-col items-center justify-center min-h-[400px] text-center px-4 ${className}`}
      role="status"
      aria-label="Empty state"
    >
      <div className="rounded-full bg-muted p-6 mb-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}

      {children}

      {(actionLabel && (onAction || actionHref)) && (
        <Button
          onClick={onAction}
          {...(actionHref && { asChild: true })}
          className="mt-4"
        >
          {actionHref ? (
            <a href={actionHref}>{actionLabel}</a>
          ) : (
            actionLabel
          )}
        </Button>
      )}
    </div>
  )
})

/**
 * Compact empty state for smaller sections
 * @param {Object} props
 * @param {string} [props.icon="inbox"] - Icon name
 * @param {string} props.message - Message to display
 * @returns {JSX.Element}
 */
export const CompactEmptyState = memo(function CompactEmptyState({ icon = "inbox", message }) {
  const Icon = useMemo(() => icons[icon] || icons.inbox, [icon])

  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-label="Empty state"
    >
      <Icon className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
})
