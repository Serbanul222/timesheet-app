"use client"

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginForm } from '@/components/auth/LoginForm'
import { LogoLoginPage } from '@/components/ui/LogoLoginPage'

// Define particle type
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

// Floating particles background component with configurable options
const FloatingParticles = ({ 
  count = 50, 
  minSize = 2,
  maxSize = 6, 
  minDuration = 15, 
  maxDuration = 30 
}: {
  count?: number;
  minSize?: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
} = {}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: Math.random() * (maxDuration - minDuration) + minDuration,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, [count, minSize, maxSize, minDuration, maxDuration]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-blue-400 to-purple-400 opacity-20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function LoginPage() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen relative overflow-hidden">
        {/* Global CSS animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes float {
              0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
              25% { transform: translateY(-20px) translateX(10px) rotate(90deg); }
              50% { transform: translateY(-10px) translateX(-10px) rotate(180deg); }
              75% { transform: translateY(-30px) translateX(5px) rotate(270deg); }
            }
            .shadow-3xl {
              box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
            }
          `
        }} />

        {/* Dynamic gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10"></div>
        </div>

        {/* Floating particles - customizable */}
        <FloatingParticles 
          count={40} 
          minSize={3} 
          maxSize={8} 
          minDuration={12} 
          maxDuration={25} 
        />

        {/* Geometric background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            {/* Main 3D login card with tilt effect */}
            <div 
              className={`relative group transform transition-all duration-700 ease-out ${
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{
                perspective: '1000px',
              }}
            >
              {/* Card glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl scale-105 opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Main card */}
              <div 
                className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 transform transition-all duration-300 ease-out group-hover:scale-[1.02] group-hover:shadow-3xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(2deg) rotateY(-2deg)',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const mouseX = e.clientX - centerX;
                  const mouseY = e.clientY - centerY;
                  const rotateX = (mouseY / rect.height) * -10;
                  const rotateY = (mouseX / rect.width) * 10;
                  e.currentTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'rotateX(2deg) rotateY(-2deg) scale(1)';
                }}
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl"></div>
                
                {/* Content with new LogoLoginPage component */}
                <div className="relative z-10">
                  {/* Logo with continuous rotation - Updated */}
                  <div className="flex justify-center mb-8">
                    <LogoLoginPage size="lg" />
                  </div>

                  <LoginForm />
                </div>

                {/* Floating elements inside card */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-6 left-6 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Additional info */}
            <div 
              className={`text-center mt-8 transform transition-all duration-700 ease-out ${
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}