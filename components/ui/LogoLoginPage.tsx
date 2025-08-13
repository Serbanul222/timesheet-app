// components/ui/LogoLoginPage.tsx
import React from 'react'

interface LogoLoginPageProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LogoLoginPage({ size = 'lg', className = '' }: LogoLoginPageProps) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20'
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Global CSS for continuous rotation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes clockHandContinuous1 {
            from { transform: translateX(-50%) translateY(-100%) rotate(90deg); }
            to { transform: translateX(-50%) translateY(-100%) rotate(450deg); }
          }
          @keyframes clockHandContinuous2 {
            from { transform: translateX(-50%) translateY(-100%) rotate(45deg); }
            to { transform: translateX(-50%) translateY(-100%) rotate(405deg); }
          }
          .clock-hand-continuous-1 {
            animation: clockHandContinuous1 4s linear infinite;
          }
          .clock-hand-continuous-2 {
            animation: clockHandContinuous2 6s linear infinite;
          }
        `
      }} />

      {/* Logo Icon with continuous rotation */}
      <div className="relative group mb-4" style={{ perspective: '1000px' }}>
        {/* Main logo shape */}
        <div 
          className={`${sizes[size]} bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl shadow-2xl transform rotate-3 group-hover:rotate-6 transition-all duration-500 ease-out group-hover:scale-105`}
          style={{
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Beautiful clock design */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Outer clock ring - STATIC */}
              <div className="w-10 h-10 border-3 border-white rounded-full relative">
                {/* Hour markers - STATIC */}
                <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-white transform -translate-x-1/2 rounded-full"></div>
                <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-white transform -translate-y-1/2 rounded-full"></div>
                <div className="absolute bottom-0 left-1/2 w-0.5 h-2 bg-white transform -translate-x-1/2 rounded-full"></div>
                <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-white transform -translate-y-1/2 rounded-full"></div>
                
                {/* Additional hour markers for more detail */}
                <div className="absolute top-1 right-1 w-0.5 h-1 bg-white transform rotate-45 rounded-full"></div>
                <div className="absolute top-1 left-1 w-0.5 h-1 bg-white transform -rotate-45 rounded-full"></div>
                <div className="absolute bottom-1 right-1 w-0.5 h-1 bg-white transform -rotate-45 rounded-full"></div>
                <div className="absolute bottom-1 left-1 w-0.5 h-1 bg-white transform rotate-45 rounded-full"></div>
                
                {/* Clock hands - CONTINUOUSLY ROTATING */}
                <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-white origin-bottom rounded-full clock-hand-continuous-1"></div>
                <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-white origin-bottom rounded-full clock-hand-continuous-2"></div>
                
                {/* Center dot - STATIC with subtle glow */}
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background accent with enhanced effect */}
        <div className={`absolute inset-0 ${sizes[size]} bg-gradient-to-br from-blue-400 via-purple-400 to-indigo-500 rounded-2xl transform -rotate-3 group-hover:-rotate-6 transition-all duration-500 ease-out opacity-60 -z-10 group-hover:scale-110 group-hover:opacity-80 blur-sm`}></div>
      </div>

      {/* Brand Text */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black mb-1 tracking-tight">
          Ponteo
        </h1>
        <p className="text-sm text-black/70 font-medium">
          by Lensa
        </p>
      </div>
    </div>
  )
}