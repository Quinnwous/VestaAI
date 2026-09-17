// Next.js koppelt opengraph-image niet automatisch aan twitter:image; zelfde beeld hergebruiken.
// Route-config moet statisch in dit bestand staan, dus niet mee-re-exporteren.
export { default } from './opengraph-image'

export const runtime = 'edge'
export const alt = 'VestaAI — platform voor makelaars'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
