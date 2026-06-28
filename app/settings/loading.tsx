export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-8" />

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {['Account', 'Huisstijl', 'Team'].map((label, i) => (
          <div key={label} className={`px-4 py-2 ${i === 0 ? 'border-b-2 border-blue-200' : ''}`}>
            <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${label.length * 8}px` }} />
          </div>
        ))}
      </div>

      {/* Fields skeleton */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}

        <div className="pt-4">
          <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  )
}
