import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import CameraCapture from './components/CameraCapture'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import StaplesScreen from './components/StaplesScreen'
import { analyzeFridge, imageToBase64 } from './utils/api'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [photos, setPhotos] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [lastScanDate, setLastScanDate] = useState(
    localStorage.getItem('lastScanDate')
  )

  const handleCapture = (newPhotos) => {
    setPhotos(newPhotos)
  }

  const handleAnalyze = async () => {
    setScreen('analyzing')
    setError(null)

    try {
      const base64Images = await Promise.all(photos.map(imageToBase64))
      const data = await analyzeFridge(base64Images)
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

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {screen === 'home' && (
        <HomeScreen
          onScan={() => setScreen('camera')}
          onStaples={() => setScreen('staples')}
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
      {screen === 'results' && results && (
        <ResultsScreen
          results={results}
          onBack={handleReset}
        />
      )}
      {screen === 'staples' && (
        <StaplesScreen onBack={() => setScreen('home')} />
      )}
    </div>
  )
}
