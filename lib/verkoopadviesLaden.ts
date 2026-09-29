/**
 * Server-loader voor het verkoopadvies-datacontract (item K1). Fase 11: het
 * contract is stabiel; secties/pdf volgen op het voorbeeld van Quinn. Dit
 * bestand heeft geen route en geen UI — puur de database-toegang die
 * `bouwVerkoopadviesInput()` (lib/verkoopadvies.ts) voedt.
 *
 * Server-only: gebruikt `SessieClient` (RLS actief), nooit de service-client
 * — zelfde principe als lib/transactiesQuery.ts. `haalVerkoopadviesInput()`
 * zoekt het dossier bij `objectId`, en geeft `null` terug zodra het niet
 * bestaat of niet bij het eigen kantoor hoort (zelfde toegangsregel als
 * `app/api/pdf/waardebepaling/route.ts`).
 */

import type { SessieClient, MarktanalyseSamenvatting } from './transactiesQuery'
import { dataTotEnMet, marktanalyseSamenvatting } from './transactiesQuery'
import { PropertyInputSchema, type KantoorInstellingen } from './schemas'
import { meldFout } from './fouten'
import {
  bouwVerkoopadviesInput,
  verkoopadviesMarktcontextFilter,
  type VerkoopadviesInput,
} from './verkoopadvies'

const MARKTCONTEXT_PERIODE_MAANDEN = 24

type KantoorRij = {
  name: string | null
  huisstijl_json: Record<string, unknown> | null
  instellingen_json: KantoorInstellingen | null
} | null

/**
 * Periode voor de marktcontext-RPC: 24 maanden, verankerd aan de laatste
 * verkoopdatum in de dataset — niet aan "vandaag". Zelfde reden als
 * `app/api/object/[id]/verrijking/route.ts`: bij een dataset die eerder
 * ophoudt dan vandaag zou "vandaag" een venster met te weinig data geven,
 * terwijl er verderop in de dataset wél genoeg staat.
 */
async function marktcontextPeriode(client: SessieClient): Promise<{ datum_van: string; datum_tot: string }> {
  const { laatsteVerkoopdatum } = await dataTotEnMet(client)
  const tot = laatsteVerkoopdatum ? new Date(laatsteVerkoopdatum) : new Date()
  const van = new Date(tot)
  van.setUTCMonth(van.getUTCMonth() - MARKTCONTEXT_PERIODE_MAANDEN)
  return {
    datum_van: van.toISOString().slice(0, 10),
    datum_tot: tot.toISOString().slice(0, 10),
  }
}

/**
 * Haalt de marktcontext op voor dit dossier (plaats + typegroep, 24
 * maanden). Best-effort: een RPC-fout laat de rest van het contract niet
 * klappen — de gereedheidscheck ziet een ontbrekende marktcontext gewoon als
 * `ontbreekt` (zelfde robuustheidsregel als CLAUDE.md § verrijking).
 */
async function haalMarktcontext(
  client: SessieClient,
  dossierRuw: unknown,
  objectId: string,
): Promise<MarktanalyseSamenvatting | null> {
  const parsed = PropertyInputSchema.safeParse(dossierRuw)
  if (!parsed.success) return null

  const filter = verkoopadviesMarktcontextFilter(parsed.data)
  if (!filter) return null

  try {
    const { datum_van, datum_tot } = await marktcontextPeriode(client)
    return await marktanalyseSamenvatting(client, {
      plaatsen: filter.plaatsen,
      typen: filter.typen,
      datum_van,
      datum_tot,
    })
  } catch (err) {
    meldFout('verkoopadviesLaden:marktcontext', err, { objectId })
    return null
  }
}

/**
 * Haalt het volledige `VerkoopadviesInput`-contract op voor het dossier
 * `objectId`. `null` als er geen ingelogde gebruiker is, geen leesbaar
 * makelaar-record, of het dossier niet bij het eigen kantoor hoort.
 */
export async function haalVerkoopadviesInput(client: SessieClient, objectId: string): Promise<VerkoopadviesInput | null> {
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const { data: makelaar } = await client
    .from('makelaars')
    .select('kantoor_id, name, email, kantoren(name, huisstijl_json, instellingen_json)')
    .eq('id', user.id)
    .single()
  if (!makelaar) return null

  const { data: object } = await client
    .from('objecten')
    .select('kantoor_id, address, input_json, waardering_json')
    .eq('id', objectId)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()
  if (!object) return null

  const kantoor = makelaar.kantoren as unknown as KantoorRij
  const marktcontext = await haalMarktcontext(client, object.input_json, objectId)

  return bouwVerkoopadviesInput({
    inputJson: object.input_json,
    waarderingJson: object.waardering_json,
    kantoor: kantoor ? { name: kantoor.name, huisstijl_json: kantoor.huisstijl_json } : null,
    kantoorInstellingen: kantoor?.instellingen_json ?? null,
    marktcontext,
    makelaar: { naam: makelaar.name, email: makelaar.email },
  })
}
