import { daysSince } from '../utils/api'

export default function OrderHistoryScreen({ orders, onBack, onSync }) {
  const sortedOrders = orders
    ? [...orders].sort((a, b) => new Date(b.order_date || b.date) - new Date(a.order_date || a.date))
    : []

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 pt-14 pb-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-green-600 font-medium text-sm">
            Back
          </button>
          <h2 className="font-semibold text-gray-900">Order History</h2>
          <button onClick={onSync} className="text-green-600 font-medium text-sm">
            Sync
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {!orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">No orders yet</p>
            <p className="text-gray-400 text-sm">Connect Gmail to sync your Walmart orders</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {sortedOrders.length} orders from Gmail
            </p>

            {sortedOrders.map((order, i) => {
              const date = order.order_date || order.date
              const items = order.items || []
              const total = items.reduce((sum, item) => sum + (item.price || 0), 0)
              const days = daysSince(date)

              return (
                <div key={i} className="card mb-3 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">{days} days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">${total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{items.length} items</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item, j) => (
                      <div key={j} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate flex-1 mr-3">
                          {item.qty > 1 && <span className="text-gray-400">{item.qty}x </span>}
                          {item.name}
                        </span>
                        <span className="text-gray-500 shrink-0">${(item.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
