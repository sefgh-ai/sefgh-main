'use client';

import React, { useRef, useEffect } from 'react';

const ParticleText = ({ text = 'SEFGH', className = '' }) => {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: null, y: null, radius: 100 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match container
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
    };
    
    updateCanvasSize();

    let particlesArray = [];
    let animationFrameId;

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = 1.5; // Reduced from 2 to prevent overlapping
        this.baseX = x;
        this.baseY = y;
        this.density = Math.random() * 30 + 5;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        // Always move back to base position
        if (this.x !== this.baseX) {
          let dx = this.x - this.baseX;
          this.x -= dx / 5;
        }
        if (this.y !== this.baseY) {
          let dy = this.y - this.baseY;
          this.y -= dy / 5;
        }

        // Only apply mouse force if mouse is on canvas
        if (mouse.current.x !== null && mouse.current.y !== null) {
          let dx = mouse.current.x - this.x;
          let dy = mouse.current.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.current.radius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let maxDistance = mouse.current.radius;
            let force = (maxDistance - distance) / maxDistance;
            let directionX = forceDirectionX * force * this.density;
            let directionY = forceDirectionY * force * this.density;
            
            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }
    }

    function init() {
      particlesArray = [];
      const fontSize = Math.min(canvas.width * 0.2, 100); // Increased font size
      const textX = canvas.width / 2;
      const textY = canvas.height / 2;

      ctx.font = `bold ${fontSize}px "Orbitron", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0.2, "#41d1ff");
      gradient.addColorStop(0.5, "#41a9ff");
      gradient.addColorStop(0.8, "#61dafb");
      ctx.fillStyle = gradient;

      ctx.fillText(text, textX, textY);
      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Increased spacing from 4 to 3 for denser, clearer particles
      for (let y = 0; y < textCoordinates.height; y += 3) {
        for (let x = 0; x < textCoordinates.width; x += 3) {
          const alphaIndex = (y * 4 * textCoordinates.width) + (x * 4) + 3;
          if (textCoordinates.data[alphaIndex] > 128) {
            const r = textCoordinates.data[alphaIndex - 3];
            const g = textCoordinates.data[alphaIndex - 2];
            const b = textCoordinates.data[alphaIndex - 1];
            const color = `rgb(${r},${g},${b})`;
            particlesArray.push(new Particle(x, y, color));
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach(p => {
        p.draw();
        p.update();
      });
      animationFrameId = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.current.x = null;
      mouse.current.y = null;
    };

    const handleResize = () => {
      updateCanvasSize();
      init();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    init();
    animate();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [text]);

  return (
    <div className={`relative ${className}`} style={{ width: '200px', height: '60px' }}>
      <canvas ref={canvasRef} className="absolute inset-0"></canvas>
    </div>
  );
};

export default ParticleText;
