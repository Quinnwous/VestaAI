/**
 * Haversine-afstand in meters. Gebruikt voor de straal-uitsnede van de
 * verkoopkaart in het woningdossier (F5) — bij één kantoor is de
 * transactiedataset klein genoeg om dit application-side te filteren i.p.v.
 * een PostGIS ST_DWithin-query; de kolom zelf is wel `geography` zodat een
 * echte geo-query later zonder migratie kan.
 */
export function afstandMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const [lat1, lon1] = a
  const [lat2, lon2] = b
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
