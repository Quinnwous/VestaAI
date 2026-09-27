'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Data ────────────────────────────────────────────────────────────────────

const FUNDA_TEXT = `Karakteristieke jaren '30-architectuur, een diepe zuidwesttuin en een ligging op loopafstand van het centrum — dit vrijstaande woonhuis aan de Lijsterbeslaan toont van buiten al wat het belooft.

Achter de statige gevel met originele glas-in-loodramen en een karakteristieke erker schuilt een verrassend ruime woning van 185 m², volledig gerenoveerd zonder afbreuk te doen aan de authenticiteit van het interbellum. Paneeldeuren, een en-suite kamer met monumentale schouw en een sierlijke eikenhouten trappartij herinneren aan het vakmanschap van de bouwers — en zijn bij de grondige renovatie van 2021 nauwgezet gerestaureerd.

De L-vormige woonkamer is het kloppende hart van het huis. Dankzij de zuidwestligging valt het grootste deel van de dag direct zonlicht naar binnen; in de winter zorgt de sfeervolle open haard in de en-suite voor de ultieme huiselijkheid. In de zomer openen de deuren zich naar het terras en de diepe achtertuin, die daarmee een natuurlijk verlengde van de woonruimte vormt. De volledig vernieuwde keuken met centraal kookeiland, marmeren werkblad en inbouwapparatuur van topmerken sluit naadloos aan op de eetkamer — praktisch voor het dagelijks gebruik, ruim genoeg voor een uitgebreid diner.

Op de eerste verdieping bevinden zich drie ruime slaapkamers. De master bedroom aan de achterzijde biedt fraai uitzicht over de tuin en geniet de hele avond van de zon; de twee overige slaapkamers zijn elk ruim genoeg voor een tweepersoonsbed met garderobeoplossing. De vernieuwde badkamer beschikt over vloerverwarming, een vrijstaand designbad, een ruime inloopdouche en een dubbele wastafel met spiegelkast.

Via een vaste houten trap bereikt u de geïsoleerde zolderverdieping met dakkapel — licht, stil en veelzijdig inzetbaar als vierde slaapkamer, thuiskantoor of hobbyruimte die dagelijks prettig in gebruik is.

De diepe achtertuin op het zuidwesten biedt alles wat een gezin zoekt: speelruimte voor kinderen, een hardhouten terras voor zomerse avonden en volop privacy dankzij volwassen hagen, een bouwkundige schutting en een klassieke tuinmuur. Een vrijstaand tuinhuis biedt extra bergruimte. Het oprit aan de voorzijde biedt plek voor twee voertuigen en sluit aan op de aangebouwde garage, compleet met laadpunt voor elektrische auto's.

Bij de renovatie in 2021 is bewust ingezet op duurzaamheid: dakisolatie, spouwmuurisolatie, drievoudig isolatieglas en een hybride warmtepomp. Vijftien zonnepanelen op het zuiddak completeren het plaatje. Het resultaat is energielabel B en een jaarlijks energieverbruik dat ruim onder het gemiddelde ligt van vergelijkbare vooroorlogse woningen — goed voor uw portemonnee én voor het milieu.

Het Spiegelkwartier behoort al decennialang tot de meest gewilde woonwijken van de regio. Statige lanen met volwassen bomen, een veilige omgeving en alle dagelijkse voorzieningen op fietsafstand: basis- en middelbare scholen, het stadspark, de weekmarkt en een gevarieerd winkelaanbod. Het NS-station ligt op zeven minuten fietsen; Amsterdam Zuid bereikt u in 24 minuten — ideaal voor de forensende professional of het gezin dat de stad wil bereiken zonder er te hoeven wonen.

Vrijstaande woning · woonoppervlak 185 m² · perceel 520 m² · 4 slaapkamers · badkamer met vrijstaand bad en inloopdouche · geïsoleerde zolder met dakkapel · aangebouwde garage met laadpunt · diepe zuidwesttuin · 15 zonnepanelen · energielabel B · bouwjaar 1936, volledig gerenoveerd 2021.

Bezichtiging op afspraak — bel of mail ons kantoor voor een tijdslot dat u schikt.`

