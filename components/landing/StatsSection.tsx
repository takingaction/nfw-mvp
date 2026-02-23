'use client'

import { useEffect, useRef, useState } from 'react'

interface StatProps {
  value: string
  label: string
  color: string
  delay: number
}

function AnimatedStat({ value, label, color, delay }: StatProps) {
  const [displayValue, setDisplayValue] = useState('0')
  const [isVisible, setIsVisible] = useState(false)
  const statRef = useRef<HTMLDivElement>(null)

  // Parse the value properly (handles decimals like "2.5")
  const parseValue = (val: string) => {
    // Extract number (including decimals) and suffix
    const match = val.match(/([\d.]+)(.*)/)
    if (match) {
      return {
        number: parseFloat(match[1]),
        suffix: match[2]
      }
    }
    return { number: 0, suffix: '' }
  }

  const { number: targetNumber, suffix } = parseValue(value)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (statRef.current) {
      observer.observe(statRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const duration = 2000 // 2 seconds
    const steps = 60
    const increment = targetNumber / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= targetNumber) {
        // Format final value (preserve decimals if they exist)
        const formatted = targetNumber % 1 === 0 
          ? targetNumber.toString() 
          : targetNumber.toFixed(1)
        setDisplayValue(formatted + suffix)
        clearInterval(timer)
      } else {
        // Format intermediate value
        const formatted = targetNumber % 1 === 0 
          ? Math.floor(current).toString() 
          : current.toFixed(1)
        setDisplayValue(formatted + suffix)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, targetNumber, suffix])

  return (
    <div
      ref={statRef}
      className={`text-center transform transition-all duration-700 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`text-4xl sm:text-5xl lg:text-6xl font-black font-neonblitz mb-2 ${color}`}>
        {displayValue}
      </div>
      <div className="text-[#bcafcf] text-sm sm:text-base font-medium">
        {label}
      </div>
    </div>
  )
}

export default function StatsSection() {
  const stats = [
    { value: '50K+', label: 'Active Members', color: 'text-[#fdf493]' },
    { value: '$2.5M+', label: 'Grants Awarded', color: 'text-[#d4f1ad]' },
    { value: '50', label: 'States Represented', color: 'text-[#b2d1ee]' },
    { value: '1000+', label: 'Perks & Discounts', color: 'text-[#bcafcf]' }
  ]

  return (
    <div className="bg-black py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <AnimatedStat
              key={index}
              value={stat.value}
              label={stat.label}
              color={stat.color}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </div>
  )
}