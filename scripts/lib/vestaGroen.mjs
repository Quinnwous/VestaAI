/**
 * VestaAI-groen herkennen (item 9.3): de volledige set groentinten die in de
 * ingelogde omgeving niet mag doorkomen, plus een pdf-analyse die de
 * kleuroperatoren in de (Flate-gecomprimeerde) contentstreams naloopt.
 *
 * De tinten worden afgeleid uit de bronbestanden in plaats van een vaste lijst:
 * alle hexkleuren met een groene tint uit tailwind.config.ts (de geremapte
 * `blue`- en `forest`-schaal), components/ui/tokens.ts (de fallbacks) en
 * app/globals.css (het `:root`-vangnet), aangevuld met de bekende groen getinte
 * grijzen (CLAUDE.md § Grijstinten kleurloos houden). Een nieuwe groene token
 * wordt zo vanzelf gevangen.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BRONNEN = ['tailwind.config.ts', 'components/ui/tokens.ts', 'app/globals.css']
const GROENE_GRIJZEN = ['#E9EFEB', '#F1F7F3', '#9AA6A0']

export function hexNaarRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Tint (0-360) en verzadiging (HSL, 0-1). */
export function tintEnVerzadiging([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  if (d === 0) return { tint: 0, verzadiging: 0 }
  const l = (max + min) / 2
  const verzadiging = d / (1 - Math.abs(2 * l - 1))
  let tint
  if (max === R) tint = 60 * (((G - B) / d) % 6)
  else if (max === G) tint = 60 * ((B - R) / d + 2)
  else tint = 60 * ((R - G) / d + 4)
  return { tint: (tint + 360) % 360, verzadiging }
}

/**
 * Groen: tint tussen 90° en 175° met merkbare verzadiging (ook de groen getinte
 * grijzen). Bijna-zwart (lichtheid < 12%, zoals de teksttint #0E1A13) telt niet:
 * die ondertoon is met het oog niet van zwart te onderscheiden. Idem voor een
 * kanaalverschil < 4/255 (#FBFCFB): onzichtbaar, alleen ruis.
 */
export function isGroen(rgb) {
  const { tint, verzadiging } = tintEnVerzadiging(rgb)
  const lichtheid = (Math.max(...rgb) + Math.min(...rgb)) / 2 / 255
  const spreiding = Math.max(...rgb) - Math.min(...rgb)
  return tint >= 90 && tint <= 175 && verzadiging >= 0.05 && lichtheid >= 0.12 && spreiding >= 4
}

/** Uit broncode: alle zes-cijferige hexkleuren met een groene tint. */
export function groenenUitBron(tekst) {
  const hexen = tekst.match(/#[0-9a-fA-F]{6}\b/g) ?? []
  return hexen.filter((h) => isGroen(hexNaarRgb(h)))
}

/** Alle VestaAI-groenen als "r, g, b"-strings (formaat van getComputedStyle). */
export function vestaGroenen(root = ROOT) {
  const hexen = new Set(GROENE_GRIJZEN.map((h) => h.toUpperCase()))
  for (const bron of BRONNEN) {
    try {
      for (const h of groenenUitBron(readFileSync(path.join(root, bron), 'utf8'))) hexen.add(h.toUpperCase())
    } catch {
      // bron ontbreekt: niet fataal, de rest dekt het
    }
  }
  return [...hexen].map((h) => hexNaarRgb(h).join(', '))
}

/**
 * Pdf: zoekt `r g b rg|RG`-operatoren (0-1-schaal) in alle streams (Flate
 * wordt uitgepakt) en de naam VestaAI in de ongecomprimeerde metadata.
 * Tolerantie van 1/255 per kanaal vanwege afronding.
 */
export function pdfKleurBevindingen(buffer, groenen) {
  const doel = groenen.map((g) => g.split(',').map((x) => Number(x.trim())))
  const ruw = Buffer.from(buffer)
  const tekst = ruw.toString('latin1')
  const inhoud = [tekst]
  const re = /stream\r?\n/g
  let m
  while ((m = re.exec(tekst))) {
    const start = m.index + m[0].length
    const eind = tekst.indexOf('endstream', start)
    if (eind === -1) break
    try {
      inhoud.push(inflateSync(ruw.subarray(start, eind)).toString('latin1'))
    } catch {
      // niet gecomprimeerd of geen Flate (fonts/afbeeldingen): overslaan
    }
  }
  const groen = new Set()
  const kleurOp = /(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(rg|RG)\b/g
  for (const deel of inhoud) {
    let k
    while ((k = kleurOp.exec(deel))) {
      const rgb = [k[1], k[2], k[3]].map((x) => Math.round(Number(x) * 255))
      if (doel.some((d) => d.every((v, i) => Math.abs(v - rgb[i]) <= 1))) groen.add(`rgb(${rgb.join(', ')})`)
    }
  }
  const naam = [...new Set(tekst.match(/\/(Title|Author|Creator|Producer|Subject)\s*\(([^)]*vesta\s?ai[^)]*)\)/gi) ?? [])]
  return { groen: [...groen], naam }
}