const REFERENTIES = [
  { adres: 'Merelstraat 22', afstand: '0,4 km', prijs: '€ 871.500' },
  { adres: 'Vinkenlaan 8', afstand: '0,9 km', prijs: '€ 858.000' },
]

// Alleen bronnen en diensten die het platform echt gebruikt — geen namen die als
// partnerschap of keurmerk lezen (Funda/NVM: er is geen koppeling of goedkeuring).
const TRUST_BADGES = ['Uw eigen verkoopdata', 'BAG / Kadaster', 'CBS-buurtcijfers', 'PDOK-kaarten', 'Opslag in de EU', 'Claude · Anthropic']

const FEATURES = [
  { icon: 'value', titel: 'Woningwaardering', tekst: 'Een onderbouwde bandbreedte op vergelijkbare verkopen uit uw eigen transactiedata, met correcties per kenmerk en het aantal referenties altijd zichtbaar — geen taxatie, wel een sterk verhaal voor de verkoper.' },
  { icon: 'market', titel: 'Marktinzichten & concurrentie', tekst: 'Marktanalyse per type, wijk en periode, concurrentieanalyse en een verkoopkaart van uw eigen verkopen — allemaal op uw eigen cijfers, geen landelijke schatting.' },
  { icon: 'doc', titel: 'Woningdossier & content', tekst: 'Van verkoopadvies tot verkocht: Funda-tekst, brochure, social posts en koper-e-mail, automatisch in het Nederlands én Engels. Een AI USP-extractor vertaalt bijzonderheden uit uw eigen tekst naar heldere verkoopargumenten.' },
  { icon: 'brand', titel: 'Uw huisstijl, overal', tekst: 'Logo, kleuren, vormtaal en lettertype van uw kantoor — in de omgeving, in elke pdf en in elke gegenereerde tekst.' },
  { icon: 'data', titel: 'Automatische woningdata', tekst: 'Typ het adres — bouwjaar, oppervlak en energielabel worden automatisch opgehaald uit het BAG.' },
  { icon: 'export', titel: 'Wij zetten het voor u klaar', tekst: 'Data-import, huisstijl en teamaccounts regelen wij voor u bij de start. Geen technisch werk aan uw kant.' },
]

const TABS_DATA = [
  { key: 'funda', label: 'Funda-tekst', meta: 'uw format', sub: 'volgens de Funda-richtlijnen', initial: 'F' },
  { key: 'brochure', label: 'Brochure', meta: 'kort + lang', sub: '200 én 500+ woorden', initial: 'B' },
  { key: 'instagram', label: 'Instagram', meta: '3 varianten', sub: 'Emotioneel · informatief · actie', initial: 'I' },
  { key: 'linkedin', label: 'LinkedIn', meta: '2 varianten', sub: 'Kantoor én makelaar', initial: 'L' },
  { key: 'email', label: 'Koper-e-mail', meta: 'ná bezichtiging', sub: 'Opvolgmail na het bezoek', initial: 'E' },
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
  email: `Onderwerp: Bedankt voor uw bezichtiging — Lijsterbeslaan 14

Beste meneer/mevrouw,

Hartelijk dank voor uw bezoek aan de Lijsterbeslaan 14 gisteren. Het was prettig u te ontvangen, en ik hoop dat u een goed gevoel heeft meegenomen van de ruimte, het licht en de tuin.

Heeft u na uw bezichtiging nog vragen? Denk aan de VVE-situatie, de bouwkundige staat of praktische zaken rondom de overname — ik beantwoord ze graag per mail of telefonisch, op een moment dat u schikt.

Overweegt u een bod uit te brengen, of wilt u de woning nog een keer bekijken met uw partner of aannemer? Dat regelen we graag. Er is op dit moment serieuze interesse vanuit meerdere partijen; mochten er vragen zijn over de biedprocedure, dan informeer ik u graag verder.

Ik hoor graag van u.

Met hartelijke groet,
[Makelaar] — [Kantoor]`,
  buurt: `Het Spiegelkwartier behoort tot de meest gewilde buurten van de regio. Statige lanen met volwassen bomen, ruime vooroorlogse woningen en een opvallend dorpse rust op loopafstand van alle voorzieningen.

Het bruisende centrum met boetieks, terrassen en de wekelijkse markt ligt om de hoek, terwijl het stadspark en een historische vesting uitnodigen voor een wandeling. Goede scholen, sportclubs en het NS-station (24 minuten naar Amsterdam Zuid) maken de buurt geliefd bij gezinnen die ruimte zoeken zonder de stad los te laten.`,
}

