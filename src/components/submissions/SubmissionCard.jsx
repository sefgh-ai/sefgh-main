"use client";

import React from "react";
import { Trash2, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSubmissionDate } from "@/lib/utils/submissions/submissionHelpers";

/**
 * Individual submission card component
 * @param {Object} props
 * @param {Object} props.submission - Submission data
 * @param {Function} props.onDelete - Delete handler
 */
const SubmissionCard = React.memo(({ submission, onDelete }) => {
  return (
    <div className="group glass-premium border border-white/10 rounded-xl p-6 hover:shadow-premium-lg transition-all duration-300 hover:border-blue-500/30">
      {/* Header with Delete Button */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary flex-1 line-clamp-2">
          {submission.title}
        </h3>
        <button
          onClick={() => onDelete(submission.id)}
          className="ml-2 p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove from view"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
        {submission.description}
      </p>

      {/* Tags */}
      {submission.tags && submission.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {submission.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
              {tag}
            </span>
          ))}
          {submission.tags.length > 3 && (
            <span className="px-2 py-1 text-xs rounded-md bg-muted/20 text-muted-foreground">
              +{submission.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Submitted Date */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Calendar className="h-3 w-3" />
        <span>Submitted {formatSubmissionDate(submission.submitted_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(submission.url, "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1.5" />
          View on GitHub
        </Button>
      </div>
    </div>
  );
});

SubmissionCard.displayName = "SubmissionCard";

export default SubmissionCard;
