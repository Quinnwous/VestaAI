/**
 * Pure hulplogica voor de samengevoegde dossierkaart (item "Twee kaarten in
 * het dossier samenvoegen", docs/roadmap.md § 9): de referentiekaart van de
 * waardering (item 4.6) en het straalpaneel "In de buurt verkocht" (item
 * 7.3) zijn één kaart geworden met een laagschakelaar
 * (`components/WaarderingKaart.tsx`). Los van React/MapLibre zodat de
 * laagkeuze, straal en het kader met vitest te testen zijn.
 */
import { kaderRondStraal } from './geo'

export type DossierKaartLaag = 'referenties' | 'verkopen'

/** Straalopties voor de laag "Eigen verkopen" — zelfde reeks als het vroegere StraalKaartPaneel. */
export const VERKOOP_STRAAL_OPTIES = [250, 500, 1000] as const
export type VerkoopStraal = (typeof VERKOOP_STRAAL_OPTIES)[number]
export const VERKOOP_STRAAL_STANDAARD: VerkoopStraal = 500

/** Terugval-straal voor de referentielaag als de waardering geen straal_m
 * heeft (methode "plaats") — zelfde marge die de oude WaarderingKaart al
 * gebruikte. */
const REFERENTIE_STRAAL_TERUGVAL = 750

/** "500 m" / "1 km" — voor de straal-pillen en het telbericht. */
export function straalLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toLocaleString('nl-NL')} km` : `${m} m`
}

/**
 * Kaartkader voor de actieve laag: de referentie-straal uit de
 * waarderingsuitkomst voor "referenties" (verbreedt zelf al bij weinig
 * data, valt terug op 750 m zonder straal), de gekozen straal-pil voor
 * "verkopen" — onafhankelijk van elkaar, zodat het wisselen van laag nooit
 * de verkeerde cirkel toont.
 */
export function bepaalDossierKaartBounds(
  subject: { lat: number; lng: number },
  laag: DossierKaartLaag,
  straalReferenties: number | null,
  straalVerkopen: number,
): [[number, number], [number, number]] {
  const straal = laag === 'verkopen' ? straalVerkopen : (straalReferenties ?? REFERENTIE_STRAAL_TERUGVAL)
  return kaderRondStraal(subject.lat, subject.lng, straal)
}

/**
 * Standaardlaag zodra de waarderingsuitkomst binnen is: zijn er geen
 * (actieve) referenties maar wél eigen verkopen, dan opent de kaart op
 * "Eigen verkopen" i.p.v. een lege referentiekaart. Anders blijft
 * "Referenties" de standaard — ook als er van geen van beide iets is (dan
 * toont de referentielaag gewoon het subject-pin en een lege staat).
 */
export function bepaalStandaardLaag(aantalReferenties: number, aantalEigenVerkopen: number): DossierKaartLaag {
  return aantalReferenties === 0 && aantalEigenVerkopen > 0 ? 'verkopen' : 'referenties'
}