const REDENEN = [
  { nr: 'a', titel: 'Onderbouwd, niet onderbuik', tekst: 'De waardebepaling steunt op echte referentietransacties uit uw eigen data, met het aantal referenties er altijd bij — geen zwarte doos en geen schijnzeker getal.' },
  { nr: 'b', titel: 'Klinkt als uw kantoor, niet als een generieke chatbot', tekst: 'Het huisstijlgeheugen leert uw schrijftoon. Geen generieke output die u alsnog moet herschrijven.' },
  { nr: 'c', titel: 'Eén login in plaats van tien tools', tekst: 'Waardering, marktinzicht, verkoopkaart en content op één plek — die ook nog eens met elkaar samenwerken.' },
  { nr: 'd', titel: 'Direct bruikbaar', tekst: 'Teksten volgen de Funda-richtlijnen en de vaste opbouw van uw kantoor. U controleert, past aan of herschrijft met één klik, en kopieert ze naar Funda of uw CRM.' },
  { nr: 'e', titel: 'Uw data blijft in Europa', tekst: 'Versleuteld opgeslagen binnen de EU, volledig AVG-proof. Wij verkopen geen data, trainen er geen AI-modellen op en gebruiken uw gegevens alleen voor u.' },
  { nr: 'f', titel: 'Nederlands én Engels, automatisch', tekst: 'Elke contentgeneratie komt automatisch ook in het Engels beschikbaar, klaar om naast de Nederlandse tekst te zetten.' },
]

const HUISSTIJL_RIJEN = [
  { l: 'Logo & kleuren', v: 'Door ons klaargezet bij de start — in de omgeving én op elke pdf' },
  { l: 'Vormtaal & lettertype', v: 'Afgestemd op de stijl van uw kantoor' },
  { l: 'Schrijftoon', v: 'Leert mee met elke bewerking die u goedkeurt' },
]

const WAARDE_VARIABELEN = [
  { l: 'Garage', v: '+€ 12.000', aan: true },
  { l: 'Tuin', v: '+€ 9.000', aan: true },
  { l: 'Energielabel → A', v: '+€ 24.000', aan: false },
  { l: 'Bouwperiode vóór 1975', v: '−€ 9.000', aan: false },
]

