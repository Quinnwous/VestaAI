/**
 * Pure logica achter scripts/backup-data.mjs (item F2, zie
 * docs/werkwijze.md § 5 "Vangrails productiedatabase"). Los van Supabase/het
 * bestandssysteem zodat ze zonder database- of Storage-verbinding getest
 * kunnen worden — zie scripts/lib/backupPijplijn.test.ts.
 *
 * Vier taken:
 * 1. `berekenPaginas()` — dezelfde paginering als een tabel-select (Supabase
 *    geeft standaard hooguit 1000 rijen per request terug), nu als pure
 *    functie zodat de randgevallen (0 rijen, exact een veelvoud van de
 *    paginagrootte) los van een echte databaseverbinding getest zijn.
 * 2. `storageBestandsPad()` — het enige punt waar een Storage-objectpad wordt
 *    omgezet naar een lokaal bestandspad, met een vangrail tegen `..` in een
 *    bucket- of objectnaam (padtraversal buiten de back-upmap).
 * 3. `isStorageMap()` — onderscheidt een "map" van een bestand in de respons
 *    van `storage.from(bucket).list()` (Supabase geeft een map terug als een
 *    item met `id === null`).
 * 4. `maakManifest()` / `vindTabelMismatches()` — bouwen resp. controleren het
 *    manifest dat na een back-up bewaart hoeveel rijen/bestanden er horen te
 *    zijn, zodat een herstel kan verifiëren dat alles terug is
 *    (docs/werkwijze.md § 5 "Herstelprocedure").
 */

/**
 * Levert de [from, to]-reeks (inclusief, net als Supabase's `.range()`) die
 * `totaalRijen` rijen in pagina's van `paginaGrootte` opdeelt. Minimaal één
 * pagina, ook bij `totaalRijen === 0` — dezelfde reden als de huidige
 * leesloop: een `count()` van 0 moet nog steeds één keer bevestigd worden
 * (geen stille aanname dat de tabel leeg is).
 */
export function berekenPaginas(totaalRijen, paginaGrootte) {
  if (!Number.isFinite(paginaGrootte) || paginaGrootte <= 0) {
    throw new Error(`berekenPaginas: ongeldige paginaGrootte (${paginaGrootte})`)
  }
  const n = Number.isFinite(totaalRijen) && totaalRijen > 0 ? totaalRijen : 0
  const paginas = []
  for (let from = 0; from < n || from === 0; from += paginaGrootte) {
    paginas.push({ from, to: from + paginaGrootte - 1 })
  }
  return paginas
}

/**
 * Lokaal pad voor een Storage-object binnen de back-upmap:
 * `<backupDir>/storage/<bucket>/<objectPad>`. Weigert een `..`-segment in
 * bucket- of objectnaam (padtraversal) — Storage-namen komen uit onze eigen
 * upload-code, maar een vangrail hier is goedkoper dan een vergissing die
 * buiten de back-upmap schrijft.
 */
export function storageBestandsPad(backupDir, bucket, objectPad) {
  for (const [label, segment] of [['bucket', bucket], ['objectPad', objectPad]]) {
    if (!segment || typeof segment !== 'string') {
      throw new Error(`storageBestandsPad: lege of ongeldige ${label}`)
    }
    if (segment.split('/').some((deel) => deel === '..')) {
      throw new Error(`storageBestandsPad: padtraversal geweigerd in ${label} ("${segment}")`)
    }
  }
  return [backupDir, 'storage', bucket, ...objectPad.split('/')].join('/')
}

/**
 * Een item uit `storage.from(bucket).list()` is een map zodra Supabase geen
 * object-id teruggeeft (bestanden hebben er altijd een) — dat is het enige
 * onderscheid dat de Storage-API biedt tussen een map en een bestand.
 */
export function isStorageMap(item) {
  return item != null && item.id === null
}

/** Som van bestandsaantal en bytes over een lijst `{ aantalBestanden, totaalBytes }`-resultaten. */
export function telStorageTotalen(bucketResultaten) {
  return bucketResultaten.reduce(
    (acc, r) => ({
      aantalBestanden: acc.aantalBestanden + r.aantalBestanden,
      totaalBytes: acc.totaalBytes + r.totaalBytes,
    }),
    { aantalBestanden: 0, totaalBytes: 0 }
  )
}

/**
 * Tabellen waarvan het weggeschreven aantal rijen niet overeenkomt met het
 * onafhankelijk getelde aantal (en die niet bewust zijn overgeslagen, bv.
 * omdat de tabel nog niet bestaat) — een back-up met zo'n afwijking is
 * incompleet en mag niet als vangnet gelden.
 */
export function vindTabelMismatches(resultaten) {
  return resultaten.filter((r) => !r.overgeslagen && r.aantal !== r.verwacht)
}

/**
 * Bouwt het manifest dat na een back-up wordt weggeschreven: tijdstip, per
 * tabel het aantal rijen (en of dat klopt met de onafhankelijke telling), en
 * per Storage-bucket het aantal bestanden en bytes — zodat een herstel kan
 * controleren of alles terug is (docs/werkwijze.md § 5).
 */
export function maakManifest({ tijdstip, tabellen, storage }) {
  if (!tijdstip || typeof tijdstip !== 'string') {
    throw new Error('maakManifest: tijdstip ontbreekt')
  }
  if (!Array.isArray(tabellen)) {
    throw new Error('maakManifest: tabellen moet een lijst zijn')
  }
  const mismatches = vindTabelMismatches(tabellen)
  return {
    tijdstip,
    volledig: mismatches.length === 0,
    tabellen: tabellen.map((r) => ({
      naam: r.naam,
      overgeslagen: Boolean(r.overgeslagen),
      aantal: r.overgeslagen ? null : r.aantal,
      verwacht: r.overgeslagen ? null : r.verwacht,
      klopt: r.overgeslagen ? null : r.aantal === r.verwacht,
    })),
    storage: storage.overgeslagen
      ? { overgeslagen: true, buckets: [] }
      : {
          overgeslagen: false,
          buckets: storage.buckets.map((b) => ({
            naam: b.naam,
            aantalBestanden: b.aantalBestanden,
            totaalBytes: b.totaalBytes,
          })),
          ...telStorageTotalen(storage.buckets),
        },
  }
}
