import { useState, useRef, useEffect, useCallback } from 'react'
import { getWalmartLink, searchWalmartProduct } from '../utils/api'
import FillCartButton from './FillCartButton'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

function ProductThumbnail({ image, name, loading }) {
  if (loading) {
    return (
      <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 animate-pulse" />
    )
  }
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="shrink-0 w-12 h-12 rounded-lg object-cover bg-gray-50"
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
    </div>
  )
}

export default function QuickAddScreen({ onBack }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const fetchThumbnail = useCallback(async (name, index) => {
    const product = await searchWalmartProduct(name)
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        image: product?.image || null,
        matchedName: product?.name || null,
        price: product?.price || null,
        loading: false,
      }
    }))
  }, [])

  function addItem(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = items.find(i => i.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      setItems(prev => prev.map(i =>
        i.name.toLowerCase() === trimmed.toLowerCase()
          ? { ...i, qty: i.qty + 1 }
          : i
      ))
    } else {
      const newIndex = items.length
      setItems(prev => [...prev, {
        name: trimmed,
        qty: 1,
        walmart_search: trimmed,
        unit_price: 0,
        image: null,
        matchedName: null,
        loading: true,
      }])
      fetchThumbnail(trimmed, newIndex)
    }
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateQty(index, delta) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const newQty = item.qty + delta
      return newQty >= 1 ? { ...item, qty: newQty } : item
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    const parts = query.split(',').map(s => s.trim()).filter(Boolean)
    parts.forEach(addItem)
    setQuery('')
  }

  function toggleMic() {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome on desktop.')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += t
        } else {
          interim = t
        }
      }
      if (final) {
        const parts = final
          .split(/,|and\s/i)
          .map(s => s.trim())
          .filter(Boolean)
        parts.forEach(addItem)
        setTranscript('')
      } else {
        setTranscript(interim)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error('Speech error:', event.error)
      }
      setListening(false)
      setTranscript('')
    }

    recognition.onend = () => {
      setListening(false)
      setTranscript('')
    }

    recognition.start()
    setListening(true)
  }

  useEffect(() => {
    return () => recognitionRef.current?.stop()
  }, [])

  const restockList = items.map(i => ({
    item: i.matchedName || i.name,
    name: i.matchedName || i.name,
    qty: i.qty,
    quantity: i.qty,
    walmart_search: i.walmart_search,
    unit_price: i.price ? parseFloat(i.price.replace(/[^0-9.]/g, '')) || 0 : 0,
  }))

  return (
    <div className="min-h-screen bg-white pb-36">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-14 pb-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-green-600 font-medium text-sm">
            Back
          </button>
          <h2 className="font-semibold text-gray-900 text-base">Quick Add</h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Search + Mic */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type items (comma separated)..."
              className="w-full pl-4 pr-10 py-3 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleMic}
            className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-green-600 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          {query.trim() && (
            <button
              type="submit"
              className="shrink-0 w-12 h-12 rounded-xl bg-green-600 text-white flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </form>

        {/* Listening indicator */}
        {listening && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-700 font-medium">Listening...</span>
            </div>
            {transcript && (
              <p className="text-sm text-red-600 mt-1 italic">"{transcript}"</p>
            )}
            <p className="text-xs text-red-400 mt-1">
              Say items separated by "and" or pause between them
            </p>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && !listening && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-1">No items yet</p>
            <p className="text-gray-400 text-xs">
              Type item names or tap the mic to speak
            </p>
          </div>
        )}

        {/* Item list */}
        {items.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Your Items ({items.length})
            </h3>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                <ProductThumbnail image={item.image} name={item.name} loading={item.loading} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-tight">{item.name}</p>
                  {item.matchedName && item.matchedName.toLowerCase() !== item.name.toLowerCase() && (
                    <p className="text-xs text-green-600 truncate mt-0.5">{item.matchedName}</p>
                  )}
                  {item.price && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.price}</p>
                  )}
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQty(index, -1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-900 w-4 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(index, 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => removeItem(index)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-6 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-400">Ready to add to Walmart cart</p>
            </div>
            <FillCartButton restockList={restockList} />
          </div>
        </div>
      )}
    </div>
  )
}
