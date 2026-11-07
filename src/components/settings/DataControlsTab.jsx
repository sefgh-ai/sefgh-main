"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  DownloadSimpleIcon,
  TrashIcon,
  ClockCounterClockwiseIcon,
  ChartBarIcon,
  WarningIcon,
  FileArrowDownIcon,
  ShieldIcon,
  BroomIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

export default function DataControlsTab() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [searchHistoryEnabled, setSearchHistoryEnabled] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [exportPending, setExportPending] = useState(false);

  const handleExportRequest = () => {
    setExportPending(true);
    toast.success("Export requested! Check your email within 24 hours.");
  };

  const handleClearHistory = () => {
    setShowClearHistoryDialog(false);
    toast.success("Search history cleared");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === "DELETE") {
      toast.success("Account deletion initiated");
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Privacy Overview */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 flex-shrink-0">
            <ShieldIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Your Privacy Matters</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Control how SEFGH collects and uses your data. Your data is
              encrypted and stored securely.
            </p>
          </div>
        </div>
      </div>

      {/* Data Collection Settings */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="text-lg font-semibold">Data Collection</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage what data SEFGH collects
          </p>
        </div>

        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                <ClockCounterClockwiseIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Search History</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Save your searches to improve recommendations and quick access
                </p>
              </div>
            </div>
            <Switch
              checked={searchHistoryEnabled}
              onCheckedChange={setSearchHistoryEnabled}
              aria-label="Toggle search history"
            />
          </div>

          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                <ChartBarIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Usage Analytics</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Help improve SEFGH by sharing anonymous usage data
                </p>
              </div>
            </div>
            <Switch
              checked={analyticsEnabled}
              onCheckedChange={setAnalyticsEnabled}
              aria-label="Toggle analytics"
            />
          </div>
        </div>
      </div>

      {/* Data Actions */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="text-lg font-semibold">Data Actions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Export or clear your data
          </p>
        </div>

        <div className="divide-y divide-border/30">
          {/* Export Data */}
          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                <FileArrowDownIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Export Your Data</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Download a copy of your searches, starred repos, and settings
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportRequest}
              disabled={exportPending}
            >
              <DownloadSimpleIcon className="w-4 h-4 mr-2" />
              {exportPending ? "Pending..." : "Export"}
            </Button>
          </div>

          {/* Clear Search History */}
          <div className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10 mt-0.5">
                <BroomIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Clear Search History</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Remove all your past searches from SEFGH
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearHistoryDialog(true)}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 overflow-hidden">
        <div className="p-6 border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <WarningIcon className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">
              Danger Zone
            </h3>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold">Delete Account</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Permanently delete your SEFGH account and all associated data.
                This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Clear History Dialog */}
      <AlertDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear search history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your search history. Your starred
              repositories and other data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory}>
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WarningIcon className="w-5 h-5 text-destructive" />
              Delete Your Account?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Your SEFGH account</li>
                  <li>All saved searches and history</li>
                  <li>Your starred repositories</li>
                  <li>Your preferences and settings</li>
                </ul>
                <p className="font-semibold text-destructive">
                  This action cannot be undone.
                </p>
                <div className="pt-4">
                  <label
                    htmlFor="deleteConfirm"
                    className="text-sm font-medium"
                  >
                    Type &quot;DELETE&quot; to confirm:
                  </label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE"
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
