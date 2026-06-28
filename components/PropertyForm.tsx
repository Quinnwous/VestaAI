'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PropertyInputSchema, type PropertyInput } from '@/lib/claude'

const WONINGSTYPES = ['Appartement', 'Tussenwoning', 'Hoekwoning', 'Vrijstaand', 'Villa', 'Penthouse'] as const
const ENERGIELABELS = ['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
const DOELGROEPEN = ['Starters', 'Jonge gezinnen', 'Senioren', 'Investeerders', 'Anders'] as const

interface PropertyFormProps {
  onSubmit: (data: PropertyInput) => void
  disabled?: boolean
}

export function PropertyForm({ onSubmit, disabled }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PropertyInput>({
    resolver: zodResolver(PropertyInputSchema),
  })

  const doelgroepValue = watch('doelgroep')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Adres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adres <span className="text-red-500">*</span>
        </label>
        <input
          {...register('adres')}
          disabled={disabled}
          placeholder="Herengracht 1, Amsterdam"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {errors.adres && <p className="mt-1 text-xs text-red-600">{errors.adres.message}</p>}
      </div>

      {/* Woningtype + Kamers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Woningtype <span className="text-red-500">*</span>
          </label>
          <select
            {...register('woningtype')}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Kies type...</option>
            {WONINGSTYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.woningtype && <p className="mt-1 text-xs text-red-600">{errors.woningtype.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kamers <span className="text-red-500">*</span>
          </label>
          <input
            {...register('kamers', { valueAsNumber: true })}
            type="number"
            min={1}
            max={20}
            disabled={disabled}
            placeholder="3"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.kamers && <p className="mt-1 text-xs text-red-600">{errors.kamers.message}</p>}
        </div>
      </div>

      {/* Oppervlak + Bouwjaar */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Woonoppervlak (m²) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('oppervlak_m2', { valueAsNumber: true })}
            type="number"
            min={1}
            disabled={disabled}
            placeholder="85"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.oppervlak_m2 && <p className="mt-1 text-xs text-red-600">{errors.oppervlak_m2.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bouwjaar <span className="text-red-500">*</span>
          </label>
          <input
            {...register('bouwjaar', { valueAsNumber: true })}
            type="number"
            min={1800}
            max={2025}
            disabled={disabled}
            placeholder="1995"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.bouwjaar && <p className="mt-1 text-xs text-red-600">{errors.bouwjaar.message}</p>}
        </div>
      </div>

      {/* Energielabel + Vraagprijs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Energielabel <span className="text-red-500">*</span>
          </label>
          <select
            {...register('energielabel')}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Kies label...</option>
            {ENERGIELABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.energielabel && <p className="mt-1 text-xs text-red-600">{errors.energielabel.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vraagprijs (€) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('vraagprijs', { valueAsNumber: true })}
            type="number"
            min={1}
            disabled={disabled}
            placeholder="450000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.vraagprijs && <p className="mt-1 text-xs text-red-600">{errors.vraagprijs.message}</p>}
        </div>
      </div>

      {/* USP's */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          USP&apos;s <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('usps')}
          disabled={disabled}
          rows={3}
          placeholder="Bijv: gerenoveerde keuken, zonnig terras, vrij uitzicht, rustige straat, recent dak"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {errors.usps && <p className="mt-1 text-xs text-red-600">{errors.usps.message}</p>}
      </div>

      {/* Doelgroep */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Doelgroep <span className="text-red-500">*</span>
        </label>
        <select
          {...register('doelgroep')}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Kies doelgroep...</option>
          {DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {doelgroepValue === 'Anders' && (
          <input
            {...register('doelgroep')}
            disabled={disabled}
            placeholder="Beschrijf de doelgroep..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        )}
        {errors.doelgroep && <p className="mt-1 text-xs text-red-600">{errors.doelgroep.message}</p>}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? 'Bezig met genereren...' : 'Genereer content →'}
      </button>
    </form>
  )
}
