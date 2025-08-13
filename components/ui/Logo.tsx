// components/ui/Logo.tsx
import React, { useState } from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  return (
    <div className={`flex items-center ${className}`}>
      {/* Global CSS for continuous rotation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes clockHand1 {
            from { transform: translateX(-50%) translateY(-100%) rotate(90deg); }
            to { transform: translateX(-50%) translateY(-100%) rotate(450deg); }
          }
          @keyframes clockHand2 {
            from { transform: translateX(-50%) translateY(-100%) rotate(45deg); }
            to { transform: translateX(-50%) translateY(-100%) rotate(405deg); }
          }
          .clock-hand1-rotating {
            animation: clockHand1 3s linear infinite;
          }
          .clock-hand2-rotating {
            animation: clockHand2 5s linear infinite;
          }
        `
      }} />

      {/* Logo Icon - Beautiful animated clock design */}
      <div className="relative group" style={{ perspective: '1000px' }}>
        {/* Main logo shape with 3D hover animation */}
        <div 
          className={`${sizes[size]} bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl transform rotate-3 transition-all duration-500 ease-out shadow-lg group-hover:shadow-2xl`}
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s ease-out, box-shadow 0.3s ease-out'
          }}
          onMouseEnter={(e) => {
            setIsHovered(true)
            e.currentTarget.style.transform = 'rotate(6deg) rotateX(-15deg) rotateY(15deg) scale(1.1)'
          }}
          onMouseLeave={(e) => {
            setIsHovered(false)
            e.currentTarget.style.transform = 'rotate(3deg) rotateX(0deg) rotateY(0deg) scale(1)'
          }}
        >
          {/* Beautiful clock design */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Outer clock ring - STATIC, doesn't rotate */}
              <div className="w-7 h-7 border-2 border-white rounded-full relative group-hover:scale-110 transition-transform duration-500">
                {/* Hour markers - STATIC */}
                <div className="absolute top-0 left-1/2 w-0.5 h-1.5 bg-white transform -translate-x-1/2 rounded-full"></div>
                <div className="absolute top-1/2 right-0 w-1.5 h-0.5 bg-white transform -translate-y-1/2 rounded-full"></div>
                <div className="absolute bottom-0 left-1/2 w-0.5 h-1.5 bg-white transform -translate-x-1/2 rounded-full"></div>
                <div className="absolute top-1/2 left-0 w-1.5 h-0.5 bg-white transform -translate-y-1/2 rounded-full"></div>
                
                {/* Clock hands - ONLY THESE ROTATE */}
                <div 
                  className={`absolute top-1/2 left-1/2 w-0.5 h-2 bg-white origin-bottom rounded-full ${isHovered ? 'clock-hand1-rotating' : 'transform -translate-x-1/2 -translate-y-full rotate-90'}`}
                ></div>
                <div 
                  className={`absolute top-1/2 left-1/2 w-0.5 h-1.5 bg-white origin-bottom rounded-full ${isHovered ? 'clock-hand2-rotating' : 'transform -translate-x-1/2 -translate-y-full rotate-45'}`}
                ></div>
                
                {/* Center dot - STATIC */}
                <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 group-hover:animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background accent with enhanced 3D effect */}
        <div className={`absolute inset-0 ${sizes[size]} bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 rounded-xl transform -rotate-3 group-hover:-rotate-6 transition-all duration-500 ease-out opacity-75 -z-10 group-hover:scale-105 group-hover:opacity-90`}></div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="ml-3">
          <h1 className={`${textSizes[size]} font-semibold text-gray-900 tracking-tight`}>
            Ponteo
          </h1>
          <p className="text-xs text-gray-500 -mt-1">
            by Lensa
          </p>
        </div>
      )}
    </div>
  )
}