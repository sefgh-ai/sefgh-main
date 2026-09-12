"use client"

import { useRef, useEffect, useState } from 'react'
import { getContributionColor } from '@/lib/usageStats'

/**
 * 3D Isometric chart using obelisk.js
 * Renders activity data as isometric cubes similar to GitHub's 3D contributions view
 * 
 * @param {Object} props
 * @param {Array} props.weeks - Array of weeks, each week is array of 7 days
 * @param {number} props.maxCount - Maximum count in dataset for height scaling
 */
export default function UsageIsometricChart({ weeks, maxCount }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 500 })
  const [obeliskLoaded, setObeliskLoaded] = useState(false)
  const [hoveredCube, setHoveredCube] = useState(null)
  const cubeDataRef = useRef([])

  // Check if obelisk.js is loaded
  useEffect(() => {
    const checkObelisk = () => {
      if (typeof window !== 'undefined' && window.obelisk) {
        setObeliskLoaded(true)
      } else {
        setTimeout(checkObelisk, 100)
      }
    }
    checkObelisk()
  }, [])

  // Handle responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({
        width: Math.max(1200, Math.floor(rect.width)),
        height: 500
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Draw the isometric chart
  useEffect(() => {
    if (!obeliskLoaded || !canvasRef.current || !weeks || weeks.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Obelisk.js constants - adjusted for better visibility
    const SIZE = 12 // Base size of each cube
    const MAX_HEIGHT = 80 // Maximum cube height
    const SPACING = 2 // Spacing between cubes

    try {
      const { Point, PixelView, Cube, CubeColor, CubeDimension } = window.obelisk

      // Debug logging
      console.log('=== 3D Isometric Chart Debug ===')
      console.log('Weeks array length:', weeks.length)
      console.log('First week length:', weeks[0]?.length)
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height)
      console.log('Cube SIZE:', SIZE, 'SPACING:', SPACING, 'MAX_HEIGHT:', MAX_HEIGHT)
      console.log('Max count in data:', maxCount)

      // Calculate starting position to center the grid
      const totalWidth = weeks.length * (SIZE + SPACING)
      const point = new Point(100, 50)
      const pixelView = new PixelView(canvas, point)

      // Store cube positions for hover detection
      const cubeData = []
      let cubesDrawn = 0

      // Iterate through weeks and days
      weeks.forEach((week, weekIndex) => {
        week.forEach((day, dayIndex) => {
          cubesDrawn++
          // Calculate cube height based on count
          let cubeHeight = 4 // Minimum height for visibility
          if (maxCount > 0 && day.count > 0) {
            cubeHeight = 4 + Math.floor((MAX_HEIGHT / maxCount) * day.count)
          }

          // Get color for this count
          const hexColor = getContributionColor(day.count, maxCount)
          const colorValue = parseInt(hexColor.replace('#', ''), 16)

          // Calculate 3D position with proper spacing
          const x = weekIndex
          const y = (6 - dayIndex) // Reverse day order (Saturday at top)

          // Create cube
          const dimension = new CubeDimension(SIZE, SIZE, cubeHeight)
          const color = new CubeColor().getByHorizontalColor(colorValue)
          const cube = new Cube(dimension, color, false)

          // Render at 3D coordinates with spacing
          const p3d = new window.obelisk.Point3D(
            x * (SIZE + SPACING), 
            y * (SIZE + SPACING), 
            0
          )
          pixelView.renderObject(cube, p3d)

          // Calculate 2D screen position for hover detection
          const screenX = point.x + (x - y) * (SIZE + SPACING) / 2
          const screenY = point.y + (x + y) * (SIZE + SPACING) / 4 - cubeHeight

          // Store cube data for hover
          cubeData.push({
            weekIndex,
            dayIndex,
            x: screenX - SIZE,
            y: screenY - SIZE,
            width: SIZE * 3,
            height: cubeHeight + SIZE * 2,
            date: day.date,
            count: day.count
          })
        })
      })

      cubeDataRef.current = cubeData

      console.log('Total cubes drawn:', cubesDrawn)
      console.log('Cube data stored:', cubeData.length)
      console.log('Sample cube positions (first 5):')
      cubeData.slice(0, 5).forEach((cube, i) => {
        console.log(`  Cube ${i}: week=${cube.weekIndex}, day=${cube.dayIndex}, count=${cube.count}, screen pos=(${Math.floor(cube.x)}, ${Math.floor(cube.y)})`)
      })

    } catch (error) {
      console.error('Error rendering isometric chart:', error)
    }
  }, [obeliskLoaded, weeks, maxCount, dimensions])

  // Handle mouse move for hover effects
  const handleMouseMove = (e) => {
    if (!canvasRef.current || cubeDataRef.current.length === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Find hovered cube
    let found = null
    for (let i = cubeDataRef.current.length - 1; i >= 0; i--) {
      const cube = cubeDataRef.current[i]
      if (
        mouseX >= cube.x &&
        mouseX <= cube.x + cube.width &&
        mouseY >= cube.y &&
        mouseY <= cube.y + cube.height
      ) {
        found = { ...cube, mouseX: e.clientX, mouseY: e.clientY }
        break
      }
    }

    setHoveredCube(found)
  }

  const handleMouseLeave = () => {
    setHoveredCube(null)
  }

  if (!obeliskLoaded) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <div>Loading 3D view...</div>
        </div>
      </div>
    )
  }

  if (!weeks || weeks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-[500px] overflow-x-auto overflow-y-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer mx-auto"
        style={{
          minWidth: dimensions.width + 'px',
          height: dimensions.height + 'px',
          display: 'block'
        }}
      />

      {/* Hover tooltip */}
      {hoveredCube && (
        <div
          className="absolute px-3 py-2 bg-black/90 text-white text-sm rounded border border-white/10 pointer-events-none z-10"
          style={{
            left: hoveredCube.mouseX + 10,
            top: hoveredCube.mouseY + 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="font-semibold">{hoveredCube.count} actions</div>
          <div className="text-xs text-muted-foreground">
            {hoveredCube.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      )}
    </div>
  )
}
