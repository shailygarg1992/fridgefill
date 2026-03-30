export default function HomeScreen({
  onScan, onStaples, onOrders, onConnectGmail, onDisconnectGmail, onSyncOrders,
  gmailConnected, orderCount, lastScanDate,
}) {
  const formatLastScan = () => {
    if (!lastScanDate) return 'Never scanned'
    const diff = Math.floor((Date.now() - new Date(lastScanDate)) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Scanned today'
    if (diff === 1) return 'Scanned yesterday'
    return `Scanned ${diff} days ago`
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-2">
        <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 48 48" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="8" y="6" width="32" height="38" rx="4" />
            <line x1="8" y1="16" x2="40" y2="16" />
            <line x1="24" y1="6" x2="24" y2="16" />
            <circle cx="18" cy="28" r="3" />
            <circle cx="30" cy="28" r="3" />
            <circle cx="24" cy="36" r="3" />
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-1">FridgeFill</h1>
      <p className="text-gray-500 text-base mb-8">Snap your fridge. Get your Walmart cart.</p>

      {/* Stats */}
      <div className="card w-full max-w-sm p-4 mb-6">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">{formatLastScan()}</span>
          <span className="text-gray-500">
            {gmailConnected
              ? `${orderCount} orders synced`
              : 'Orders every ~4-5 days'}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm space-y-3">
        <button onClick={onScan} className="btn-primary flex items-center justify-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          Scan My Fridge
        </button>

        {/* Gmail Connection */}
        {gmailConnected ? (
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Gmail Connected</p>
                <p className="text-xs text-gray-500">{orderCount} Walmart orders found</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onSyncOrders} className="flex-1 py-2 text-sm text-green-600 font-medium bg-green-50 rounded-lg">
                Refresh Orders
              </button>
              <button onClick={onOrders} className="flex-1 py-2 text-sm text-gray-600 font-medium bg-gray-50 rounded-lg">
                View Orders
              </button>
            </div>
            <button onClick={onDisconnectGmail} className="w-full mt-2 py-1.5 text-xs text-gray-400">
              Disconnect Gmail
            </button>
          </div>
        ) : (
          <button onClick={onConnectGmail} className="btn-secondary flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22 6L12 13 2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Connect Gmail for Order History
          </button>
        )}

        <button onClick={onStaples} className="btn-secondary">
          My Staples
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-12">
        Powered by Claude AI &middot; Walmart links
      </p>
    </div>
  )
}
