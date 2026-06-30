'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Data ────────────────────────────────────────────────────────────────────

const FUNDA_TEXT = `In het geliefde Spiegelkwartier staat deze karakteristieke vrijstaande jaren '30-woning op een royaal perceel van 520 m². Achter de authentieke gevel met glas-in-loodramen gaat een verrassend lichte en ruime woning schuil, waar originele details — paneeldeuren, een en-suite met schouw en een sierlijke trappartij — moeiteloos samengaan met een volledig vernieuwde keuken en badkamer.

De woonkamer baadt dankzij de zuidwestligging het hele jaar in het licht en geeft directe toegang tot de diepe, beschutte achtertuin. De eerste verdieping biedt drie royale slaapkamers en een luxe badkamer; via een vaste trap bereikt u de geïsoleerde zolder met dakkapel — ideaal als vierde slaapkamer of werkkamer aan huis.

Gelegen op loopafstand van het bruisende centrum, met scholen, het stadspark en het NS-station om de hoek, is dit een woning voor wie het beste van karakter én comfort zoekt.`

const DEMO_FIELDS = [
  { l: 'Adres', v: 'Lijsterbeslaan 14' },
  { l: 'Type', v: 'Vrijstaand · 5 kamers' },
  { l: 'Woonoppervlak', v: '185 m²' },
  { l: 'Perceel', v: '520 m²' },
  { l: 'Bouwjaar', v: '1936' },
  { l: 'Energielabel', v: 'B' },
  { l: 'Vraagprijs', v: '€ 875.000 k.k.' },
  { l: 'Doelgroep', v: 'Gezinnen' },
]

const ASSET_CHIPS = ['Brochure', '3× Instagram', '2× LinkedIn', 'Koper-e-mail', 'Buurtomschrijving', 'PDF-brochure']

const TRUST_BADGES = ['Funda', 'NVM-richtlijnen', 'Realworks', 'BAG / Kadaster', 'AVG-proof']

const FEATURES = [
  { icon: 'doc', titel: 'Woningteksten', tekst: 'Funda-tekst, korte én lange brochure, drie Instagram-varianten, twee LinkedIn-posts, koper-e-mail en buurtomschrijving — in één generatie.', soon: false },
  { icon: 'brand', titel: 'Huisstijlgeheugen', tekst: 'Vesta leert de schrijftoon en het logo van uw kantoor. Elke tekst klinkt als ú, niet als een generieke chatbot.', soon: false },
  { icon: 'photo', titel: 'AI-fotoverbetering', tekst: "Donkere of scheve woningfoto's automatisch opgehelderd, rechtgezet en uitgelijnd. Direct klaar voor Funda.", soon: false },
  { icon: 'sofa', titel: 'Virtual staging', tekst: 'Richt lege ruimtes digitaal in met passend meubilair, zodat kopers de mogelijkheden meteen voor zich zien.', soon: true },
  { icon: 'folder', titel: 'Documentenassistent', tekst: 'Upload VVE-notulen, leveringsakte of koopakte en stel er vragen over. Vesta vat samen en zoekt het op.', soon: false },
  { icon: 'cal', titel: 'Content-kalender', tekst: 'Plan uw Instagram- en LinkedIn-posts vooruit in een overzichtelijke kalender per woning. Nooit meer last-minute.', soon: false },
  { icon: 'chat', titel: 'Chatbot voor uw site', tekst: 'Een slimme assistent op uw eigen website die bezoekersvragen beantwoordt en leads automatisch vastlegt.', soon: false },
  { icon: 'data', titel: 'Automatische woningdata', tekst: 'Bouwjaar, oppervlak en energielabel automatisch uit BAG en Kadaster. Aangevuld met buurt-, WOZ- en marktdata.', soon: true },
  { icon: 'export', titel: 'Funda, Realworks & PDF', tekst: 'Teksten direct klaar voor Funda, te exporteren naar Realworks of als nette PDF-brochure voor de bezichtiging.', soon: false },
]

const TABS_DATA = [
  { key: 'funda', label: 'Funda-tekst', meta: '612 wrd', sub: 'Funda-regelset ingebakken', initial: 'F' },
  { key: 'brochure', label: 'Brochure', meta: 'kort + lang', sub: '200 én 500+ woorden', initial: 'B' },
  { key: 'instagram', label: 'Instagram', meta: '3 varianten', sub: 'Emotioneel · informatief · actie', initial: 'I' },
  { key: 'linkedin', label: 'LinkedIn', meta: '2 varianten', sub: 'Kantoor én makelaar', initial: 'L' },
  { key: 'email', label: 'Koper-e-mail', meta: 'opvolging', sub: 'Persoonlijke opvolgmail', initial: 'E' },
  { key: 'buurt', label: 'Buurtomschrijving', meta: 'sfeer', sub: 'Buurt & voorzieningen', initial: 'O' },
]

