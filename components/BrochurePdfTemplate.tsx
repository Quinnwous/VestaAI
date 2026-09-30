import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { PropertyInput } from '@/lib/schemas'
import { bouwBrochureKenmerken } from '@/lib/brochureKenmerken'
import { euro } from '@/lib/opmaak'

interface Props {
  address: string
  input: PropertyInput
  /** brochure_tekst, met een funda_tekst-terugval als die leeg is (legacy-fallback, zie de route). Leeg = intro-sectie vervalt. */
  introTekst: string
  /** Foto's in bibliotheekvolgorde (oudste eerst), al vooraf gecontroleerd op bereikbaarheid — nooit een dode URL. */
  fotos: string[]
  kantoor: {
    naam: string
    logoUrl: string | null
    kleur: string
    telefoon: string | null
    email: string | null
    /** Weergavelabel (bv. `i4housing.nl`), al genormaliseerd door `lib/branding.ts` `websiteWeergave()`. */
    website: string | null
  }
  /** `zacht` (rond, VestaAI-standaard) of `strak` (hoekig) — zelfde keuze als de ingelogde omgeving, zie lib/branding.ts VORM_OPTIES. */
  vorm: 'zacht' | 'strak'
  /** brochure_stijl.slot_tekst — ontbreekt hij, dan valt de slotpagina terug op kantoorcontact (telefoon/e-mail). */
  slotTekst: string | null
  makelaarNaam: string
  opgesteldOp: string
}

function datumLang(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Zelfde eenvoudige split als DossierHeader.tsx: alles vóór de laatste komma is straat+nummer, erna de plaats. */
function splitsAdres(address: string): { straat: string; stad: string | undefined } {
  const komma = address.lastIndexOf(',')
  const straat = komma > -1 ? address.slice(0, komma) : address
  const stad = komma > -1 ? address.slice(komma + 1).trim() : undefined
  return { straat, stad }
}

type Styles = ReturnType<typeof makeStyles>

/** Op moduleniveau i.p.v. binnen `BrochurePdfTemplate` (react-hooks/static-components):
 * een component die tijdens render wordt aangemaakt, verliest zijn identiteit
 * (en dus interne state) bij elke render. */
function Header({ s, kantoor, address }: { s: Styles; kantoor: Props['kantoor']; address: string }) {
  return (
    <View style={s.pageHeader}>
      {kantoor.logoUrl ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
        <Image src={kantoor.logoUrl} style={s.pageHeaderLogoImg} />
      ) : (
        <Text style={s.pageHeaderNaam}>{kantoor.naam}</Text>
      )}
      <Text style={s.pageHeaderAdres}>{address}</Text>
    </View>
  )
}

function Footer({ s, kantoor, makelaarNaam, opgesteldOp }: { s: Styles; kantoor: Props['kantoor']; makelaarNaam: string; opgesteldOp: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Opgesteld door {makelaarNaam}, {kantoor.naam} · {datumLang(opgesteldOp)}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function makeStyles(kleur: string, vorm: 'zacht' | 'strak') {
  const cardRadius = vorm === 'zacht' ? 14 : 2
  const imgRadius = vorm === 'zacht' ? 8 : 0
  return StyleSheet.create({
    // Cover: volledig beeld, geen padding — de kop en onderbalk liggen er als overlay overheen.
    coverPage: { fontFamily: 'Helvetica', backgroundColor: kleur },
    coverImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
    coverTopRow: { position: 'absolute', top: 30, left: 36, right: 36, flexDirection: 'row', justifyContent: 'flex-end' },
    coverLogoImg: { height: 30, objectFit: 'contain' },
    coverLogoTekst: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    coverBottomOverlay: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(10,14,12,0.62)',
      paddingHorizontal: 36, paddingTop: 22, paddingBottom: 30,
    },
    coverAdres: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    coverStad: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
    coverPrijs: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 10 },
    // Vlak-kleur cover (geen foto): merkkleur vult de hele pagina, logo/tekst gecentreerd.
    coverLeegMidden: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    coverLeegNaam: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    // Content-pagina's
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#14181B', backgroundColor: '#ffffff', padding: 36 },
    pageHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 22, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E6E9EC',
    },
    pageHeaderLogoImg: { height: 20, objectFit: 'contain' },
    pageHeaderNaam: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: kleur },
    pageHeaderAdres: { fontSize: 8, color: '#98A0A6' },
    sectieTitel: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#14181B', marginBottom: 14 },
    body: { fontSize: 10.5, lineHeight: 1.7, color: '#374151' },
    fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    foto: { width: '48%', height: 168, objectFit: 'cover', borderRadius: imgRadius, marginBottom: 12 },
    tabel: { borderWidth: 1, borderColor: '#E6E9EC', borderRadius: cardRadius, overflow: 'hidden' },
    tabelRij: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E6E9EC' },
    tabelRijLaatste: { flexDirection: 'row' },
    tabelLabel: { width: '40%', fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#5C6470', padding: '9 12', backgroundColor: '#F7F8F9' },
    tabelWaarde: { width: '60%', fontSize: 9.5, color: '#14181B', padding: '9 12' },
    slotBlok: { marginTop: 4 },
    slotTekst: { fontSize: 10.5, lineHeight: 1.7, color: '#374151' },
    slotContactBlok: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#E6E9EC', paddingTop: 14 },
    slotContactRegel: { fontSize: 10, color: '#374151', marginTop: 3 },
    footer: {
      position: 'absolute', bottom: 24, left: 36, right: 36,
      flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: '#98A0A6',
    },
  })
}

