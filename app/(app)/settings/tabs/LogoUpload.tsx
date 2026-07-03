'use client'

import { useRef, useState } from 'react'
import { uploadLogo } from '../actions'

interface Props {
  kantoorId: string
  huidigUrl: string | null
}

export function LogoUpload({ kantoorId, huidigUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(huidigUrl)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setStatus('uploading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('logo', file)
    formData.append('kantoor_id', kantoorId)

    const result = await uploadLogo(formData)

    if (result.ok) {
      setStatus('ok')
      if (result.url) setPreview(result.url)
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setErrorMsg(result.error ?? 'Upload mislukt')
      setStatus('error')
      setPreview(huidigUrl)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Logo</label>
      <div className="flex items-center gap-4">
        <div
          onClick={() => inputRef.current?.click()}
          className="w-24 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden bg-gray-50"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo preview" className="max-h-14 max-w-20 object-contain p-1" />
          ) : (
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {status === 'uploading' && <p className="text-blue-600">Uploaden...</p>}
          {status === 'ok' && <p className="text-green-600">Logo opgeslagen!</p>}
          {status === 'error' && <p className="text-red-600">{errorMsg}</p>}
          {status === 'idle' && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                {preview ? 'Vervang logo' : 'Upload logo'}
              </button>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG of WebP · max 2 MB</p>
              <p className="text-xs text-gray-400">
                Vereist: Supabase Storage-bucket <code className="font-mono">kantoor-assets</code>
              </p>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
