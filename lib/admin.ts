// Platform-admins: de eigenaar(s) van het VestaAI-platform (los van de kantoor-
// 'admin'-rol, die alleen binnen een eigen kantoor geldt). Zij zien /admin en
// mogen álle klanten beheren. Uitbreidbaar via env PLATFORM_ADMIN_EMAILS (komma-
// gescheiden), met quinn.berkouwer@gmail.com als vaste fallback.
const VASTE_ADMINS = ['quinn.berkouwer@gmail.com']

const ENV_ADMINS = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export const PLATFORM_ADMIN_EMAILS = Array.from(
  new Set([...VASTE_ADMINS, ...ENV_ADMINS]),
)

export function isPlatformAdmin(email?: string | null): boolean {
  return !!email && PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase())
}
