import { useState, useEffect } from 'react'

const MESSAGES = [
  'Opening fridge door...',
  'Scanning shelves...',
  'Checking expiration dates...',
  'Cross-referencing your staples...',
  'Calculating restock needs...',
  'Optimizing for free delivery...',
  'Checking for deals...',
  'Almost done...',
]

export default function AnalyzingScreen({ message }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      {/* Spinner */}
      <div className="mb-8">
        <div className="w-20 h-20 relative">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {message || 'Analyzing your fridge'}
      </h2>
      {!message && (
        <p className="text-gray-500 text-base transition-opacity duration-300" key={msgIndex}>
          {MESSAGES[msgIndex]}
        </p>
      )}
    </div>
  )
}
