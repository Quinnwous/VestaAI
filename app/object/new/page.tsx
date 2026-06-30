import { Betaalmuur } from '@/components/Betaalmuur'
import { NewObjectForm } from './NewObjectForm'

export const metadata = { title: 'Nieuw object — VestaAI' }

export default function NewObjectPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 28px 80px' }}>
        <Betaalmuur>
          <NewObjectForm />
        </Betaalmuur>
      </div>
    </main>
  )
}
