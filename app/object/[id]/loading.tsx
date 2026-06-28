export default function ObjectDetailLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-6 w-72 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* InvoerToggle skeleton */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* ResultTabs skeleton */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
        {/* Tab bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-100 mb-6">
          {['Funda', 'Brochure', 'Instagram', 'LinkedIn', 'E-mail', 'Buurt'].map((label, i) => (
            <div key={label} className={`px-4 py-2 text-sm ${i === 0 ? 'border-b-2 border-blue-200' : ''}`}>
              <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${label.length * 8}px` }} />
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-100 rounded animate-pulse"
              style={{ width: `${60 + Math.sin(i) * 30}%` }}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