const TAB_BODIES: Record<string, string> = {
  funda: FUNDA_TEXT,
  brochure: `Karakteristiek en instapklaar wonen in het geliefde Spiegelkwartier. Deze vrijstaande jaren '30-woning (185 m²) combineert authentieke details met een volledig vernieuwde keuken en badkamer.

Drie royale slaapkamers, een geïsoleerde zolder met dakkapel en een diepe zuidwesttuin maken het plaatje compleet. Op loopafstand van het centrum, goede scholen en het NS-station.

Een zeldzame kans voor wie ruimte, sfeer en comfort onder één kap zoekt. Bezichtiging op afspraak via ons kantoor.`,
  instagram: `VARIANT 1 — EMOTIONEEL
Zondagochtend, de zon valt door de glas-in-loodramen naar binnen, koffie in de en-suite. Dit jaren '30-huis in het Spiegelkwartier wacht op zijn volgende verhaal. ✨
#spiegelkwartier #karakterwoning

VARIANT 2 — INFORMATIEF
Nieuw in de verkoop 📍 Vrijstaand · 185 m² · 5 kamers · label B · vernieuwde keuken & badkamer · diepe zuidwesttuin. Vraagprijs € 875.000 k.k. Plan je bezichtiging via de link in bio.

VARIANT 3 — ACTIE
Bezichtigingen voor deze karakteristieke villa in het Spiegelkwartier lopen snel vol. 🔑 Stuur een DM of bel ons kantoor en leg jouw moment vast.`,
  linkedin: `VARIANT — KANTOOR
Trots om deze karakteristieke jaren '30-villa in het Spiegelkwartier in de verkoop te nemen. Authentieke details, een volledig vernieuwde keuken en een diepe zuidwesttuin — op loopafstand van het centrum. Benieuwd naar de mogelijkheden? Ons team staat klaar.

VARIANT — MAKELAAR
Elke woning heeft een verhaal, en dit jaren '30-huis vertelt er een mooi. Ik liep er vanochtend rond en werd verrast door de lichtinval in de en-suite. Voor een gezin dat ruimte én karakter zoekt, is dit een buitenkans. Stuur me gerust een bericht voor de details.`,
  email: `Onderwerp: Uw interesse in Lijsterbeslaan 14

Beste meneer/mevrouw,

Wat fijn dat u interesse heeft getoond in deze karakteristieke jaren '30-woning in het Spiegelkwartier. Op basis van uw wensen denk ik dat met name de lichte en-suite, de vernieuwde keuken en de diepe zuidwesttuin u zullen aanspreken.

Ik plan graag een persoonlijke bezichtiging op een moment dat u uitkomt. Schikt komende donderdag of zaterdag? Dan reserveer ik alvast een tijdslot voor u.

Met hartelijke groet,
[Makelaar] — [Kantoor]`,
  buurt: `Het Spiegelkwartier behoort tot de meest gewilde buurten van de regio. Statige lanen met volwassen bomen, ruime vooroorlogse woningen en een opvallend dorpse rust op loopafstand van alle voorzieningen.

Het bruisende centrum met boetieks, terrassen en de wekelijkse markt ligt om de hoek, terwijl het stadspark en een historische vesting uitnodigen voor een wandeling. Goede scholen, sportclubs en het NS-station (24 minuten naar Amsterdam Zuid) maken de buurt geliefd bij gezinnen die ruimte zoeken zonder de stad los te laten.`,
}

const GEN_STEPS = [
  'Woningdata uit BAG koppelen…',
  'Funda-richtlijnen toepassen…',
  'Buurtdata ophalen…',
  'Teksten schrijven…',
  'Huisstijl van uw kantoor toepassen…',
]

const FOTO_PUNTEN = [
  "Automatisch ophelderen, rechtzetten en kleurcorrectie van uw woningfoto's.",
  'Virtual staging: lege kamers digitaal inrichten met passend meubilair.',
  'Eén consistente, professionele look over uw hele portefeuille.',
]

const STEPS = [
  { nr: '01', titel: 'Voer de woning in', tekst: 'Acht velden — of laat Vesta bouwjaar, oppervlak en energielabel automatisch ophalen uit BAG en Kadaster.' },
  { nr: '02', titel: 'Vesta doet het werk', tekst: "Alle teksten, verbeterde foto's en social posts worden gegenereerd — afgestemd op Funda, de doelgroep en uw huisstijl." },
  { nr: '03', titel: 'Publiceer en plan', tekst: 'Kopieer naar Funda of Realworks, exporteer als PDF en plan uw social posts vooruit in de kalender.' },
]

const REDENEN = [
  { nr: 'a', titel: "Kent Funda, niet 'vastgoed in het algemeen'", tekst: 'Engelse AI-tools zijn vertaald en missen de Funda-regelset. Vesta is er vanaf de eerste regel op gebouwd.' },
  { nr: 'b', titel: 'Klinkt als uw kantoor, niet als ChatGPT', tekst: 'Het huisstijlgeheugen leert uw toon en stijl. Geen generieke output die u alsnog moet herschrijven.' },
  { nr: 'c', titel: 'Eén login in plaats van tien abonnementen', tekst: 'Tekst, foto, staging, documenten, planning en chatbot op één plek — die ook nog eens met elkaar samenwerken.' },
  { nr: 'd', titel: 'Direct plaatsbaar, geen nabewerking', tekst: 'Output voldoet aan de Funda-regels en is meteen te plaatsen, exporteren of met één klik te herschrijven.' },
  { nr: 'e', titel: 'Uw data blijft in Nederland', tekst: 'Versleuteld op Nederlandse servers, volledig AVG-proof. Wij verkopen geen data en gebruiken uw objecten alleen voor u.' },
  { nr: 'f', titel: 'Groeit mee, van zzp tot kantoor', tekst: 'Begin alleen met Starter en schaal door naar een volledig kantoor met onbeperkt gebruikers en white-label.' },
]

