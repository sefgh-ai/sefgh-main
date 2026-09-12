'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CodeExplorer } from '@/components/CodeExplorer'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RepoDrawer({ open, onOpenChange, repository }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl lg:max-w-4xl p-0 border-l border-white/10"
      >
        <div className="h-full flex flex-col bg-card">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-white/10 flex-shrink-0">
            <SheetTitle className="text-xl font-bold">
              Repository Canvas
            </SheetTitle>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 min-h-0">
            <CodeExplorer
              repository={repository}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
