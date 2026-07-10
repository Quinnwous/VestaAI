// Minimale ambient-declaratie voor mammoth (geen officiële types beschikbaar).
// We gebruiken alleen extractRawText om platte tekst uit .docx te halen.
declare module 'mammoth' {
  interface MammothInput {
    buffer?: Buffer
    path?: string
    arrayBuffer?: ArrayBuffer
  }
  interface MammothResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export function extractRawText(input: MammothInput): Promise<MammothResult>
  export function convertToHtml(input: MammothInput): Promise<MammothResult>
  const _default: {
    extractRawText: typeof extractRawText
    convertToHtml: typeof convertToHtml
  }
  export default _default
}
