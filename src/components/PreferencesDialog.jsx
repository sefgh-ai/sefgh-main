"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  GripVertical,
  Loader2,
  Sparkles,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/home/useCategories";
import { useAuth } from "@/contexts/AuthContext";

// Emoji picker for new categories
const EMOJI_OPTIONS = [
  "🏷️",
  "🎯",
  "🚀",
  "⭐",
  "💡",
  "🔥",
  "✨",
  "🎨",
  "🔧",
  "📱",
  "💻",
  "🌟",
  "🎪",
  "🎭",
  "🎬",
];

export function PreferencesDialog({ open, onOpenChange, onSave }) {
  const { user } = useAuth();
  const { categories, loading, addCategory, refreshCategories } =
    useCategories();
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterMode, setFilterMode] = useState("OR"); // OR or AND
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🏷️");
  const [newCategoryType, setNewCategoryType] = useState("custom");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    // Load saved preferences from localStorage
    if (open) {
      const saved = localStorage.getItem("projectPreferences");
      if (saved) {
        const { tags, mode } = JSON.parse(saved);
        // Batch updates in a microtask to avoid React lint warning
        queueMicrotask(() => {
          setSelectedTags(tags || []);
          setFilterMode(mode || "OR");
        });
      }
    }
  }, [open]);

  // Group categories by type
  const groupedCategories = categories.reduce((acc, cat) => {
    const type = cat.type.charAt(0).toUpperCase() + cat.type.slice(1);
    if (!acc[type]) acc[type] = [];
    acc[type].push(cat);
    return acc;
  }, {});

  const handleTagClick = (tag) => {
    if (selectedTags.find((t) => t.name === tag.name)) {
      // Remove tag
      setSelectedTags(selectedTags.filter((t) => t.name !== tag.name));
    } else {
      // Add tag
      if (selectedTags.length >= 20) {
        toast.error("Maximum 20 tags allowed");
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCategory = async () => {
    if (!user) {
      toast.error("Please login to add custom categories");
      return;
    }

    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (
      categories.find(
        (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
      )
    ) {
      toast.error("Category already exists");
      return;
    }

    setIsAdding(true);
    const result = await addCategory(
      newCategoryName.trim(),
      newCategoryIcon,
      newCategoryType,
      `Custom category created by user`
    );

    setIsAdding(false);

    if (result.success) {
      toast.success("Category added successfully!");
      setNewCategoryName("");
      setNewCategoryIcon("🏷️");
      setNewCategoryType("custom");
      setShowAddCategory(false);
      refreshCategories();
    } else {
      toast.error(`Failed to add category: ${result.error}`);
    }
  };

  const handleRemoveTag = (tagName) => {
    setSelectedTags(selectedTags.filter((t) => t.name !== tagName));
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTags = [...selectedTags];
    const draggedTag = newTags[draggedIndex];
    newTags.splice(draggedIndex, 1);
    newTags.splice(index, 0, draggedTag);

    setSelectedTags(newTags);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    const preferences = {
      tags: selectedTags,
      mode: filterMode,
    };
    localStorage.setItem("projectPreferences", JSON.stringify(preferences));
    onSave(preferences);
    toast.success("Preferences saved successfully!");
    onOpenChange(false);
  };

  const isTagSelected = (tagName) => {
    return selectedTags.some((t) => t.name === tagName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-auto h-[85vh] sm:h-[75vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Filter className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
              Personalize Your Feed
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select topics to customize what projects appear in your feed.
            </DialogDescription>
          </DialogHeader>

          {/* Steps - inline - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-6 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                1
              </span>
              <span>Select topics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                2
              </span>
              <span>Reorder priority</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                3
              </span>
              <span>Save changes</span>
            </div>
          </div>
        </div>

        {/* Main Content - Stack on mobile, side by side on desktop */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Panel - Available Topics */}
          <div className="flex-1 flex flex-col min-w-0 border-b sm:border-b-0 sm:border-r max-h-[45%] sm:max-h-none">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium">
                  Available Topics
                </h3>
                {loading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Add Custom Category */}
                {!showAddCategory ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCategory(true)}
                    disabled={!user}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Category
                    {!user && (
                      <span className="ml-2 text-xs opacity-60">
                        (Login required)
                      </span>
                    )}
                  </Button>
                ) : (
                  <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        className="w-11 h-9 bg-background border rounded text-lg text-center cursor-pointer"
                      >
                        {EMOJI_OPTIONS.map((emoji) => (
                          <option key={emoji} value={emoji}>
                            {emoji}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 h-9"
                        maxLength={30}
                      />
                      <select
                        value={newCategoryType}
                        onChange={(e) => setNewCategoryType(e.target.value)}
                        className="h-9 bg-background border rounded px-2 text-sm"
                      >
                        <option value="custom">Custom</option>
                        <option value="programming">Programming</option>
                        <option value="technology">Technology</option>
                        <option value="application">Application</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddCategory}
                        disabled={isAdding || !newCategoryName.trim()}
                        className="flex-1"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddCategory(false);
                          setNewCategoryName("");
                          setNewCategoryIcon("🏷️");
                          setNewCategoryType("custom");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Categories */}
                {loading && categories.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  Object.entries(groupedCategories).map(
                    ([categoryType, tags]) => (
                      <div key={categoryType}>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {categoryType}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            ({tags.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagClick(tag)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition-all ${
                                isTagSelected(tag.name)
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <span>{tag.icon}</span>
                              <span>{tag.name}</span>
                              {tag.usage_count > 0 && (
                                <span
                                  className={`text-xs ${
                                    isTagSelected(tag.name)
                                      ? "opacity-70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  ({tag.usage_count})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Selected Topics */}
          <div className="w-full sm:w-[280px] flex flex-col bg-muted/20 flex-1 sm:flex-initial">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium">
                  Selected ({selectedTags.length}/20)
                </h3>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Filter Mode */}
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Filter mode</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={
                    filterMode === "OR"
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }
                >
                  Any
                </span>
                <Switch
                  checked={filterMode === "AND"}
                  onCheckedChange={(checked) =>
                    setFilterMode(checked ? "AND" : "OR")
                  }
                  className="scale-75"
                />
                <span
                  className={
                    filterMode === "AND"
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }
                >
                  All
                </span>
              </div>
            </div>

            {/* Selected List */}
            <ScrollArea className="flex-1">
              <div className="p-3">
                {selectedTags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No topics selected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click topics on the left to add them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedTags.map((tag, index) => (
                      <div
                        key={tag.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-background border cursor-move hover:border-primary/50 transition-colors group ${
                          draggedIndex === index ? "opacity-50" : ""
                        }`}
                      >
                        <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                        <span className="text-sm shrink-0">{tag.icon}</span>
                        <span className="text-sm flex-1 truncate">
                          {tag.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          #{index + 1}
                        </span>
                        <button
                          onClick={() => handleRemoveTag(tag.name)}
                          className="w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/10 shrink-0"
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            {selectedTags.length === 0
              ? "Select at least one topic"
              : `${selectedTags.length} topic${
                  selectedTags.length > 1 ? "s" : ""
                } selected`}
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedTags.length === 0}
              className="flex-1 sm:flex-initial text-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
