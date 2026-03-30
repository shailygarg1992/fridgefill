import { useState, useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
import CameraCapture from './components/CameraCapture'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import StaplesScreen from './components/StaplesScreen'
import OrderHistoryScreen from './components/OrderHistoryScreen'
import { analyzeFridge, imageToBase64 } from './utils/api'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [photos, setPhotos] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [lastScanDate, setLastScanDate] = useState(
    localStorage.getItem('lastScanDate')
  )
  const [gmailConnected, setGmailConnected] = useState(
    !!localStorage.getItem('gmail_token')
  )
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('parsed_orders')
    return saved ? JSON.parse(saved) : null
  })

  // Handle OAuth redirect — when Google sends the user back with a token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('gmail_token')
    const refresh = params.get('gmail_refresh')

    if (token) {
      localStorage.setItem('gmail_token', token)
      if (refresh) localStorage.setItem('gmail_refresh', refresh)
      setGmailConnected(true)

      // Clean the URL so the token isn't visible in the address bar
      window.history.replaceState({}, '', '/')

      // Automatically fetch orders after connecting
      fetchOrders(token)
    }
  }, [])

  const fetchOrders = async (token) => {
    const gmailToken = token || localStorage.getItem('gmail_token')
    if (!gmailToken) return

    setScreen('syncing')
    try {
      const response = await fetch('/api/parse-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmail_token: gmailToken }),
      })

      if (response.status === 401) {
        // Token expired — need to reconnect
        localStorage.removeItem('gmail_token')
        setGmailConnected(false)
        setError('Gmail session expired. Please reconnect.')
        setScreen('home')
        return
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || `Server error ${response.status}`)
      }

      const data = await response.json()
      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders)
        localStorage.setItem('parsed_orders', JSON.stringify(data.orders))
      } else {
        setError(`Found ${data.emails_found || 0} emails but couldn't extract items. ${data.message || ''}`)
      }
      setScreen('home')
    } catch (err) {
      setError(err.message)
      setScreen('home')
    }
  }

  const handleCapture = (newPhotos) => {
    setPhotos(newPhotos)
  }

  const handleAnalyze = async () => {
    setScreen('analyzing')
    setError(null)

    try {
      const base64Images = await Promise.all(photos.map(imageToBase64))
      const data = await analyzeFridge(base64Images, orders)
      setResults(data)
      const now = new Date().toISOString()
      setLastScanDate(now)
      localStorage.setItem('lastScanDate', now)
      setScreen('results')
    } catch (err) {
      setError(err.message)
      setScreen('camera')
    }
  }

  const handleReset = () => {
    setPhotos([])
    setResults(null)
    setError(null)
    setScreen('home')
  }

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google'
  }

  const handleDisconnectGmail = () => {
    localStorage.removeItem('gmail_token')
    localStorage.removeItem('gmail_refresh')
    localStorage.removeItem('parsed_orders')
    setGmailConnected(false)
    setOrders(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {screen === 'home' && (
        <HomeScreen
          onScan={() => setScreen('camera')}
          onStaples={() => setScreen('staples')}
          onOrders={() => setScreen('orders')}
          onConnectGmail={handleConnectGmail}
          onDisconnectGmail={handleDisconnectGmail}
          onSyncOrders={() => fetchOrders()}
          gmailConnected={gmailConnected}
          orderCount={orders?.length || 0}
          lastScanDate={lastScanDate}
        />
      )}
      {screen === 'camera' && (
        <CameraCapture
          photos={photos}
          onCapture={handleCapture}
          onAnalyze={handleAnalyze}
          onBack={() => { setPhotos([]); setScreen('home') }}
          error={error}
        />
      )}
      {screen === 'analyzing' && <AnalyzingScreen />}
      {screen === 'syncing' && <AnalyzingScreen message="Syncing your Walmart orders..." />}
      {screen === 'results' && results && (
        <ResultsScreen
          results={results}
          onBack={handleReset}
        />
      )}
      {screen === 'staples' && (
        <StaplesScreen onBack={() => setScreen('home')} />
      )}
      {screen === 'orders' && (
        <OrderHistoryScreen
          orders={orders}
          onBack={() => setScreen('home')}
          onSync={() => fetchOrders()}
        />
      )}
    </div>
  )
}
