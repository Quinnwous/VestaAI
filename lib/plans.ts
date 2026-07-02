// Abonnementen en hun maandelijkse objectlimieten. "Kantoor" adverteren we als
// onbeperkt, maar is technisch gecapt op 100/maand.
export type Plan = 'starter' | 'pro' | 'kantoor'

export const PLAN_MAANDLIMIET: Record<Plan, number> = {
  starter: 5,
  pro: 15,
  kantoor: 100,
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  kantoor: 'Kantoor',
}

/**
 * Heeft dit account toegang tot generatie? Alleen met een expliciet plan, óf een
 * lopende (door de platform-admin toegekende) gratis-periode. Nieuwe accounts
 * zonder plan en zonder trial hebben géén toegang (wachten op activering).
 */
export function heeftToegang(plan: string | null, trialEndsAt: string | null): boolean {
  if (plan) return true
  return !!trialEndsAt && new Date(trialEndsAt) > new Date()
}

/** Maandlimiet voor een account. Trial/gratis toegang (geen plan) = zelfde cap als Kantoor. */
export function maandLimietVoor(plan: string | null): number {
  if (plan && plan in PLAN_MAANDLIMIET) return PLAN_MAANDLIMIET[plan as Plan]
  return PLAN_MAANDLIMIET.kantoor
}
