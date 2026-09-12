"use client";

import React, { useState } from "react";
import {
  Paperclip,
  X,
  Send,
  Bug,
  Lightbulb,
  HelpCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const feedbackTypes = [
  {
    id: "bug",
    label: "Bug Report",
    icon: Bug,
    description: "Something is not working correctly",
    color: "text-red-500 bg-red-500/10",
  },
  {
    id: "feature",
    label: "Feature Request",
    icon: Lightbulb,
    description: "Suggest a new feature or improvement",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "feedback",
    label: "General Feedback",
    icon: MessageSquare,
    description: "Share your thoughts about SEFGH",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "question",
    label: "Question",
    icon: HelpCircle,
    description: "Ask about how to use SEFGH",
    color: "text-purple-500 bg-purple-500/10",
  },
];

export default function FeedbackTab() {
  const [feedbackType, setFeedbackType] = useState("feedback");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter((file) => {
      const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      const isValidType = validTypes.includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

      if (!isValidType) {
        toast.error(`${file.name}: Only images are allowed`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (description.length < 10) {
      toast.error("Please provide more detail (at least 10 characters)");
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Thank you for your feedback! We'll review it shortly.", {
      description: "Your input helps make SEFGH better for everyone.",
    });

    // Reset form
    setFeedbackType("feedback");
    setDescription("");
    setRating(0);
    setAttachments([]);
    setSubmitting(false);
  };

  const isValid = description.length >= 10;
  const selectedType = feedbackTypes.find((t) => t.id === feedbackType);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Intro */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
        <h3 className="text-lg font-semibold mb-2">
          We&apos;d Love to Hear From You! 💬
        </h3>
        <p className="text-sm text-muted-foreground">
          Your feedback helps us improve SEFGH. Whether you&apos;ve found a bug,
          have a feature idea, or just want to share your thoughts — we&apos;re
          all ears.
        </p>
      </div>

      {/* Feedback Type Selector */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          What type of feedback is this?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {feedbackTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = feedbackType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setFeedbackType(type.id)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className={`p-2 rounded-lg ${type.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? "text-primary" : ""
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating (for general feedback) */}
      {feedbackType === "feedback" && (
        <div>
          <Label className="text-sm font-medium mb-3 block">
            How would you rate SEFGH?
          </Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-1 rounded transition-all hover:scale-110 ${
                  star <= rating
                    ? "text-amber-500"
                    : "text-muted-foreground/30 hover:text-muted-foreground/50"
                }`}
              >
                <Star
                  className={`w-8 h-8 ${star <= rating ? "fill-current" : ""}`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {rating === 5
                  ? "Excellent!"
                  : rating === 4
                  ? "Great!"
                  : rating === 3
                  ? "Good"
                  : rating === 2
                  ? "Fair"
                  : "Poor"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium mb-2 block">
          {feedbackType === "bug"
            ? "Describe the issue"
            : feedbackType === "feature"
            ? "Describe your idea"
            : feedbackType === "question"
            ? "What would you like to know?"
            : "Share your feedback"}
        </Label>
        <div className="relative">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              feedbackType === "bug"
                ? "What happened? What did you expect to happen? Steps to reproduce..."
                : feedbackType === "feature"
                ? "Describe your feature idea and how it would help you..."
                : feedbackType === "question"
                ? "What would you like to know about SEFGH?"
                : "Tell us what you think about SEFGH..."
            }
            className="min-h-[150px] resize-none pr-16"
            maxLength={2000}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {description.length} / 2000
          </div>
        </div>
      </div>

      {/* Screenshot Upload (for bugs) */}
      {feedbackType === "bug" && (
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Screenshots (optional)
          </Label>
          <div
            className={`relative h-28 border-2 border-dashed rounded-xl transition-colors ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-muted/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Paperclip className="w-5 h-5 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop screenshots or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF, WebP (Max 5MB each, up to 3 files)
              </p>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="p-0.5 hover:bg-background rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          We typically respond within 24-48 hours.
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="px-6"
        >
          {submitting ? (
            "Sending..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Feedback
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
