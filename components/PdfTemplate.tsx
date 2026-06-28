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

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    padding: 48,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    height: 28,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  addressBlock: {
    marginBottom: 4,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  dateLine: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#1a1a1a',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 24,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 24,
    right: 48,
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface PdfTemplateProps {
  address: string
  output: ContentOutput
  kantoor: Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'>
}

export function PdfTemplate({ address, output, kantoor }: PdfTemplateProps) {
  const kleur = kantoor.huisstijl_json?.primaire_kleur ?? '#1d4ed8'
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const SECTIES = [
    { titel: 'Funda-tekst', inhoud: output.funda_tekst },
    { titel: 'Brochure (lang)', inhoud: output.brochure_lang },
    { titel: 'Brochure (kort)', inhoud: output.brochure_kort },
    { titel: 'Instagram — Emotioneel', inhoud: output.instagram_emotioneel },
    { titel: 'Instagram — Informatief', inhoud: output.instagram_informatief },
    { titel: 'Instagram — Actie', inhoud: output.instagram_actie },
    { titel: 'LinkedIn — Kantoor', inhoud: output.linkedin_kantoor },
    { titel: 'LinkedIn — Makelaar', inhoud: output.linkedin_makelaar },
    { titel: 'E-mail aan koper', inhoud: output.koper_email },
    { titel: 'Buurtomschrijving', inhoud: output.buurtomschrijving },
  ]

  return (
    <Document title={`${address} — VestaAI`} author="VestaAI">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {kantoor.logo_url ? (
            <Image src={kantoor.logo_url} style={styles.logo} />
          ) : (
            <Text style={{ ...styles.brandName, color: kleur }}>{kantoor.name}</Text>
          )}
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>Gegenereerd met VestaAI</Text>
        </View>

        {/* Adres + datum */}
        <Text style={styles.addressBlock}>{address}</Text>
        <Text style={styles.dateLine}>{datum}</Text>

        {/* Content secties */}
        {SECTIES.map(({ titel, inhoud }) => (
          <View key={titel} style={styles.section} wrap={false}>
            <Text style={{ ...styles.sectionTitle, color: kleur }}>{titel}</Text>
            <View style={styles.divider} />
            <Text style={styles.sectionBody}>{inhoud}</Text>
          </View>
        ))}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