const FAQS = [
  { v: 'Wat kan VestaAI precies?', a: 'VestaAI berekent een onderbouwde woningwaardering op uw eigen verkoopdata, geeft marktinzicht en concurrentieanalyse in uw regio, en genereert de volledige contentsuite voor een woning — Funda-tekst, brochure, social en koper-e-mail, in het Nederlands en Engels.' },
  { v: 'Is de waardebepaling een taxatie?', a: 'Nee. Het is een onderbouwde indicatie op basis van vergelijkbare verkopen uit uw eigen transactiedata, met het aantal onderliggende referenties er altijd bij — geen taxatie in de zin van het NRVT. Voor een formele taxatie schakelt u een erkend taxateur in.' },
  { v: 'Waar komt de data vandaan?', a: 'Uit de eigen verkoopdata van uw kantoor. Wij importeren en verversen die periodiek voor u — uw kantoor hoeft zelf niets te importeren.' },
  { v: 'Werkt dit met Funda?', a: 'Er is geen directe koppeling met Funda: u kopieert de tekst naar Funda of uw CRM. De teksten volgen de Funda-richtlijnen (geen prijsvermelding, geen discriminerende taal) en de vaste opbouw van uw kantoor.' },
  { v: 'Hoe zit het met de privacy van mijn data?', a: 'Alle data staat versleuteld opgeslagen binnen de EU en is strikt per kantoor afgeschermd. Wij verkopen geen data en gebruiken uw gegevens nooit om AI-modellen te trainen.' },
  { v: 'Hoe kom ik aan toegang?', a: 'VestaAI is een gesloten platform: nieuwe kantoren worden persoonlijk aangesloten. Neem contact op via de knop hierboven en we plannen een kennismaking.' },
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
    case 'value': return (
      <svg {...props}>
        <path d="M12 3v3" /><path d="M4.5 9 7 10.5" /><path d="M19.5 9 17 10.5" />
        <path d="M4 15a8 8 0 0 1 16 0" />
        <path d="M12 15l4-5" />
      </svg>
    )
    case 'market': return (
      <svg {...props}>
        <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M4 20h16" />
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

const NAV_LINKS = [
  { href: '/', label: 'Home', active: true },
  { href: '/vertrouwen', label: 'Vertrouwen' },
  { href: '/over-ons', label: 'Over ons' },
  { href: '/contact', label: 'Contact' },
]

export function LandingPageClient() {
  const [activeTab, setActiveTab] = useState('funda')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeTabObj = TABS_DATA.find(t => t.key === activeTab) || TABS_DATA[0]

  return (
    <div style={{ overflowX: 'hidden', background: '#FBFCFB', color: '#0E1A13' }}>
      <style>{`
        @keyframes vping { 0% { transform: scale(1); opacity: .65; } 75%,100% { transform: scale(2.4); opacity: 0; } }
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
          .veg{grid-template-columns:1fr 1fr !important}
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
              {NAV_LINKS.map(({ href, label, active }) => (
                <Link key={href + label} href={href} prefetch={false} className="vl" style={{ fontSize: 15, fontWeight: active ? 600 : 500, color: active ? '#1A6B45' : '#5A6B61', textDecoration: 'none', transition: 'color .15s' }}>
                  {label}
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Mobile hamburger */}
              <div className="vmm" style={{ display: 'none', position: 'relative' }}>
                <button onClick={() => setMobileOpen(v => !v)} aria-label="Menu" style={{ cursor: 'pointer', width: 42, height: 42, border: '1px solid #DCE5E0', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: '#0E1A13', borderRadius: 2 }} />)}
                  </span>
                </button>
                {mobileOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 52, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 14, boxShadow: '0 18px 40px -20px rgba(14,26,19,.3)', padding: 10, width: 210, display: 'flex', flexDirection: 'column', gap: 2, zIndex: 60 }}>
                    {[...NAV_LINKS.map(({ href, label }) => ({ href, label })), { href: '/login', label: 'Inloggen' }].map(({ href, label }) => (
                      <Link key={href + label} href={href} onClick={() => setMobileOpen(false)} style={{ padding: '11px 12px', borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#0E1A13', textDecoration: 'none' }}>
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/login" className="vg" style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '11px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 6px 16px rgba(26,107,69,.22)', transition: 'background .15s' }}>
                Inloggen
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '76px 28px 64px' }}>
        <div className="vhg" style={{ display: 'grid', gridTemplateColumns: '1.04fr .96fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#F1F7F3', border: '1px solid #D5E8DD', borderRadius: 999, padding: '7px 14px 7px 11px', fontSize: 13, fontWeight: 600, color: '#1A6B45' }}>
                <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#4CAF80', animation: 'vping 1.8s cubic-bezier(0,0,.2,1) infinite' }} />
                  <span style={{ position: 'relative', width: 8, height: 8, borderRadius: 999, background: '#1F6B45' }} />
                </span>
                Eén platform op úw eigen verkoopdata
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(40px,5.2vw,66px)', lineHeight: 1.03, letterSpacing: '-.02em', color: '#0E1A13', margin: '0 0 22px' }}>
              Waardebepaling en marktinzicht,<br />
              <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>onderbouwd met úw data.</span>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#445249', maxWidth: 520, margin: '0 0 32px' }}>
              Eén platform voor het woningdossier: een uitlegbare waardebepaling op vergelijkbare verkopen, marktinzicht en concurrentieanalyse op uw eigen cijfers, en een contentsuite in het Nederlands en Engels — alles in de huisstijl van uw kantoor.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/contact" className="vg" style={{ fontSize: 16, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '15px 26px', borderRadius: 13, textDecoration: 'none', boxShadow: '0 10px 24px rgba(26,107,69,.26)', transition: 'background .15s' }}>
                Toegang aanvragen →
              </Link>
              <Link href="/login" style={{ fontSize: 15, fontWeight: 600, color: '#1A6B45', textDecoration: 'none' }}>
                Al klant? Inloggen →
              </Link>
            </div>
            <p style={{ fontSize: 13.5, color: '#5C6862', margin: '18px 0 0' }}>Gesloten platform — wij zetten uw kantoor persoonlijk klaar</p>
          </div>

          {/* Waardebepaling snapshot */}
          <div id="demo" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-22px -16px -22px -16px', background: 'radial-gradient(60% 55% at 70% 30%, rgba(124,196,160,.22), transparent 70%)', filter: 'blur(8px)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, boxShadow: '0 30px 70px -28px rgba(14,26,19,.32)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: '#1F6B45' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13', letterSpacing: '.01em' }}>Waardebepaling</span>
                  <span style={{ fontSize: 12, color: '#626C67' }}>· voorbeeldwoning</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1A6B45', background: '#EAF5EE', borderRadius: 999, padding: '4px 9px' }}>Vesta&nbsp;AI</span>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 6 }}>Geschatte waarde</div>
                <div style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 32, color: '#0E1A13', letterSpacing: '-.01em', marginBottom: 4 }}>
                  € 862.000 – € 895.000
                </div>
                <div style={{ fontSize: 12.5, color: '#2F7350', marginBottom: 20 }}>Gebaseerd op 6 vergelijkbare verkopen binnen 1,2 km — een onderbouwde indicatie, geen taxatie</div>

                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 9 }}>Referentietransacties uit uw eigen data</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {REFERENTIES.map(r => (
                    <div key={r.adres} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 10, padding: '9px 12px' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2D25' }}>{r.adres}</div>
                        <div style={{ fontSize: 11, color: '#626C67' }}>{r.afstand} · verkocht</div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0E1A13' }}>{r.prijs}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 12px', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 9, fontSize: 12.5, color: '#5A6B61', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: '#1A6B45', fontWeight: 700, fontSize: 13 }}>✓</span>
                  Klaar als pdf in uw huisstijl, in minder dan 10 seconden
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ borderTop: '1px solid #EEF2EF', borderBottom: '1px solid #EEF2EF', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#626C67', letterSpacing: '.01em' }}>Gebouwd voor de Nederlandse markt</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {TRUST_BADGES.map(t => <span key={t} style={{ fontSize: 15, fontWeight: 700, color: '#3A463F', letterSpacing: '.01em' }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* WAT IS VESTA AI */}
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '96px 28px 72px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 18 }}>Wat is Vesta&nbsp;AI</div>
        <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 auto 26px', maxWidth: 780 }}>
          Eén werkplek voor de hele weg van verkoopadvies tot verkocht, op <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>úw eigen data.</span>
        </h2>
        <p style={{ fontSize: 18.5, lineHeight: 1.66, color: '#445249', maxWidth: 700, margin: '0 auto' }}>
          Van de eerste waardebepaling tot de laatste social post: het woningdossier volgt de fases Verkoopadvies, In verkoop en Verkocht. Los daarvan geven marktinzichten en concurrentieanalyse zicht op de regio — allemaal gebouwd op de eigen verkoopdata van uw kantoor, in uw eigen huisstijl. Wij zetten het voor u klaar; u houdt de regie.
        </p>
      </section>

      {/* FEATURES GRID */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 96px' }}>
        <div style={{ marginBottom: 40, maxWidth: 640 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Wat wij bieden</div>
          <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: 0 }}>
            Eén platform voor waardebepaling, marktinzicht en verkoopklare content.
          </h2>
        </div>
        <div className="veg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {FEATURES.map(f => (
            <div key={f.titel} className="vc" style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color .2s, transform .2s' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A6B45' }}>
                <IcoSvg name={f.icon} />
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
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Het woningdossier van dichtbij</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 auto 18px', maxWidth: 760 }}>
              Elke tekst die bij de woning hoort, <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>in één keer klaar.</span>
            </h2>
            <p style={{ fontSize: 18, color: '#5A6B61', maxWidth: 600, margin: '0 auto' }}>Klik op een type en lees een voorbeeld voor de woning uit de demo. Elke generatie komt automatisch ook in het Engels beschikbaar.</p>
          </div>
          <div className="vtg" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TABS_DATA.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={t.key === activeTab ? 'vtab-a' : 'vtab-i'}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#5C6862' }}>{t.meta}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#5C6862', marginTop: 3, textAlign: 'left' }}>{t.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #E4EAE6', borderRadius: 20, boxShadow: '0 18px 50px -34px rgba(14,26,19,.28)', overflow: 'hidden', minHeight: 430 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF5EE', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{activeTabObj.initial}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13' }}>{activeTabObj.label}</div>
                    <div style={{ fontSize: 12, color: '#626C67' }}>{activeTabObj.sub}</div>
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

      {/* WONINGDATA / BAG */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
        <div className="vfg" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 54, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Automatische woningdata</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 0 18px' }}>
              Adres ingevoerd. De rest vult Vesta.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: '#445249', margin: '0 0 24px', maxWidth: 440 }}>
              Typ het adres — bouwjaar, oppervlak en energielabel worden automatisch opgehaald uit het BAG. Minder tikken, minder kans op fouten in uw Funda-tekst.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Koppeling met het officiële BAG-register', 'Bouwjaar, oppervlak en energielabel in één stap', 'Aanvulbaar met buurt-, WOZ- en marktdata'].map(pt => (
                <div key={pt} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: '#EAF5EE', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 15.5, color: '#3A463F', lineHeight: 1.5 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, boxShadow: '0 30px 70px -28px rgba(14,26,19,.22)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#1F6B45' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13' }}>Nieuw dossier aanmaken</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 6 }}>Adres</div>
                  <div style={{ border: '2px solid #1A6B45', borderRadius: 10, padding: '11px 14px', fontSize: 14.5, color: '#0E1A13', background: '#fff', marginBottom: 16 }}>
                    Lijsterbeslaan 14, 2023 BN Haarlem
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
                  {[
                    { l: 'Bouwjaar', v: '1936', src: 'BAG' },
                    { l: 'Oppervlak', v: '185 m²', src: 'BAG' },
                    { l: 'Energielabel', v: 'B', src: 'BAG' },
                  ].map(f => (
                    <div key={f.l} style={{ background: '#EAF5EE', border: '1px solid #C7E6D5', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 3 }}>{f.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13', letterSpacing: '-.01em' }}>{f.v}</div>
                      <div style={{ fontSize: 10.5, color: '#2F7350', marginTop: 3 }}>↗ {f.src}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '9px 12px', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 9, fontSize: 12.5, color: '#5A6B61', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: '#1A6B45', fontWeight: 700, fontSize: 13 }}>✓</span>
                  3 velden automatisch ingevuld vanuit het BAG — buurtdata volgt via CBS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAAROM */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 46 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Waarom Vesta&nbsp;AI</div>
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

      {/* HUISSTIJL & CONCIERGE */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px 96px' }}>
        <div className="vhs" style={{ background: 'linear-gradient(135deg,#114230,#1A6B45)', borderRadius: 26, padding: 60, display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 48, alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, borderRadius: 999, background: 'rgba(124,196,160,.16)', filter: 'blur(10px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7DC4A0', marginBottom: 16 }}>Uw platform, geen technisch werk</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.4vw,40px)', lineHeight: 1.12, color: '#fff', margin: '0 0 18px' }}>
              Van eerste login tot elk rapport — in úw huisstijl.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: '#C8D7CF', margin: '0 0 24px', maxWidth: 460 }}>
              Wij zetten logo, kleuren en vormtaal van uw kantoor bij de start voor u klaar, en importeren en verversen periodiek uw eigen verkoopdata. Uw kantoor hoeft zelf geen data-import of technisch werk te doen — dat regelen wij.
            </p>
            <Link href="/contact" className="vw" style={{ display: 'inline-flex', fontSize: 15, fontWeight: 700, color: '#114230', background: '#fff', padding: '13px 22px', borderRadius: 12, textDecoration: 'none', transition: 'background .15s' }}>
              Toegang aanvragen →
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

      {/* WONINGWAARDERING */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
        <div className="vfg" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 54, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Woningwaardering</div>
            <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 0 18px' }}>
              Onderbouwd advies, <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>geen onderbuikgevoel.</span>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: '#445249', margin: '0 0 24px', maxWidth: 460 }}>
              De waardebepaling steunt op vergelijkbare verkopen uit uw eigen transactiedata — geen taxatie, wel een onderbouwde indicatie mét het aantal referenties erbij.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Modulaire correcties per kenmerk: garage, tuin, energielabel en bouwperiode — u bepaalt zelf wat meetelt',
                'Elke bandbreedte toont het aantal onderliggende referenties, en verbreedt vanzelf als dat er weinig zijn',
                'Rapport in de huisstijl van uw kantoor, klaar als pdf in minder dan 10 seconden',
              ].map(pt => (
                <div key={pt} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: '#EAF5EE', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 15.5, color: '#3A463F', lineHeight: 1.5 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, boxShadow: '0 30px 70px -28px rgba(14,26,19,.22)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#1F6B45' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13' }}>Waardering · Lijsterbeslaan 14</span>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 6 }}>Geschatte waarde</div>
                <div style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 32, color: '#0E1A13', letterSpacing: '-.01em', marginBottom: 4 }}>
                  € 862.000 – € 895.000
                </div>
                <div style={{ fontSize: 12.5, color: '#2F7350', marginBottom: 20 }}>Gebaseerd op 6 vergelijkbare woningen binnen 1,2 km — een onderbouwde indicatie, geen taxatie</div>

                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 9 }}>Correcties per kenmerk</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
                  {WAARDE_VARIABELEN.map(b => (
                    <span key={b.l} style={b.aan
                      ? { fontSize: 12, fontWeight: 700, color: '#1A6B45', background: '#EAF5EE', border: '1px solid #C7E6D5', borderRadius: 999, padding: '6px 11px', display: 'inline-flex', gap: 6 }
                      : { fontSize: 12, fontWeight: 600, color: '#626C67', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 999, padding: '6px 11px', display: 'inline-flex', gap: 6 }}>
                      {b.aan ? '✓' : '+'} {b.l} <span>{b.v}</span>
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 9 }}>Referentietransacties</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {REFERENTIES.map(r => (
                    <div key={r.adres} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F7FAF8', border: '1px solid #EDF2EF', borderRadius: 10, padding: '9px 12px' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2D25' }}>{r.adres}</div>
                        <div style={{ fontSize: 11, color: '#626C67' }}>{r.afstand} · verkocht</div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0E1A13' }}>{r.prijs}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKTINZICHTEN */}
      <section style={{ background: '#F1F7F3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 28px' }}>
          <div className="vfg" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 54, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 16 }}>Marktinzichten</div>
              <h2 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.12, letterSpacing: '-.015em', color: '#0E1A13', margin: '0 0 18px' }}>
                Weet wat er speelt <span style={{ fontStyle: 'italic', color: '#1A6B45' }}>in uw regio.</span>
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: '#445249', margin: '0 0 24px', maxWidth: 460 }}>
                Los van één woning: marktanalyse laat zien wat er speelt per type, wijk en periode. Concurrentieanalyse en de verkoopkaart leggen daarnaast uw eigen kantoor naast de regio.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Marktanalyse: prijsontwikkeling, doorlooptijd en vraag per woningtype, wijk en periode',
                  'Concurrentieanalyse: hoe uw marktaandeel en doorlooptijd zich verhouden tot andere kantoren in de regio',
                  'Verkoopkaart: uw eigen verkopen in kaart, met een periode-schuiver en live filters',
                ].map(pt => (
                  <div key={pt} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', color: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 15.5, color: '#3A463F', lineHeight: 1.5 }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ background: '#fff', border: '1px solid #E4EAE6', borderRadius: 22, boxShadow: '0 30px 70px -28px rgba(14,26,19,.22)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #EEF2EF', background: '#FBFDFC', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: '#1F6B45' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1A13' }}>Marktanalyse · voorbeeldregio</span>
                </div>
                <div style={{ padding: 22 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 10 }}>Gem. verkoopprijs per kwartaal</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, marginBottom: 20 }}>
                    {[54, 61, 58, 70, 76, 84].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: '100%', height: `${h}%`, borderRadius: '6px 6px 3px 3px', background: i === 5 ? 'linear-gradient(180deg,#1A6B45,#2A8A5C)' : '#D5E8DD' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    <div style={{ background: '#F1F7F3', border: '1px solid #D5E8DD', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 3 }}>Gem. doorlooptijd</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13' }}>18 dagen</div>
                    </div>
                    <div style={{ background: '#F1F7F3', border: '1px solid #D5E8DD', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#1F6B45', marginBottom: 3 }}>Marktaandeel kantoor</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13' }}>24%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              Eén platform voor waardebepaling, marktinzicht <span style={{ fontStyle: 'italic', color: '#7DC4A0' }}>en content.</span>
            </h2>
            <p style={{ fontSize: 18, color: '#A8BBB0', margin: '0 auto 34px', maxWidth: 520 }}>
              VestaAI is een gesloten platform — wij zetten uw kantoor persoonlijk klaar.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="vw" style={{ fontSize: 16, fontWeight: 700, color: '#114230', background: '#fff', padding: '16px 30px', borderRadius: 13, textDecoration: 'none', transition: 'background .15s' }}>
                Contact opnemen →
              </Link>
              <Link href="/login" style={{ fontSize: 16, fontWeight: 600, color: '#EAF5EE', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', padding: '16px 28px', borderRadius: 13, textDecoration: 'none' }}>
                Al klant? Inloggen
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
              <p style={{ fontSize: 14, color: '#5C6862', lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
                Woningwaardering, marktinzicht en een contentsuite voor Nederlandse makelaars — op uw eigen transactiedata, in de huisstijl van uw kantoor.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 14 }}>Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/#demo', label: 'Waardebepaling' }, { href: '/', label: 'Functies' }, { href: '/contact', label: 'Contact' }].map(({ href, label }) => (
                  <Link key={label} href={href} prefetch={false} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 14 }}>Bedrijf</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/over-ons', label: 'Over ons' }, { href: '/contact', label: 'Contact' }].map(({ href, label }) => (
                  <Link key={label} href={href} prefetch={false} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#626C67', marginBottom: 14 }}>Juridisch</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ href: '/vertrouwen', label: 'Vertrouwen & beveiliging' }, { href: '/privacy', label: 'Privacy & AVG' }, { href: '/voorwaarden', label: 'Voorwaarden' }].map(({ href, label }) => (
                  <Link key={label} href={href} prefetch={false} style={{ fontSize: 14.5, color: '#5A6B61', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #EEF2EF', marginTop: 40, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#626C67' }}>© 2026 Vesta&nbsp;AI · Woningwaardering en marktinzicht voor makelaars</span>
            <span style={{ fontSize: 13, color: '#626C67' }}>vestaai.nl</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
