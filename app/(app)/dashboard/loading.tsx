export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Zoekbalk skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 h-9 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-9 w-16 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Count label */}
      <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-3" />

      {/* Object-kaartjes skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="space-y-1.5">
              <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${140 + (i % 3) * 40}px` }} />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  )
}