const HUISSTIJL_RIJEN = [
  { l: 'Schrijftoon', v: 'Warm, persoonlijk en net iets enthousiast' },
  { l: 'Logo & kleuren', v: 'Automatisch toegepast op elke PDF-brochure' },
  { l: 'Voorbeeldteksten', v: '3 eerdere advertenties als referentie geleerd' },
]

const PLAN_DEFS = [
  {
    naam: 'Starter', desc: 'Voor de makelaar die instapt',
    maand: '€60', jaarMnd: '€50', jaarTot: '€600 per jaar', highlighted: false,
    features: ['5 objecten per maand', '1 gebruiker', 'Alle woningteksten', 'Fotoverbetering & PDF-export'],
  },
  {
    naam: 'Pro', desc: 'Voor de makelaar die alles wil',
    maand: '€150', jaarMnd: '€125', jaarTot: '€1.500 per jaar', highlighted: true,
    features: ['Onbeperkt objecten', '1 gebruiker', 'Huisstijlgeheugen', 'Virtual staging, kalender & chatbot'],
  },
  {
    naam: 'Kantoor', desc: 'Voor het kantoor met meerdere makelaars',
    maand: '€500', jaarMnd: '€417', jaarTot: '€5.000 per jaar', highlighted: false,
    features: ['Onbeperkt gebruikers & objecten', 'Kantoorbreed huisstijlgeheugen', 'White-label', 'Virtual staging, kalender & chatbot', 'Binnenkort: API & multi-vestiging'],
  },
]

