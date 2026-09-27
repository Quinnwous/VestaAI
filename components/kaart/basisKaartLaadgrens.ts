/**
 * Pure laadgrens-logica voor `BasisKaart` (item 12.5, 27 sep 2026): bepaalt
 * of de echte kaart (chunk + tiles + WebGL-init) al gemount mag worden. Puur
 * gehouden zodat dit zonder DOM/jsdom (niet in dit project) te testen is —
 * `BasisKaart.tsx` koppelt dit aan een `IntersectionObserver` en state.
 */
export const KAART_LAADGRENS_ROOT_MARGIN = '200px'

/**
 * `direct`: kaart staat al boven-de-vouw, mount meteen.
 * Anders: pas monteren zodra de container binnen `KAART_LAADGRENS_ROOT_MARGIN`
 * van de viewport is gekomen (`isIntersecting`).
 */
export function moetKaartMonteren(direct: boolean, isIntersecting: boolean): boolean {
  return direct || isIntersecting
}
