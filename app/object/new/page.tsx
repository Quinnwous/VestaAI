import { Betaalmuur } from '@/components/Betaalmuur'
import { NewObjectForm } from './NewObjectForm'

export const metadata = { title: 'Nieuw object — VestaAI' }

export default function NewObjectPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Betaalmuur>
          <NewObjectForm />
        </Betaalmuur>
      </div>
    </main>
  )
}
