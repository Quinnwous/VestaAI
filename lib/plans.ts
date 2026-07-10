// Abonnementen en hun maandelijkse objectlimieten. "Kantoor" adverteren we als
// onbeperkt, maar is technisch gecapt op 100/maand. 'gratis' is een door de
// platform-admin toegewezen plan zonder einddatum (5 objecten per maand).
export type Plan = 'starter' | 'pro' | 'kantoor' | 'gratis'

export const PLAN_MAANDLIMIET: Record<Plan, number> = {
  starter: 5,
  pro: 25,
  kantoor: 100,
  gratis: 5,
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  kantoor: 'Kantoor',
  gratis: 'Gratis',
}

/** Proefperiode voor elk nieuw account (30 — HousApp-norm, zie roadmap). */
export const PROEF_DAGEN = 30
/** Maximum aantal objecten gedurende de hele proef (totaal, geen maandgrens). */
export const PROEF_LIMIET = 5

/**
 * Heeft dit account toegang tot generatie? Alleen met een expliciet plan, óf een
 * lopende (door de platform-admin toegekende) gratis-periode. Nieuwe accounts
 * zonder plan en zonder trial hebben géén toegang (wachten op activering).
 */
export function heeftToegang(plan: string | null, trialEndsAt: string | null): boolean {
  if (plan) return true
  return !!trialEndsAt && new Date(trialEndsAt) > new Date()
}

/** Maandlimiet voor een plan. Geen/onbekend plan valt terug op de proeflimiet. */
export function maandLimietVoor(plan: string | null): number {
  if (plan && plan in PLAN_MAANDLIMIET) return PLAN_MAANDLIMIET[plan as Plan]
  return PROEF_LIMIET
}

export type ToegangsStand = { plan: string | null; trialEndsAt: string | null }

/**
 * Activeringsmail alléén bij de overgang géén toegang → wél toegang.
 * Een planwissel (Pro → Kantoor) of een intrekking blijft stil.
 */
export function moetActiveringsmailSturen(oud: ToegangsStand, nieuw: ToegangsStand): boolean {
  return !heeftToegang(oud.plan, oud.trialEndsAt) && heeftToegang(nieuw.plan, nieuw.trialEndsAt)
}
