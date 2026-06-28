import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'VestaAI <noreply@vestaai.nl>'

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welkom bij VestaAI — je proefperiode is gestart',
    html: `
      <p>Hoi ${name},</p>
      <p>Welkom bij VestaAI! Je 14-daagse proefperiode is nu actief.</p>
      <p>Maak je eerste object aan op <a href="${process.env.NEXT_PUBLIC_APP_URL}/object/new">VestaAI</a> en zie hoe snel je content-suite klaarstaat.</p>
      <p>Vragen? Reageer gewoon op deze mail.</p>
      <p>— Quinn, VestaAI</p>
    `,
  })
}

export async function sendTrialWarningEmail(email: string, name: string, trialEndsAt: Date) {
  const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `VestaAI — je proefperiode verloopt over ${daysLeft} dag${daysLeft === 1 ? '' : 'en'}`,
    html: `
      <p>Hoi ${name},</p>
      <p>Je proefperiode van VestaAI verloopt over <strong>${daysLeft} dag${daysLeft === 1 ? '' : 'en'}</strong>.</p>
      <p>Wil je geen toegang verliezen? Kies dan nu een abonnement via <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Instellingen → Abonnement</a>.</p>
      <p>— Quinn, VestaAI</p>
    `,
  })
}

export async function sendInvoiceConfirmationEmail(
  email: string,
  name: string,
  planName: string,
  amount: number,
) {
  const formatted = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount / 100)
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `VestaAI — betaling ontvangen (${formatted})`,
    html: `
      <p>Hoi ${name},</p>
      <p>Bedankt! We hebben je betaling van <strong>${formatted}</strong> ontvangen voor het <strong>${planName}</strong>-abonnement.</p>
      <p>Je abonnement is nu actief. Ga aan de slag op <a href="${process.env.NEXT_PUBLIC_APP_URL}/object/new">VestaAI</a>.</p>
      <p>— Quinn, VestaAI</p>
    `,
  })
}
