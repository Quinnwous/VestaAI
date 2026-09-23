/**
 * Kaartstack (§ 3.5 van docs/roadmap.md) — MapLibre + PDOK BRT-vectortiles
 * in pastelstijl. Eén kaart voor de hele app: de verkoopkaart, het
 * straalpaneel (item 7.3) en straks de referentiekaart in de waardering
 * (4.6) gebruiken allemaal `<BasisKaart>` met lagen als children. Leaflet
 * (`Verkoopkaart.tsx`) verdwijnt pas in item 7.4.
 */
export { BasisKaart } from './BasisKaart'
export { Pin, type PinVariant } from './Pin'
export { VerkopenLaag, type VerkoopHoverInfo } from './VerkopenLaag'
export { StraalLaag } from './StraalLaag'
export { HoverKaart } from './HoverKaart'
