export default function NewObjectLoading() {
  const FIELDS = [
    { label: 'Adres', wide: true },
    { label: 'Woningtype', wide: false },
    { label: 'Kamers', wide: false },
    { label: 'Oppervlak (m²)', wide: false },
    { label: 'Bouwjaar', wide: false },
    { label: 'Energielabel', wide: false },
    { label: 'Vraagprijs (€)', wide: false },
    { label: "USP's", wide: true, tall: true },
    { label: 'Doelgroep', wide: true },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
          {/* Title */}
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-8" />

          <div className="grid grid-cols-2 gap-5">
            {FIELDS.map(({ label, wide, tall }) => (
              <div key={label} className={wide ? 'col-span-2' : 'col-span-1'}>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div
                  className="bg-gray-100 rounded-lg animate-pulse"
                  style={{ height: tall ? '80px' : '40px' }}
                />
              </div>
            ))}
          </div>

          {/* Submit button */}
          <div className="h-11 bg-blue-100 rounded-xl animate-pulse mt-8" />
        </div>
      </div>
    </main>
  )
}
