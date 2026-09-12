"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Toggle component for switching between 2D and 3D views
 * Persists selection to localStorage
 * 
 * @param {Object} props
 * @param {string} props.view - Current view ('2d' or '3d')
 * @param {Function} props.onChange - Callback when view changes
 */
export default function UsageViewToggle({ view, onChange }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleChange = (newView) => {
    onChange(newView)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sefghUsageView', newView)
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1 bg-black/20">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange('2d')}
        className={cn(
          "h-7 px-3 text-xs font-medium transition-all",
          view === '2d'
            ? "bg-white/10 text-white shadow-sm"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        )}
      >
        2D
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange('3d')}
        className={cn(
          "h-7 px-3 text-xs font-medium transition-all",
          view === '3d'
            ? "bg-white/10 text-white shadow-sm"
            : "text-muted-foreground hover:text-white hover:bg-white/5"
        )}
        disabled={isMobile}
        title={isMobile ? "3D view is not recommended on mobile devices" : "Switch to 3D view"}
      >
        3D
        {isMobile && <span className="ml-1 text-[10px] opacity-50">(Desktop)</span>}
      </Button>
    </div>
  )
}