export function BrochurePdfTemplate({ address, input, introTekst, fotos, kantoor, vorm, slotTekst, makelaarNaam, opgesteldOp }: Props) {
  const s = makeStyles(kantoor.kleur, vorm)
  const { straat, stad } = splitsAdres(address)
  const kenmerken = bouwBrochureKenmerken(input)
  const hero = fotos[0] ?? null
  const fotoGrid = fotos.slice(0, 8)
  const fotoPaginas = fotoGrid.length > 0
    ? [fotoGrid.slice(0, 4), fotoGrid.slice(4, 8)].filter(p => p.length > 0)
    : []

  return (
    <Document title={`Brochure — ${address}`} author={kantoor.naam} creator={kantoor.naam}>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        {hero ? (
          // `fixed`: geen herhalend element (deze pagina overloopt nooit), maar
          // react-pdf's layout-engine (Yoga) meet een 100%-hoge, absoluut
          // gepositioneerde <Image> met erna nog broertjes soms verkeerd in —
          // dat gaf hier een lege extra pagina + de waarschuwing "Node of type
          // IMAGE can't wrap between pages" (geverifieerd met een geïsoleerde
          // herhaling). `fixed` sluit het knooppunt uit van die flow-berekening
          // en lost beide op zonder de opmaak te veranderen.
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
          <Image src={hero} style={s.coverImage} fixed />
        ) : (
          <View style={s.coverLeegMidden}>
            {kantoor.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
              <Image src={kantoor.logoUrl} style={{ height: 40, objectFit: 'contain' }} />
            ) : (
              <Text style={s.coverLeegNaam}>{kantoor.naam}</Text>
            )}
          </View>
        )}
        {hero && (
          <View style={s.coverTopRow}>
            {kantoor.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
              <Image src={kantoor.logoUrl} style={s.coverLogoImg} />
            ) : (
              <Text style={s.coverLogoTekst}>{kantoor.naam}</Text>
            )}
          </View>
        )}
        <View style={s.coverBottomOverlay}>
          <Text style={s.coverAdres}>{straat}</Text>
          {stad && <Text style={s.coverStad}>{stad}</Text>}
          {input.vraagprijs != null && <Text style={s.coverPrijs}>{euro(input.vraagprijs)} k.k.</Text>}
        </View>
      </Page>

      {/* Intro (brochure_tekst, of funda_tekst als terugval — leeg = pagina vervalt) */}
      {introTekst && (
        <Page size="A4" style={s.page}>
          <Header s={s} kantoor={kantoor} address={address} />
          <Text style={s.sectieTitel}>Over deze woning</Text>
          <Text style={s.body}>{introTekst}</Text>
          <Footer s={s} kantoor={kantoor} makelaarNaam={makelaarNaam} opgesteldOp={opgesteldOp} />
        </Page>
      )}

      {/* Fotopagina's — tot 8 foto's, 4 per pagina */}
      {fotoPaginas.map((paginaFotos, i) => (
        <Page key={`fotos-${i}`} size="A4" style={s.page}>
          <Header s={s} kantoor={kantoor} address={address} />
          <Text style={s.sectieTitel}>Foto&apos;s</Text>
          <View style={s.fotoGrid}>
            {paginaFotos.map((url, j) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image heeft geen alt-prop
              <Image key={j} src={url} style={s.foto} />
            ))}
          </View>
          <Footer s={s} kantoor={kantoor} makelaarNaam={makelaarNaam} opgesteldOp={opgesteldOp} />
        </Page>
      ))}

      {/* Kenmerkentabel */}
      <Page size="A4" style={s.page}>
        <Header s={s} kantoor={kantoor} address={address} />
        <Text style={s.sectieTitel}>Kenmerken</Text>
        <View style={s.tabel}>
          {kenmerken.map((k, i) => (
            <View key={k.label} style={i === kenmerken.length - 1 ? s.tabelRijLaatste : s.tabelRij}>
              <Text style={s.tabelLabel}>{k.label}</Text>
              <Text style={s.tabelWaarde}>{k.waarde}</Text>
            </View>
          ))}
        </View>
        <Footer s={s} kantoor={kantoor} makelaarNaam={makelaarNaam} opgesteldOp={opgesteldOp} />
      </Page>

      {/* Slotpagina: kantoorstijl slot_tekst, anders kantoorcontact */}
      <Page size="A4" style={s.page}>
        <Header s={s} kantoor={kantoor} address={address} />
        <Text style={s.sectieTitel}>{kantoor.naam}</Text>
        {slotTekst ? (
          <View style={s.slotBlok}>
            <Text style={s.slotTekst}>{slotTekst}</Text>
          </View>
        ) : (
          <View style={s.slotContactBlok}>
            <Text style={s.slotContactRegel}>Interesse in deze woning? Neem contact op met {kantoor.naam}.</Text>
            {kantoor.telefoon && <Text style={s.slotContactRegel}>{kantoor.telefoon}</Text>}
            {kantoor.email && <Text style={s.slotContactRegel}>{kantoor.email}</Text>}
            {kantoor.website && <Text style={s.slotContactRegel}>{kantoor.website}</Text>}
          </View>
        )}
        <Footer s={s} kantoor={kantoor} makelaarNaam={makelaarNaam} opgesteldOp={opgesteldOp} />
      </Page>
    </Document>
  )
}
