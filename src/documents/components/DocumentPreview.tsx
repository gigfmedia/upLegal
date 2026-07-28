import { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react'
import PagareTemplate from '../templates/pagare/PagareTemplate'

interface DocumentPreviewProps {
  slug: string
  formValues: Record<string, any>
}

const TOTAL_FIELDS = 14

function countFilled(values: Record<string, any>): number {
  let count = 0
  for (const key of Object.keys(values)) {
    if (key === 'amount' && Number(values[key]) > 0) { count++; continue }
    if (key === 'user_email' || key === 'user_name') continue
    if (values[key] && String(values[key]).trim()) count++
  }
  return count
}

export default function DocumentPreview({ slug, formValues }: DocumentPreviewProps) {
  const filled = useMemo(() => countFilled(formValues), [formValues])
  const progress = Math.min(filled / TOTAL_FIELDS, 1)
  const blurAmount = Math.max(0, 12 * (1 - Math.min(progress / 0.7, 1)))
  const contentRef = useRef<HTMLDivElement>(null)
  const [visualHeight, setVisualHeight] = useState(0)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setVisualHeight(rect.height)
  }, [formValues])

  const template = (() => {
    switch (slug) {
      case 'pagare': return <PagareTemplate payload={formValues} preview />
      default: return null
    }
  })()

  if (!template) return null

  return (
    <div className="sticky top-24">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-700">Vista previa</p>
        <p className="text-xs text-gray-400">El mismo documento que recibirás después del pago.</p>
      </div>

      <div
        className="relative rounded-xl shadow-lg border border-gray-200 bg-white overflow-hidden flex items-start justify-center select-none"
        style={{ height: visualHeight || 'auto' }}
      >
        <div ref={contentRef} className="scale-[0.45] flex-shrink-0" style={{ width: 800, transformOrigin: 'center top' }}>
          {template}
        </div>

        {blurAmount > 0 && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-500"
            style={{
              backdropFilter: `blur(${blurAmount}px)`,
              WebkitBackdropFilter: `blur(${blurAmount}px)`,
              background: blurAmount > 8 ? 'rgba(255,255,255,0.3)' : 'transparent',
            }}
          />
        )}
      </div>

      {blurAmount > 0 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400">
            Completa el formulario para ver la vista previa
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 justify-center">
        {[
          'Documento profesional',
          'Basado en formato jurídico',
          'Código QR de verificación',
          'PDF descargable',
        ].map((item, i) => (
          <span key={i} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="text-green-600 font-bold">✓</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}