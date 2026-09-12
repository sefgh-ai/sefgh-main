'use client';

import React, { useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const issueTypes = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'account', label: 'Account Issue' },
  { value: 'billing', label: 'Billing Problem' },
  { value: 'performance', label: 'Performance Issue' },
  { value: 'other', label: 'Other' }
];

export default function ReportIssueTab() {
  const [issueType, setIssueType] = useState('bug');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain', 'text/x-log'];
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.txt', '.log'];
      const isValidType = validTypes.includes(file.type) || 
        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      if (!isValidType) {
        toast.error(`${file.name}: Invalid file type`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    setUploading(true);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('✅ Report submitted successfully! We\'ll get back to you within 24-48 hours.');
    
    // Reset form
    setIssueType('bug');
    setDescription('');
    setAttachments([]);
    setUploading(false);
  };

  const isValid = description.length >= 20;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Issue Type */}
      <div>
        <Label htmlFor="issueType" className="text-sm font-medium mb-2">
          Issue Type
        </Label>
        <Select value={issueType} onValueChange={setIssueType}>
          <SelectTrigger id="issueType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {issueTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium mb-2">
          Description
        </Label>
        <div className="relative">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="min-h-[200px] resize-none"
            maxLength={2000}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {description.length} / 2000
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <Label className="text-sm font-medium mb-2">Attachments (optional)</Label>
        <div
          className={`relative h-32 border-2 border-dashed rounded-xl transition-colors ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/30'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.gif,.txt,.log"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Paperclip className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              📎 Drag and drop files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">or click to upload</p>
            <p className="text-xs text-muted-foreground mt-2">
              Accepted: PNG, JPG, GIF, TXT, LOG (Max 10MB)
            </p>
          </div>
        </div>

        {/* Attached Files */}
        {attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-2 p-1 hover:bg-background rounded transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!isValid || uploading}
        >
          {uploading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </div>
    </div>
  );
}
