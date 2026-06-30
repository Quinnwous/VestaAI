import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { ContentOutput } from '@/lib/schemas'
import type { Kantoor } from '@/lib/supabase'

interface PdfTemplateProps {
  address: string
  output: ContentOutput
  kantoor: Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'>
}

const PAGE_PADDING = 48

function makeStyles(kleur: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#111827',
      backgroundColor: '#ffffff',
    },
    cover: {
      flex: 1,
      backgroundColor: kleur,
      padding: PAGE_PADDING,
      flexDirection: 'column',
    },
    coverLogoImg: {
      height: 32,
      objectFit: 'contain',
    },
    coverBrandName: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
    },
    coverSpacer: {
      flex: 1,
    },
    coverTitle: {
      fontSize: 28,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      lineHeight: 1.3,
      marginTop: 60,
    },
    coverSubtitle: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 10,
    },
    coverFooter: {
      marginTop: 40,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.2)',
    },
    coverFooterText: {
      fontSize: 8,
      color: 'rgba(255,255,255,0.6)',
    },
    contentPage: {
      padding: PAGE_PADDING,
    },
    pageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 28,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    pageHeaderLogoImg: {
      height: 20,
      objectFit: 'contain',
    },
    pageHeaderBrand: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: kleur,
    },
    pageHeaderAddress: {
      fontSize: 8,
      color: '#9ca3af',
    },
    sectionBadge: {
      backgroundColor: kleur,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    sectionBadgeText: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginBottom: 16,
    },
    sectionBody: {
      fontSize: 10,
      lineHeight: 1.7,
      color: '#374151',
    },
    pageFooterFixed: {
      position: 'absolute',
      bottom: 24,
      left: PAGE_PADDING,
      right: PAGE_PADDING,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pageFooterText: {
      fontSize: 7,
      color: '#9ca3af',
    },
  })
}

const ALLE_SECTIES: { badge: string; titel: string; key: keyof ContentOutput; optioneel?: boolean }[] = [
  { badge: 'Funda', titel: 'Funda-tekst', key: 'funda_tekst' },
  { badge: 'Brochure', titel: 'Brochure (lang)', key: 'brochure_lang' },
  { badge: 'Brochure', titel: 'Brochure (kort)', key: 'brochure_kort' },
  { badge: 'Instagram', titel: 'Instagram — Emotioneel', key: 'instagram_emotioneel' },
  { badge: 'Instagram', titel: 'Instagram — Informatief', key: 'instagram_informatief' },
  { badge: 'Instagram', titel: 'Instagram — Actie', key: 'instagram_actie' },
  { badge: 'LinkedIn', titel: 'LinkedIn — Kantoor', key: 'linkedin_kantoor' },
  { badge: 'LinkedIn', titel: 'LinkedIn — Makelaar', key: 'linkedin_makelaar' },
  { badge: 'E-mail', titel: 'Koper-e-mail', key: 'koper_email' },
  { badge: 'Buurt', titel: 'Buurtomschrijving', key: 'buurtomschrijving' },
  { badge: 'Open huis', titel: 'Open huis-aankondiging', key: 'open_huis', optioneel: true },
  { badge: 'Follow-up', titel: 'Follow-up — Geïnteresseerd', key: 'bezichtiging_followup_positief', optioneel: true },
  { badge: 'Follow-up', titel: 'Follow-up — Niet geïnteresseerd', key: 'bezichtiging_followup_negatief', optioneel: true },
  { badge: 'Video', titel: 'Video script', key: 'video_script', optioneel: true },
  { badge: 'Energieadvies', titel: 'Energieadvies & subsidies', key: 'energie_advies', optioneel: true },
  { badge: 'Kopersvragen', titel: 'Veelgestelde vragen kopers', key: 'kopersvragen_faq', optioneel: true },
  { badge: 'Marktanalyse', titel: 'Marktanalyse & verkoopstrategie', key: 'marktanalyse', optioneel: true },
]

export function PdfTemplate({ address, output, kantoor }: PdfTemplateProps) {
  const kleur = kantoor.huisstijl_json?.primaire_kleur ?? '#1d4ed8'
  const s = makeStyles(kleur)
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document title={`${address} — VestaAI`} author="VestaAI" creator="VestaAI">

      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          {kantoor.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image src={kantoor.logo_url} style={s.coverLogoImg} />
          ) : (
            <Text style={s.coverBrandName}>{kantoor.name}</Text>
          )}

          <View style={s.coverSpacer} />

          <Text style={s.coverTitle}>{address}</Text>
          <Text style={s.coverSubtitle}>Content-suite · {datum}</Text>

          <View style={s.coverFooter}>
            <Text style={s.coverFooterText}>Gegenereerd met VestaAI · vestaai.nl</Text>
          </View>
        </View>
      </Page>

      {/* Eén pagina per content-sectie */}
      {ALLE_SECTIES.filter(s => !s.optioneel || !!output[s.key]).map(({ badge, titel, key }) => (
        <Page key={key} size="A4" style={s.contentPage}>
          {/* Pagina-header */}
          <View style={s.pageHeader}>
            {kantoor.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
              <Image src={kantoor.logo_url} style={s.pageHeaderLogoImg} />
            ) : (
              <Text style={s.pageHeaderBrand}>{kantoor.name}</Text>
            )}
            <Text style={s.pageHeaderAddress}>{address}</Text>
          </View>

          {/* Badge */}
          <View style={s.sectionBadge}>
            <Text style={s.sectionBadgeText}>{badge}</Text>
          </View>

          {/* Titel */}
          <Text style={s.sectionTitle}>{titel}</Text>

          {/* Body */}
          <Text style={s.sectionBody}>{output[key]}</Text>

          {/* Vaste footer */}
          <View style={s.pageFooterFixed} fixed>
            <Text style={s.pageFooterText}>
              {kantoor.huisstijl_json?.slogan
                ? `${kantoor.huisstijl_json.slogan} · ${datum}`
                : `VestaAI · ${datum}`}
            </Text>
            <Text
              style={s.pageFooterText}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  )
}
