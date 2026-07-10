import mammoth from 'mammoth'

/** DOCX-mimetype zoals browsers die aanleveren voor Word-bestanden (.docx). */
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Destilleert platte tekst uit een .docx (Word). Word-bestanden worden niet native
 * door Claude ondersteund als document-block, dus we halen de tekst er server-side uit
 * en behandelen het resultaat verder als text/plain (identiek aan een TXT-upload).
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer })
  return value.trim()
}