const FAQS = [
  { v: 'Wat kan Vesta AI precies allemaal?', a: "Vesta genereert al uw woningteksten (Funda, brochure, social, e-mail, buurt), verbetert foto's, doet virtual staging, beantwoordt vragen over woningdocumenten, plant uw social posts en biedt een chatbot voor uw eigen website. Eén platform voor uw hele online presentatie." },
  { v: 'Werkt dit met Funda en Realworks?', a: 'De teksten voldoen aan de Funda-richtlijnen (lengte, structuur, verboden woorden) en zijn direct te plaatsen. U kopieert ze naar Funda of uw CRM, of exporteert naar Realworks-formaat. Een directe Funda-API-koppeling is in ontwikkeling.' },
  { v: 'Houdt Vesta rekening met de Nederlandse regels?', a: 'Ja. Vesta is getraind op Funda-richtlijnen en NVM-stijlregels, en houdt rekening met de toon en buurtcultuur die de Nederlandse markt verwacht. Algemene of vertaalde tools missen die context.' },
  { v: 'Hoe zit het met de privacy van mijn objectdata?', a: 'Alle data wordt versleuteld opgeslagen op Nederlandse servers en is AVG-proof. Wij verkopen geen data; uw objectgegevens worden uitsluitend gebruikt voor uw eigen generaties.' },
  { v: 'Kan ik na de proefperiode opzeggen?', a: 'Ja, maandelijks opzegbaar via uw accountpagina. Geen verborgen kosten en geen opzegtermijn. De eerste veertien dagen zijn gratis en zonder creditcard.' },
]

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IcoSvg({ name }: { name: string }) {
  const props = {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'doc': return (
      <svg {...props}>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" />
      </svg>
    )
    case 'brand': return (
      <svg {...props}><path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.3l5-.7Z" /></svg>
    )
    case 'photo': return (
      <svg {...props}>
        <path d="M3 5h18v14H3z" /><path d="M3 16l5-5 4 4 3-3 6 6" />
        <path d="M8.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      </svg>
    )
    case 'sofa': return (
      <svg {...props}>
        <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
        <path d="M2 12a2 2 0 0 1 2 2v3h16v-3a2 2 0 1 1 2-2" />
        <path d="M6 17v2" /><path d="M18 17v2" />
      </svg>
    )
    case 'folder': return (
      <svg {...props}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="M9 13h7" />
      </svg>
    )
    case 'cal': return (
      <svg {...props}>
        <path d="M4 5h16v15H4z" /><path d="M4 9h16" />
        <path d="M8 3v4" /><path d="M16 3v4" /><path d="M9 13h2v2H9z" />
      </svg>
    )
    case 'chat': return (
      <svg {...props}>
        <path d="M4 5h16v11H9l-4 3v-3H4Z" />
        <path d="M8 9h8" /><path d="M8 12h5" />
      </svg>
    )
    case 'data': return (
      <svg {...props}>
        <path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    )
    case 'export': return (
      <svg {...props}>
        <path d="M12 3v12" /><path d="M8 7l4-4 4 4" />
        <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
      </svg>
    )
    default: return null
  }
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function VestaLogo({ size = 34 }: { size?: number }) {
  const fontSize = size === 34 ? 19 : 18
  const radius = size === 34 ? 10 : 9
  return (
    <>
      <span style={{ width: size, height: size, borderRadius: radius, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(26,107,69,.28)', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize, letterSpacing: '-.04em' }}>V</span>
      </span>
      <span style={{ fontWeight: 800, fontSize, letterSpacing: '-.02em', color: '#0E1A13' }}>
        Vesta<span style={{ color: '#1A6B45' }}>AI</span>
      </span>
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LandingPageClient() {
  const [genStatus, setGenStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [genProgress, setGenProgress] = useState(0)
  const [genStep, setGenStep] = useState(GEN_STEPS[0])
  const [typed, setTyped] = useState('')
  const genRef = useRef<ReturnType<typeof setInterval>>()
  const typeRef = useRef<ReturnType<typeof setInterval>>()

  const [activeTab, setActiveTab] = useState('funda')
  const [billing, setBilling] = useState<'maand' | 'jaar'>('maand')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => () => { clearInterval(genRef.current); clearInterval(typeRef.current) }, [])

  function runGenerate() {
    if (genStatus === 'running') return
    clearInterval(genRef.current); clearInterval(typeRef.current)
    setGenStatus('running'); setGenProgress(0); setTyped('')
    let p = 0
    genRef.current = setInterval(() => {
      p += 2.4 + Math.random() * 3.2
      if (p >= 100) {
        clearInterval(genRef.current)
        setGenProgress(100); setGenStatus('done'); typeOut()
      } else {
        const idx = Math.min(GEN_STEPS.length - 1, Math.floor(p / (100 / GEN_STEPS.length)))
        setGenProgress(p); setGenStep(GEN_STEPS[idx])
      }
    }, 95)
  }

  function typeOut() {
    let i = 0
    clearInterval(typeRef.current)
    typeRef.current = setInterval(() => {
      i += 5
      setTyped(FUNDA_TEXT.slice(0, i))
      if (i >= FUNDA_TEXT.length) { clearInterval(typeRef.current); setTyped(FUNDA_TEXT) }
    }, 16)
  }

  function resetGen() {
    clearInterval(genRef.current); clearInterval(typeRef.current)
    setGenStatus('idle'); setGenProgress(0); setTyped('')
  }

  const activeTabObj = TABS_DATA.find(t => t.key === activeTab) || TABS_DATA[0]

  return (
    <div style={{ overflowX: 'hidden', background: '#FBFCFB', color: '#0E1A13' }}>
      <style>{`
        @keyframes vspin { to { transform: rotate(360deg); } }
        @keyframes vping { 0% { transform: scale(1); opacity: .65; } 75%,100% { transform: scale(2.4); opacity: 0; } }
        @keyframes vcaret { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        .vl:hover { color: #0E1A13 !important; }
        .vc:hover { border-color: #C7E6D5 !important; transform: translateY(-3px); }
        .vr:hover { border-color: #C7E6D5 !important; }
        .vg:hover { background: #114230 !important; }
        .vw:hover { background: #EAF5EE !important; }
        .vtab-a { width:100%; cursor:pointer; font-family:inherit; text-align:left; border:1px solid #1A6B45; background:#fff; color:#0E1A13; border-radius:13px; padding:13px 15px; box-shadow:0 6px 18px -10px rgba(26,107,69,.45); }
        .vtab-i { width:100%; cursor:pointer; font-family:inherit; text-align:left; border:1px solid #E4EAE6; background:#FBFDFC; color:#3A463F; border-radius:13px; padding:13px 15px; }
        .vtab-i:hover { border-color: #C7E6D5; }
        ::-webkit-scrollbar { width:10px; height:10px; }
        ::-webkit-scrollbar-thumb { background:#D5E0DA; border-radius:9px; border:3px solid #FBFCFB; }
        @media (max-width:980px){
          .vhg{grid-template-columns:1fr !important;gap:40px !important}
          .vtg{grid-template-columns:1fr !important}
          .vfg{grid-template-columns:1fr !important;gap:34px !important}
          .vwg{grid-template-columns:1fr 1fr !important}
          .vhs{grid-template-columns:1fr !important;gap:34px !important;padding:42px !important}
          .vpg{grid-template-columns:1fr !important}
          .veg{grid-template-columns:1fr 1fr !important}
          .vsg{grid-template-columns:1fr !important;gap:30px !important}
        }
        @media (max-width:680px){
          .vna{display:none !important}
          .vll{display:none !important}
          .vmm{display:block !important}
          .veg,.vwg{grid-template-columns:1fr !important}
          .vfoot{grid-template-columns:1fr 1fr !important}
        }
      `}</style>

      {/* NAV */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,252,251,.82)', backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E4EAE6' }}>
        <nav style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <VestaLogo />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
            <div className="vna" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
              {[
                { href: '/', label: 'Home', active: true },
                { href: '/prijzen', label: 'Prijzen' },
                { href: '/over-ons', label: 'Over ons' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label, active }) => (
                <Link key={href + label} href={href} className="vl" style={{ fontSize: 15, fontWeight: active ? 600 : 500, color: active ? '#1A6B45' : '#5A6B61', textDecoration: 'none', transition: 'color .15s' }}>
                  {label}
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Mobile hamburger */}
              <div className="vmm" style={{ display: 'none', position: 'relative' }}>
                <button onClick={() => setMobileOpen(v => !v)} style={{ cursor: 'pointer', width: 42, height: 42, border: '1px solid #DCE5E0', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: '#0E1A13', borderRadius: 2 }} />)}
                  </span>
                </button>
                {mobileOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 52, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 14, boxShadow: '0 18px 40px -20px rgba(14,26,19,.3)', padding: 10, width: 210, display: 'flex', flexDirection: 'column', gap: 2, zIndex: 60 }}>
                    {[{ href: '/', label: 'Home' }, { href: '/prijzen', label: 'Prijzen' }, { href: '/over-ons', label: 'Over ons' }, { href: '/contact', label: 'Contact' }, { href: '/login', label: 'Inloggen' }].map(({ href, label }) => (
                      <Link key={href + label} href={href} onClick={() => setMobileOpen(false)} style={{ padding: '11px 12px', borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#0E1A13', textDecoration: 'none' }}>
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/login" className="vll" style={{ fontSize: 15, fontWeight: 600, color: '#0E1A13', textDecoration: 'none' }}>Inloggen</Link>
              <Link href="/prijzen" className="vg" style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '11px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 6px 16px rgba(26,107,69,.22)', transition: 'background .15s' }}>
                Gratis starten
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '76px 28px 64px' }}>
        <div className="vhg" style={{ display: 'grid', gridTemplateColumns: '1.04fr .96fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#F1F7F3', border: '1px solid #D5E8DD', borderRadius: 999, padding: '7px 14px 7px 11px', fontSize: 13, fontWeight: 600, color: '#1A6B45', marginBottom: 26 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#4CAF80', animation: 'vping 1.8s cubic-bezier(0,0,.2,1) infinite' }} />
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: 999, background: '#2A8A5C' }} />
              </span>
              Eén platform voor de hele woningmarketing
            </div>
            <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(40px,5.2vw,66px)', lineHeight: 1.03, letterSpacing: '-.02em', color: '#0E1A13', margin: '0 0 22px' }}>
              Dé complete<br />
              <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>AI-assistent</span> voor de makelaardij.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: '#445249', maxWidth: 498, margin: '0 0 32px' }}>
              Alles voor uw online woningpresentatie in één Nederlands platform: teksten, foto&apos;s, virtual staging, documenten, planning en een chatbot. Afgestemd op Funda-richtlijnen en de NVM-stijlregels.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/login" className="vg" style={{ fontSize: 16, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '15px 26px', borderRadius: 13, textDecoration: 'none', boxShadow: '0 10px 24px rgba(26,107,69,.26)', transition: 'background .15s' }}>
                Start gratis proefperiode →
              </Link>
              <a href="#demo" style={{ fontSize: 16, fontWeight: 600, color: '#0E1A13', background: '#fff', border: '1px solid #DCE5E0', padding: '15px 24px', borderRadius: 13, textDecoration: 'none' }}>
                Bekijk de live demo
              </a>
            </div>
            <p style={{ fontSize: 13.5, color: '#7C8983', margin: '18px 0 0' }}>14 dagen gratis · geen creditcard nodig · maandelijks opzegbaar</p>
          </div>

          {/* Live demo card */}
          <div id="demo" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-22px -16px -22px -16px', background: 'radial-gradient(60% 55% at 70% 30%, rgba(124,196,160,.22), transparent 70%)', filter: 'blur(8px)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, boxShadow: '0 30px 70px -28px rgba(14,26,19,.32)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2A8A5C' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13', letterSpacing: '.01em' }}>Live demo</span>
                  <span style={{ fontSize: 12, color: '#9AA6A0' }}>· voorbeeldwoning</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1A6B45', background: '#EAF5EE', borderRadius: 999, padding: '4px 9px' }}>Vesta&nbsp;AI</span>
              </div>
              <div style={{ padding: 18 }}>
                {genStatus === 'idle' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 11 }}>
                      {DEMO_FIELDS.map(f => (
                        <div key={f.l} style={{ background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 11, padding: '9px 11px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 2 }}>{f.l}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2D25' }}>{f.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 11, padding: '9px 11px', marginBottom: 15 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 3 }}>USP&apos;s</div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1F2D25', lineHeight: 1.45 }}>Authentieke jaren &apos;30-details · vernieuwde keuken · diepe zuidtuin · op loopafstand van centrum</div>
                    </div>
                    <button onClick={runGenerate} className="vg" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'background .15s' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#7DC4A0' }} />
                      Genereer content
                    </button>
                  </div>
                )}
                {genStatus === 'running' && (
                  <div style={{ padding: '14px 4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
                      <span style={{ width: 20, height: 20, border: '2.5px solid #D5E8DD', borderTopColor: '#1A6B45', borderRadius: 999, animation: 'vspin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1F2D25' }}>{genStep}</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 999, background: '#EDF2EF', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#1A6B45,#2A8A5C)', width: `${Math.round(genProgress)}%`, transition: 'width .12s linear' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
                      <span style={{ fontSize: 12, color: '#9AA6A0' }}>Content genereren…</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A6B45' }}>{Math.round(genProgress)}%</span>
                    </div>
                    <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ASSET_CHIPS.map(c => <span key={c} style={{ fontSize: 11.5, color: '#9AA6A0', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 999, padding: '4px 9px' }}>{c}</span>)}
                    </div>
                  </div>
                )}
                {genStatus === 'done' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 999, background: '#1A6B45', color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0E1A13' }}>Funda-tekst</span>
                        <span style={{ fontSize: 11.5, color: '#9AA6A0' }}>· 612 woorden</span>
                      </div>
                      <button onClick={resetGen} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1A6B45' }}>↻ Opnieuw</button>
                    </div>
                    <div style={{ background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 12, padding: '14px 15px', height: 212, overflowY: 'auto', fontSize: 13.5, lineHeight: 1.62, color: '#2A372F', whiteSpace: 'pre-line' }}>
                      {typed}
                      <span style={{ display: 'inline-block', width: 7, height: 15, background: '#1A6B45', verticalAlign: '-2px', marginLeft: 1, animation: 'vcaret 1s steps(1) infinite' }} />
                    </div>
                    <div style={{ marginTop: 13 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 8 }}>Ook gegenereerd in dezelfde run</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {ASSET_CHIPS.map(c => <span key={c} style={{ fontSize: 12, fontWeight: 600, color: '#1A6B45', background: '#EAF5EE', border: '1px solid #D5E8DD', borderRadius: 999, padding: '5px 11px' }}>✓ {c}</span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ borderTop: '1px solid #EEF2EF', borderBottom: '1px solid #EEF2EF', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#9AA6A0', letterSpacing: '.01em' }}>Gebouwd voor de Nederlandse markt</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {TRUST_BADGES.map(t => <span key={t} style={{ fontSize: 15, fontWeight: 700, color: '#3A463F', letterSpacing: '.01em' }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* WAT IS VESTA AI */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '96px 28px 72px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 18 }}>Wat is Vesta&nbsp;AI</div>
        <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 auto 26px', maxWidth: 780 }}>
          Niet één losse tool, maar het <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>complete digitale gereedschap</span> van uw kantoor.
        </h2>
        <p style={{ fontSize: 18.5, lineHeight: 1.66, color: '#445249', maxWidth: 700, margin: '0 auto' }}>
          Een woning verkopen vraagt vandaag om veel meer dan een Funda-tekst: scherpe foto&apos;s, sterke social posts, een nette brochure, opvolgmails, documentenwerk en bereikbaarheid online. Vesta&nbsp;AI brengt dat allemaal samen in één Nederlands platform — getraind op Funda-richtlijnen en NVM-stijlregels, met uw eigen huisstijl als basis. U houdt de regie; Vesta doet het werk.
        </p>
      </section>

      {/* FEATURES GRID */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 96px' }}>
        <div style={{ marginBottom: 40, maxWidth: 640 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Wat wij bieden</div>
          <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: 0 }}>
            Alles wat u online nodig heeft, op één plek.
          </h2>
        </div>
        <div className="veg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {FEATURES.map(f => (
            <div key={f.titel} className="vc" style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color .2s, transform .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A6B45' }}>
                  <IcoSvg name={f.icon} />
                </div>
                {f.soon && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9A6B16', background: '#FBF4E6', border: '1px solid #F0E2C2', borderRadius: 999, padding: '4px 9px' }}>Binnenkort</span>}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: '0 0 8px', letterSpacing: '-.01em' }}>{f.titel}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A6B61', margin: 0 }}>{f.tekst}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTENT TABS */}
      <section style={{ background: '#F1F7F3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>De woningteksten van dichtbij</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 auto 18px', maxWidth: 760 }}>
              Elke tekst die bij de woning hoort, <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>in één keer klaar.</span>
            </h2>
            <p style={{ fontSize: 18, color: '#5A6B61', maxWidth: 560, margin: '0 auto' }}>Klik op een type en lees een echt voorbeeld voor de woning uit de demo.</p>
          </div>
          <div className="vtg" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TABS_DATA.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={t.key === activeTab ? 'vtab-a' : 'vtab-i'}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, opacity: .7 }}>{t.meta}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, opacity: .7, marginTop: 3, textAlign: 'left' }}>{t.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #E4EAE6', borderRadius: 20, boxShadow: '0 18px 50px -34px rgba(14,26,19,.28)', overflow: 'hidden', minHeight: 430 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF5EE', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{activeTabObj.initial}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13' }}>{activeTabObj.label}</div>
                    <div style={{ fontSize: 12, color: '#9AA6A0' }}>{activeTabObj.sub}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A6B45', background: '#EAF5EE', borderRadius: 999, padding: '5px 11px', cursor: 'default' }}>Kopieer</span>
              </div>
              <div style={{ padding: '24px 26px', fontSize: 15, lineHeight: 1.7, color: '#2A372F', whiteSpace: 'pre-line', maxHeight: 520, overflowY: 'auto' }}>
                {TAB_BODIES[activeTab] || ''}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOTO / VIRTUAL STAGING */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
        <div className="vfg" style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 54, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Foto &amp; presentatie</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 0 18px' }}>
              Laat elke woning op haar best zien.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: '#445249', margin: '0 0 24px', maxWidth: 440 }}>
              Vesta haalt het beste uit uw woningfoto&apos;s: automatisch ophelderen, rechtzetten en uitlijnen. En met virtual staging richt u lege ruimtes digitaal in, zodat kopers de mogelijkheden meteen zien.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FOTO_PUNTEN.map(p => (
                <div key={p} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: '#EAF5EE', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 15.5, color: '#3A463F', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '100%', height: 230, border: '1px solid #E4EAE6', borderRadius: 18, background: '#F7FAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9AA6A0' }}>Originele foto</div>
                <span style={{ position: 'absolute', left: 12, bottom: 12, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: '#8A9690', background: 'rgba(255,255,255,.85)', borderRadius: 6, padding: '4px 8px' }}>VOOR</span>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '100%', height: 230, border: '1px solid #C7E6D5', borderRadius: 18, background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#2A8A5C', boxShadow: '0 16px 40px -26px rgba(26,107,69,.5)' }}>Verbeterde foto</div>
                <span style={{ position: 'absolute', left: 12, bottom: 12, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: '#1A6B45', background: 'rgba(255,255,255,.9)', borderRadius: 6, padding: '4px 8px' }}>NA · Vesta</span>
              </div>
            </div>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', border: '1px solid #E4EAE6', boxShadow: '0 8px 24px rgba(14,26,19,.12)', width: 46, height: 46, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#1A6B45', fontWeight: 800 }}>→</span>
          </div>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section style={{ background: '#0E1A13', color: '#EAF5EE' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
          <div style={{ maxWidth: 640, marginBottom: 54 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7DC4A0', marginBottom: 16 }}>Hoe het werkt</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.1, letterSpacing: '-.015em', color: '#fff', margin: 0 }}>
              Van woninggegevens naar een complete online presentatie.
            </h2>
          </div>
          <div className="vsg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26 }}>
            {STEPS.map(st => (
              <div key={st.nr} style={{ borderTop: '1px solid #2A3B31', paddingTop: 26 }}>
                <div style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: 17, fontWeight: 500, color: '#7DC4A0', marginBottom: 18 }}>{st.nr}</div>
                <h3 style={{ fontSize: 21, fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-.01em' }}>{st.titel}</h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: '#A8BBB0', margin: 0 }}>{st.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAAROM */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 46 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Waarom Vesta&nbsp;AI</div>
          <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 auto', maxWidth: 700 }}>
            Een platform dat de <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>Nederlandse markt verstaat.</span>
          </h2>
        </div>
        <div className="vwg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {REDENEN.map(r => (
            <div key={r.nr} className="vr" style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: 28, transition: 'border-color .2s' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: 19, fontWeight: 600, color: '#1A6B45' }}>{r.nr}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: '0 0 9px', letterSpacing: '-.01em' }}>{r.titel}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A6B61', margin: 0 }}>{r.tekst}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HUISSTIJL */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 96px' }}>
        <div className="vhs" style={{ background: 'linear-gradient(135deg,#114230,#1A6B45)', borderRadius: 26, padding: 60, display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 48, alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, borderRadius: 999, background: 'rgba(124,196,160,.16)', filter: 'blur(10px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7DC4A0', marginBottom: 16 }}>Huisstijlgeheugen</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.4vw,40px)', lineHeight: 1.12, color: '#fff', margin: '0 0 18px' }}>
              Vesta&nbsp;AI leert de stem van úw kantoor.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: '#C8D7CF', margin: '0 0 24px', maxWidth: 440 }}>
              Upload uw logo, stel de schrijftoon in en voeg een paar voorbeeldteksten toe. Elke generatie klinkt daarna als uw kantoor — niet als een generieke robot. Dat profiel bouwt zich op en blijft van u.
            </p>
            <Link href="/prijzen" className="vw" style={{ display: 'inline-flex', fontSize: 15, fontWeight: 700, color: '#114230', background: '#fff', padding: '13px 22px', borderRadius: 12, textDecoration: 'none', transition: 'background .15s' }}>
              Beschikbaar in Pro &amp; Kantoor →
            </Link>
          </div>
          <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 18, padding: 24, backdropFilter: 'blur(6px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {HUISSTIJL_RIJEN.map(h => (
                <div key={h.l}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#7DC4A0', marginBottom: 5 }}>{h.l}</div>
                  <div style={{ fontSize: 14.5, color: '#EAF5EE', lineHeight: 1.5 }}>{h.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section style={{ background: '#F1F7F3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Prijzen</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 0 14px' }}>
              Eén abonnement. <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>Het hele platform.</span>
            </h2>
            <p style={{ fontSize: 17, color: '#5A6B61', margin: 0 }}>14 dagen gratis. Daarna kiest u pas.</p>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 38 }}>
            <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #DCE5E0', borderRadius: 999, padding: 4 }}>
              {(['maand', 'jaar'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: billing === b ? 700 : 600, color: billing === b ? '#fff' : '#5A6B61', background: billing === b ? '#1A6B45' : 'none', borderRadius: 999, padding: '9px 18px', transition: 'background .15s, color .15s' }}>
                  {b === 'maand' ? 'Maandelijks' : <span>Jaarlijks <span style={{ fontWeight: 700, color: billing === 'jaar' ? '#C8F5DC' : '#1A6B45' }}>−2 mnd</span></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="vpg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {PLAN_DEFS.map(p => (
              <div key={p.naam} style={p.highlighted ? { background: '#fff', border: '2px solid #1A6B45', borderRadius: 22, padding: 32, boxShadow: '0 26px 60px -34px rgba(26,107,69,.5)' } : { background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, padding: 32 }}>
                {p.highlighted && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#1A6B45', marginBottom: 14 }}>Meest gekozen</div>}
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0E1A13', margin: '0 0 5px' }}>{p.naam}</h3>
                <p style={{ fontSize: 14, color: '#5A6B61', margin: '0 0 22px' }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 46, color: '#0E1A13', lineHeight: 1 }}>
                    {billing === 'maand' ? p.maand : p.jaarMnd}
                  </span>
                  <span style={{ fontSize: 15, color: '#9AA6A0' }}>/maand</span>
                </div>
                <div style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 24, minHeight: 18 }}>
                  {billing === 'jaar' ? `${p.jaarTot} · 2 maanden gratis` : ''}
                </div>
                <Link href="/login" style={p.highlighted
                  ? { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: 13, borderRadius: 12, textDecoration: 'none' }
                  : { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#1A6B45', background: '#EAF5EE', padding: 13, borderRadius: 12, textDecoration: 'none' }}>
                  Gratis starten
                </Link>
                <ul style={{ listStyle: 'none', padding: 0, margin: '26px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 10, fontSize: 14.5, color: '#3A463F', lineHeight: 1.45 }}>
                      <span style={{ color: '#1A6B45', fontWeight: 800, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#5A6B61', margin: '28px 0 0' }}>
            Alle plannen: 14 dagen gratis · geen creditcard · maandelijks opzegbaar.{' '}
            <Link href="/prijzen" style={{ color: '#1A6B45', fontWeight: 700, textDecoration: 'none' }}>Volledige vergelijking →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '96px 28px' }}>
        <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', textAlign: 'center', margin: '0 0 42px' }}>
          Veelgestelde vragen
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((q, i) => {
            const open = openFaq === i
            return (
              <div key={i} style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 16, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(open ? null : i)} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13' }}>{q.v}</span>
                  <span style={{ fontSize: 22, fontWeight: 400, color: '#1A6B45', flexShrink: 0, transition: 'transform .25s', transform: open ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
                </button>
                <div style={{ overflow: 'hidden', transition: 'max-height .3s ease, opacity .3s ease', maxHeight: open ? '260px' : '0', opacity: open ? 1 : 0 }}>
                  <p style={{ fontSize: 15, lineHeight: 1.66, color: '#5A6B61', margin: 0, padding: '0 22px 20px' }}>{q.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 100px' }}>
        <div style={{ background: '#0E1A13', borderRadius: 28, padding: '72px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 520, height: 300, background: 'radial-gradient(closest-side, rgba(42,138,92,.32), transparent)', filter: 'blur(8px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(32px,4.6vw,54px)', lineHeight: 1.08, color: '#fff', margin: '0 auto 20px', maxWidth: 680 }}>
              Geef uw kantoor <span style={{ fontStyle: 'italic', color: '#7DC4A0' }}>één assistent</span> die alles aankan.
            </h2>
            <p style={{ fontSize: 18, color: '#A8BBB0', margin: '0 auto 34px', maxWidth: 520 }}>
              Probeer Vesta&nbsp;AI veertien dagen gratis. Uw eerste woning staat zo online.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" className="vw" style={{ fontSize: 16, fontWeight: 700, color: '#114230', background: '#fff', padding: '16px 30px', borderRadius: 13, textDecoration: 'none', transition: 'background .15s' }}>
                Start gratis proefperiode →
              </Link>
              <Link href="/contact" style={{ fontSize: 16, fontWeight: 600, color: '#EAF5EE', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', padding: '16px 28px', borderRadius: 13, textDecoration: 'none' }}>
                Plan een demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #E4EAE6', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 28px 32px' }}>
          <div className="vfoot" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 32 }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', marginBottom: 16 }}>
                <VestaLogo size={32} />
              </Link>
              <p style={{ fontSize: 14, color: '#7C8983', lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
                De complete AI-assistent voor Nederlandse makelaars. Woningteksten, foto&apos;s, virtual staging, documenten, planning en een chatbot — in één platform.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 14 }}>Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/#demo', label: 'Live demo' }, { href: '/prijzen', label: 'Prijzen' }, { href: '/', label: 'Functies' }].map(({ href, label }) => (
                  <Link key={label} href={href} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 14 }}>Bedrijf</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/over-ons', label: 'Over ons' }, { href: '/contact', label: 'Contact' }].map(({ href, label }) => (
                  <Link key={label} href={href} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA6A0', marginBottom: 14 }}>Juridisch</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/privacy', label: 'Privacy & AVG' }, { href: '/voorwaarden', label: 'Voorwaarden' }].map(({ href, label }) => (
                  <Link key={label} href={href} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #EEF2EF', marginTop: 40, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#9AA6A0' }}>© 2026 Vesta&nbsp;AI · De AI-assistent voor de makelaardij</span>
            <span style={{ fontSize: 13, color: '#9AA6A0' }}>vestaai.nl</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
