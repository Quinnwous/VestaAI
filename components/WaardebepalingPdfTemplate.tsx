import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { PropertyInput, WaarderingCorrectieSchema } from '@/lib/schemas'
import { woningtypeLabel } from '@/lib/schemas'
import type { CorrectieNaam, WaarderingUitkomst } from '@/lib/waardering'
import type { z } from 'zod'

type Correctie = z.infer<typeof WaarderingCorrectieSchema>

interface Props {
  address: string
  input: PropertyInput
  uitkomst: WaarderingUitkomst
  correctie: Correctie | null
  kantoor: { naam: string; logoUrl: string | null; kleur: string }
  makelaarNaam: string
  opgesteldOp: string
}

// ── Formattering (spec: § 3.3 + item 4.7 — nl-NL, komma-decimalen) ────────
function euro(n: number | null): string {
  return n == null ? '—' : `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

function datumLang(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function datumKort(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getal(n: number, decimalen = 2): string {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })
}

// Zelfde labels en volgorde als de correctie-chips in WaardebepalingPaneel.tsx —
// de pdf mag geen ander verhaal vertellen dan het scherm waar de makelaar hem opent.
const KENMERK_LABEL: Record<CorrectieNaam, string> = {
  garage: 'Garage',
  tuin: 'Tuin',
  energielabel: 'Energielabelklasse',
  bouwperiode: 'Bouwperiode',
  grootte: 'Grootte (m²)',
}
const KENMERK_VOLGORDE: CorrectieNaam[] = ['garage', 'tuin', 'energielabel', 'bouwperiode', 'grootte']

function makeStyles(kleur: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#14181B',
      backgroundColor: '#ffffff',
      padding: 36,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: kleur,
    },
    logoImg: { height: 26, objectFit: 'contain' },
    kantoorNaam: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: kleur },
    titel: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#14181B' },
    adres: { fontSize: 11, color: '#374151', marginTop: 2 },
    kenmerken: { fontSize: 8.5, color: '#6B7280', marginTop: 3 },
    heroRow: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 12,
    },
    heroBlok: {
      flex: 1,
      backgroundColor: kleur,
      borderRadius: 6,
      padding: 12,
    },
    heroLabel: { fontSize: 8, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
    heroWaarde: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    heroBand: { fontSize: 8.5, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    badgesBlok: { flex: 1, justifyContent: 'center', gap: 4 },
    badgeRij: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8.5, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', paddingBottom: 3 },
    badgeLabel: { color: '#6B7280' },
    badgeWaarde: { fontFamily: 'Helvetica-Bold', color: '#14181B' },
    sectieTitel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#14181B', marginBottom: 5, marginTop: 10 },
    tabel: { borderWidth: 0.5, borderColor: '#E5E7EB', borderRadius: 3 },
    tabelRij: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    tabelRijLaatste: { flexDirection: 'row' },
    tabelKopCel: { fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', padding: '4 4', backgroundColor: '#F7F8F9' },
    tabelCel: { fontSize: 7.5, color: '#374151', padding: '4 4' },
    colAdres: { width: '22%' },
    colAfstand: { width: '9%', textAlign: 'right' },
    colDatum: { width: '11%' },
    colPrijs: { width: '12%', textAlign: 'right' },
    colM2: { width: '7%', textAlign: 'right' },
    colM2Prijs: { width: '11%', textAlign: 'right' },
    colIndex: { width: '8%', textAlign: 'right' },
    colGewicht: { width: '8%', textAlign: 'right' },
    colImpliceerd: { width: '12%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
    kenmerkRij: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', paddingVertical: 4 },
    kenmerkLabel: { width: '32%', fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#14181B' },
    kenmerkToelichting: { width: '68%', fontSize: 8, color: '#374151' },
    correctieBlok: {
      marginTop: 10,
      backgroundColor: '#FFFBEE',
      borderWidth: 0.5,
      borderColor: '#F1DFA6',
      borderRadius: 4,
      padding: 10,
    },
    correctieTitel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#7A5A00', marginBottom: 2 },
    correctieTekst: { fontSize: 8.5, color: '#5C4A00', lineHeight: 1.4 },
    disclaimer: {
      marginTop: 14,
      fontSize: 7.5,
      color: '#9CA3AF',
      lineHeight: 1.4,
      borderTopWidth: 0.5,
      borderTopColor: '#E5E7EB',
      paddingTop: 8,
    },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 36,
      right: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7.5,
      color: '#9CA3AF',
    },
    waarschuwingBlok: { marginTop: 8, backgroundColor: '#FFFBEE', borderWidth: 0.5, borderColor: '#F1DFA6', borderRadius: 4, padding: '7 10' },
    waarschuwing: { fontSize: 7.5, color: '#7A5A00', lineHeight: 1.4 },
  })
}

export function WaardebepalingPdfTemplate({ address, input, uitkomst, correctie, kantoor, makelaarNaam, opgesteldOp }: Props) {
  const s = makeStyles(kantoor.kleur)

  const kenmerken = [
    woningtypeLabel(input),
    `${input.kamers} kamers`,
    `${input.oppervlak_m2} m²`,
    `bouwjaar ${input.bouwjaar}`,
    `label ${input.energielabel}`,
  ].filter(Boolean).join(' · ')

  const top6 = [...uitkomst.referenties].sort((a, b) => b.gewicht - a.gewicht).slice(0, 6)

  // Alleen wat écht is meegerekend én de waarde ook beweegt. De toelichting komt
  // kant-en-klaar uit lib/waardering.ts en noemt de referentieklasse ("A-B +7 %
  // t.o.v. C-D"), leesbaarder in een klantdocument dan een kaal percentage.
  // Een kenmerk waarvan de woning ín de referentieklasse valt levert "+0 % t.o.v.
  // zichzelf" op: op het scherm nuttig naast een aan/uit-chip ("gecheckt, neutraal"),
  // in een pdf voor de verkoper alleen ruis. Die laten we hier weg.
  const beweegt = (naam: CorrectieNaam): boolean =>
    naam === 'grootte' ? !!uitkomst.grootte && uitkomst.grootte.perM2Pct !== 0 : !!uitkomst.effecten[naam]?.verschilPct
  const toegepasteKenmerken = KENMERK_VOLGORDE
    .map(naam => ({ naam, status: uitkomst.correcties[naam] }))
    .filter(({ naam, status }) => status?.toegepast && beweegt(naam))

  const straalLabel = uitkomst.straal_m == null ? '—' : uitkomst.straal_m >= 1000 ? `${uitkomst.straal_m / 1000} km` : `${uitkomst.straal_m} m`
  const indexBasisLabel = uitkomst.index_basis === 'eigen' ? 'eigen data' : uitkomst.index_basis === 'cbs' ? 'CBS' : 'geen correctie'

  return (
    <Document title={`Waardebepaling — ${address}`} author={kantoor.naam} creator={kantoor.naam}>
      <Page size="A4" style={s.page}>
        {/* Kop */}
        <View style={s.header}>
          <View>
            <Text style={s.titel}>Waardebepaling</Text>
            <Text style={s.adres}>{address}</Text>
            <Text style={s.kenmerken}>{kenmerken}</Text>
          </View>
          {kantoor.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
            <Image src={kantoor.logoUrl} style={s.logoImg} />
          ) : (
            <Text style={s.kantoorNaam}>{kantoor.naam}</Text>
          )}
        </View>

        {/* Waarde + bandbreedte + badges */}
        <View style={s.heroRow}>
          <View style={s.heroBlok}>
            <Text style={s.heroLabel}>Indicatieve waarde</Text>
            <Text style={s.heroWaarde}>{euro(uitkomst.waarde)}</Text>
            <Text style={s.heroBand}>Bandbreedte {euro(uitkomst.laag)} – {euro(uitkomst.hoog)}</Text>
          </View>
          <View style={s.badgesBlok}>
            <View style={s.badgeRij}><Text style={s.badgeLabel}>Referenties</Text><Text style={s.badgeWaarde}>n = {uitkomst.n}</Text></View>
            <View style={s.badgeRij}>
              <Text style={s.badgeLabel}>{uitkomst.methode === 'plaats' ? 'Selectie' : 'Straal'}</Text>
              <Text style={s.badgeWaarde}>{uitkomst.methode === 'plaats' ? 'op plaats en woningtype' : straalLabel}</Text>
            </View>
            <View style={s.badgeRij}><Text style={s.badgeLabel}>Index t/m</Text><Text style={s.badgeWaarde}>{uitkomst.index_tm ?? '—'} ({indexBasisLabel})</Text></View>
            <View style={s.badgeRij}><Text style={s.badgeLabel}>Peildatum</Text><Text style={s.badgeWaarde}>{datumKort(uitkomst.peildatum)}</Text></View>
            {uitkomst.woz && (
              <View style={s.badgeRij}><Text style={s.badgeLabel}>WOZ-ijkpunt</Text><Text style={s.badgeWaarde}>{euro(uitkomst.woz.waarde)}</Text></View>
            )}
          </View>
        </View>

        {/* Waarschuwingen — zelfde lijst als de kaart "Waarschuwingen" in het paneel.
            § 3.3: nooit een schijnzeker getal zonder de caveats eronder. Geen ⚠-glyph:
            react-pdf's ingebouwde Helvetica is WinAnsi en kent U+26A0 niet. */}
        {uitkomst.waarschuwingen.length > 0 && (
          <View style={s.waarschuwingBlok}>
            {uitkomst.waarschuwingen.map((w, i) => (
              <Text key={i} style={s.waarschuwing}>• {w}</Text>
            ))}
          </View>
        )}

        {/* Referentietabel — top 6 op gewicht */}
        <Text style={s.sectieTitel}>Referenties (top {top6.length} op gewicht)</Text>
        <View style={s.tabel}>
          <View style={s.tabelRij}>
            <Text style={[s.tabelKopCel, s.colAdres]}>Adres</Text>
            <Text style={[s.tabelKopCel, s.colAfstand]}>Afstand</Text>
            <Text style={[s.tabelKopCel, s.colDatum]}>Datum</Text>
            <Text style={[s.tabelKopCel, s.colPrijs]}>Prijs</Text>
            <Text style={[s.tabelKopCel, s.colM2]}>m²</Text>
            <Text style={[s.tabelKopCel, s.colM2Prijs]}>€/m²</Text>
            <Text style={[s.tabelKopCel, s.colIndex]}>Index</Text>
            <Text style={[s.tabelKopCel, s.colGewicht]}>Gewicht</Text>
            <Text style={[s.tabelKopCel, s.colImpliceerd]}>Geïmpl. waarde</Text>
          </View>
          {top6.map((r, i) => (
            <View key={r.id} style={i === top6.length - 1 ? s.tabelRijLaatste : s.tabelRij}>
              <Text style={[s.tabelCel, s.colAdres]}>{r.adres}</Text>
              <Text style={[s.tabelCel, s.colAfstand]}>{r.afstand_m == null ? '—' : `${r.afstand_m} m`}</Text>
              <Text style={[s.tabelCel, s.colDatum]}>{datumKort(r.verkoopdatum)}</Text>
              <Text style={[s.tabelCel, s.colPrijs]}>{euro(r.prijs)}</Text>
              <Text style={[s.tabelCel, s.colM2]}>{r.m2}</Text>
              <Text style={[s.tabelCel, s.colM2Prijs]}>{euro(r.prijs_m2)}</Text>
              <Text style={[s.tabelCel, s.colIndex]}>×{getal(r.index_factor)}</Text>
              <Text style={[s.tabelCel, s.colGewicht]}>{getal(r.gewicht)}</Text>
              <Text style={[s.tabelCel, s.colImpliceerd]}>{euro(r.waarde_geimpliceerd)}</Text>
            </View>
          ))}
        </View>

        {/* Kenmerk-effecten */}
        {toegepasteKenmerken.length > 0 && (
          <>
            <Text style={s.sectieTitel}>Toegepaste kenmerk-effecten</Text>
            <View>
              {toegepasteKenmerken.map(({ naam, status }) => (
                <View key={naam} style={s.kenmerkRij}>
                  <Text style={s.kenmerkLabel}>{KENMERK_LABEL[naam]}</Text>
                  <Text style={s.kenmerkToelichting}>{status!.toelichting}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Makelaarscorrectie */}
        {correctie && (
          <View style={s.correctieBlok}>
            <Text style={s.correctieTitel}>Makelaarscorrectie: {euro(correctie.waarde)}</Text>
            <Text style={s.correctieTekst}>{correctie.motivatie}</Text>
          </View>
        )}

        {/* Disclaimer (§ 3.3, verplicht) */}
        <Text style={s.disclaimer}>
          Dit is een indicatieve waardebepaling op basis van vergelijkbare verkopen, geen taxatie in de zin van NRVT/NWWI.
        </Text>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Opgesteld door {makelaarNaam} op {datumLang(opgesteldOp)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
