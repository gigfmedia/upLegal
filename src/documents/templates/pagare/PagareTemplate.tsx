const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)

const formatRut = (value: string) => {
  const cleaned = String(value || '').replace(/[^\dkK]/g, '').toUpperCase()
  if (cleaned.length <= 1) return cleaned
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${dv}`
}

const formatDate = (value: string) => {
  if (!value || value === '______________') return value || '______________'
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`
}

const generatePagareNumber = (documentId?: string) => {
  if (!documentId) return 'PAG-______________'
  const hash = documentId.slice(-4).toUpperCase()
  const year = new Date().getFullYear()
  return `PAG-${year}-${hash}`
}

const esc = (s: any) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface PagareTemplateProps {
  payload: Record<string, any>
  documentId?: string
  templateVersion?: number
  preview?: boolean
}

const PagareTemplate = ({ payload, documentId, templateVersion, preview }: PagareTemplateProps) => {
  const d = payload
  const amount = Number(d.amount) || 0
  const totalWithInterest = Number(d.total_with_interest) || amount
  const interestRate = Number(d.interest_rate) || 0
  const hasInterest = d.has_interest === 'yes' || interestRate > 0
  const val = (key: string, fallback = '______________') => d[key] || fallback
  const pagareNumber = generatePagareNumber(documentId)

  const interestClause = hasInterest ? (
    <p style={{ marginBottom: '14px' }}>
      El presente pagaré devengará un interés mensual de <strong>{interestRate}%</strong>, ascendiendo el monto total adeudado a la fecha de vencimiento a la cantidad de <strong>{totalWithInterest > 0 ? formatCLP(totalWithInterest) : '______________'}</strong>.
    </p>
  ) : null

  return (
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11.5pt',
        lineHeight: '1.8',
        color: '#1a1a1a',
        padding: '50px 70px 30px',
        maxWidth: '800px',
        margin: '0 auto',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: preview ? 'none' as const : undefined,
        userSelect: preview ? 'none' as const : undefined,
      }}
    >
      {preview && (
        <style>{`@media print { .pagare-preview { display: none !important; } }`}</style>
      )}

      {preview && (
        <div
          className="pagare-preview"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
            fontSize: '48pt',
            fontWeight: 700,
            color: 'rgba(0,0,0,0.06)',
            letterSpacing: '12px',
            textTransform: 'uppercase',
            transform: 'rotate(-25deg)',
            fontFamily: 'Arial, Helvetica, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          VISTA PREVIA
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/></svg>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a3a2a' }}>LegalUp</span>
          <span style={{ fontSize: '8.5pt', color: '#6b7280' }}>Documents - legalup.cl</span>
        </div>
      </div>

      <h1
        style={{
          textAlign: 'center',
          fontSize: '16pt',
          fontWeight: 700,
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#1a3a2a',
        }}
      >
        Mandato Pagaré
      </h1>
      <p style={{ textAlign: 'center', fontSize: '9pt', color: '#6b7280', marginBottom: '24px', fontFamily: preview ? undefined : 'monospace' }}>
        {preview ? 'PREVIEW' : pagareNumber}
      </p>

      <div style={{ textAlign: 'justify', marginBottom: '28px' }}>
        <p style={{ marginBottom: '14px' }}>
          En <strong>{esc(val('payment_place'))}</strong>, a <strong>{formatDate(val('issue_date'))}</strong>, por el presente pagaré,
          <strong> {esc(val('debtor_name'))}</strong>, RUT N° <strong>{formatRut(val('debtor_rut'))}</strong>,
          domiciliado en <strong>{esc(val('debtor_address'))}</strong>, <strong>{esc(val('debtor_city'))}</strong>
          (en adelante &ldquo;EL DEUDOR&rdquo;), promete pagar incondicionalmente a la orden de
          <strong> {esc(val('creditor_name'))}</strong>, RUT N° <strong>{formatRut(val('creditor_rut'))}</strong>,
          domiciliado en <strong>{esc(val('creditor_address'))}</strong>, <strong>{esc(val('creditor_city'))}</strong>
          (en adelante &ldquo;EL ACREEDOR&rdquo;), o a quien sus derechos represente, la suma de
          <strong> {amount > 0 ? formatCLP(amount) : '______________'}</strong>
          {!preview && esc(val('amount_words')) ? ' (' + esc(val('amount_words')) + ')' : ''}.
        </p>

        {interestClause}

        <p style={{ marginBottom: '14px' }}>
          EL DEUDOR se obliga a pagar la suma antes indicada en la ciudad de <strong>{esc(val('payment_place'))}</strong>,
          el día <strong>{formatDate(val('maturity_date'))}</strong>.
        </p>

        <p style={{ marginBottom: '14px' }}>
          En caso de mora, EL DEUDOR pagará un interés moratorio del máximo convencional permitido por la ley,
          además de todos los gastos judiciales y extrajudiciales que irrogue el cobro del presente pagaré.
        </p>

        <p style={{ marginBottom: '14px' }}>
          El presente pagaré se rige por las disposiciones del Código de Comercio y del Código Civil de la
          República de Chile. Para todos los efectos legales, las partes fijan su domicilio en la ciudad de
          <strong> {esc(val('creditor_city'))}</strong>, y se someten a la jurisdicción de sus tribunales ordinarios de justicia.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '50px',
          marginBottom: '36px',
          gap: '40px',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1.5px solid #1a1a1a',
              paddingTop: '6px',
              marginBottom: '2px',
              minWidth: '120px',
            }}
          />
          <p style={{ fontSize: '10pt', margin: 0, fontWeight: 600 }}>{preview ? 'DEUDOR' : esc(val('debtor_name', 'DEUDOR'))}</p>
          <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: 0 }}>
            {preview ? 'RUT: __________________' : `RUT: ${formatRut(val('debtor_rut'))}`}
          </p>
          {!preview && (
            <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: '4px 0 0', fontStyle: 'italic' }}>Firma</p>
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1.5px solid #1a1a1a',
              paddingTop: '6px',
              marginBottom: '2px',
              minWidth: '120px',
            }}
          />
          <p style={{ fontSize: '10pt', margin: 0, fontWeight: 600 }}>{preview ? 'ACREEDOR' : esc(val('creditor_name', 'ACREEDOR'))}</p>
          <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: 0 }}>
            {preview ? 'RUT: __________________' : `RUT: ${formatRut(val('creditor_rut'))}`}
          </p>
          {!preview && (
            <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: '4px 0 0', fontStyle: 'italic' }}>Firma</p>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div
          style={{
            borderTop: '1.5px solid #1a1a1a',
            paddingTop: '6px',
            display: 'inline-block',
            minWidth: '250px',
          }}
        />
        <p style={{ fontSize: '10pt', margin: '4px 0 0', fontWeight: 500 }}>Testigo</p>
        <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: 0 }}>
          {preview ? 'Nombre: __________________ RUT: __________________' : 'Nombre: ____________________________ RUT: ______________________'}
        </p>
        {!preview && (
          <p style={{ fontSize: '8.5pt', color: '#6b7280', margin: '4px 0 0', fontStyle: 'italic' }}>Firma</p>
        )}
      </div>

      <div
        style={{
          borderTop: '1.5px solid #1a3a2a',
          paddingTop: '8px',
          marginTop: '6px',
          fontSize: '7.5pt',
          color: '#9ca3af',
          textAlign: 'center',
          lineHeight: '1.6',
        }}
      >
        {preview ? (
          <p style={{ margin: 0 }}>
            Documento de muestra generado por LegalUp. No válido para firma.
          </p>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Documento generado automáticamente por LegalUp. Antes de utilizarlo o firmarlo, se recomienda la revisión de un abogado cuando existan dudas sobre su aplicación al caso concreto.
            </p>
            <p style={{ margin: '4px 0 0' }}>
              ID: {documentId ? documentId.slice(0, 8) + '…' : '—'} &mdash; Versión {templateVersion || 1} &mdash; {new Date().toLocaleDateString('es-CL')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default PagareTemplate