import { createServiceSupabaseClient } from '@/lib/supabase'
import { bekijkTerugdraaiPlan, type TerugdraaiPreview } from './actions'

export type ImportStatus = 'bezig' | 'klaar' | 'mislukt' | 'teruggedraaid'

export type ImportHistorieRij = {
  id: string
  kantoorNaam: string
  bron: string
  bestandsnaam: string | null
  status: ImportStatus
  gestartOp: string
  aantalNieuw: number | null
  aantalBijgewerkt: number | null
  aantalUitgesloten: number | null
  /** Percentage rijen met dit `import_id` en `geocode_status = 'exact'`, of `null` als er geen rijen (meer) zijn. */
  geocodePercentage: number | null
  kwaliteitsrapportJson: unknown
  /**
   * Alleen gevuld voor de meest recente niet-teruggedraaide import per
   * kantoor — het al voorbereide terugdraai-plan (`bekijkTerugdraaiPlan`),
   * zodat de UI de aantallen meteen kan tonen. `null` = geen knop tonen.
   */
  terugdraaiPreview: TerugdraaiPreview | null
}

type ImportRuw = {
  id: string
  kantoor_id: string
  bron: string
  bestandsnaam: string | null
  status: ImportStatus
  gestart_op: string
  aantal_nieuw: number | null
  aantal_bijgewerkt: number | null
  aantal_uitgesloten: number | null
  kwaliteitsrapport_json: unknown
}

const MAX_IMPORTS = 25

/**
 * Importhistorie voor `/admin/transacties` (item 5.4): laatste 25 imports
 * (nieuwste eerst), met per import het geocode-percentage (één telling —
 * prima bij 25 rijen) en, voor de meest recente niet-teruggedraaide import
 * per kantoor, alvast het terugdraai-plan zodat de UI de aantallen meteen
 * kan tonen zonder eerst te hoeven klikken.
 */
export async function haalImportHistorie(
  kantoorNaamPerId: Map<string, string>,
): Promise<ImportHistorieRij[]> {
  const service = createServiceSupabaseClient()

  const { data } = await service
    .from('imports')
    .select('id, kantoor_id, bron, bestandsnaam, status, gestart_op, aantal_nieuw, aantal_bijgewerkt, aantal_uitgesloten, kwaliteitsrapport_json')
    .order('gestart_op', { ascending: false })
    .limit(MAX_IMPORTS)

  const rijen = (data ?? []) as ImportRuw[]

  const geocodePercentages = await Promise.all(rijen.map(async r => {
    const [totaal, exact] = await Promise.all([
      service.from('transacties').select('id', { count: 'exact', head: true }).eq('import_id', r.id),
      service.from('transacties').select('id', { count: 'exact', head: true }).eq('import_id', r.id).eq('geocode_status', 'exact'),
    ])
    const totaalAantal = totaal.count ?? 0
    return totaalAantal > 0 ? Math.round(((exact.count ?? 0) / totaalAantal) * 100) : null
  }))

  // Nieuwste eerst: de eerste niet-teruggedraaide rij per kantoor is de "laatste".
  const laatsteGezienPerKantoor = new Set<string>()
  const isLaatsteNietTeruggedraaid = rijen.map(r => {
    if (r.status === 'teruggedraaid' || laatsteGezienPerKantoor.has(r.kantoor_id)) return false
    laatsteGezienPerKantoor.add(r.kantoor_id)
    return true
  })

  const terugdraaiPreviews = await Promise.all(
    rijen.map((r, i) => (isLaatsteNietTeruggedraaid[i] ? bekijkTerugdraaiPlan(r.id) : Promise.resolve(null))),
  )

  return rijen.map((r, i) => ({
    id: r.id,
    kantoorNaam: kantoorNaamPerId.get(r.kantoor_id) ?? 'Onbekend kantoor',
    bron: r.bron,
    bestandsnaam: r.bestandsnaam,
    status: r.status,
    gestartOp: r.gestart_op,
    aantalNieuw: r.aantal_nieuw,
    aantalBijgewerkt: r.aantal_bijgewerkt,
    aantalUitgesloten: r.aantal_uitgesloten,
    geocodePercentage: geocodePercentages[i],
    kwaliteitsrapportJson: r.kwaliteitsrapport_json,
    terugdraaiPreview: terugdraaiPreviews[i],
  }))
}
