const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)

const PagareTemplate = ({ payload, documentId, templateVersion }: { payload: Record<string, any>; documentId?: string; templateVersion?: number }) => {
  const d = payload
  const amount = Number(d.amount) || 0
  const totalWithInterest = Number(d.total_with_interest) || amount
  const interestRate = Number(d.interest_rate) || 0
  const hasInterest = d.has_interest === 'yes' || interestRate > 0

  return (
    <div
      style={{
        fontFamily: 'Times New Roman, Georgia, serif',
        fontSize: '12pt',
        lineHeight: '1.6',
        color: '#1a1a1a',
        padding: '60px 70px',
        maxWidth: '800px',
        margin: '0 auto',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          textAlign: 'right',
          borderBottom: '2px solid #1a3a2a',
          paddingBottom: '12px',
          marginBottom: '32px',
        }}
      >
        <span style={{ fontSize: '16pt', fontWeight: 700, color: '#1a3a2a' }}>LegalUp</span>
        <span style={{ fontSize: '9pt', color: '#6b7280', display: 'block' }}>legalup.cl</span>
      </div>

      <h1
        style={{
          textAlign: 'center',
          fontSize: '18pt',
          fontWeight: 700,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        Pagaré
      </h1>
      <p style={{ textAlign: 'center', fontSize: '10pt', color: '#6b7280', marginBottom: '32px' }}>
        N° {d.documentNumber || '______________'}
      </p>

      <div style={{ textAlign: 'justify', marginBottom: '32px' }}>
        <p style={{ marginBottom: '16px' }}>
          En <strong>{d.payment_place || '______________'}</strong>, a{' '}
          <strong>{d.issue_date || '______________'}</strong>, por el presente pagaré,
          <strong> {d.debtor_name || '______________'}</strong>,{' '}
          RUT N° <strong>{d.debtor_rut || '______________'}</strong>,{' '}
          domiciliado en <strong>{d.debtor_address || '______________'}</strong>,{' '}
          <strong>{d.debtor_city || '______________'}</strong> (en adelante &ldquo;EL DEUDOR&rdquo;),
          promete pagar incondicionalmente a la orden de{' '}
          <strong>{d.creditor_name || '______________'}</strong>,{' '}
          RUT N° <strong>{d.creditor_rut || '______________'}</strong>,{' '}
          domiciliado en <strong>{d.creditor_address || '______________'}</strong>,{' '}
          <strong>{d.creditor_city || '______________'}</strong> (en adelante &ldquo;EL ACREEDOR&rdquo;),
          o a quien sus derechos represente, la suma de{' '}
          <strong>{amount > 0 ? formatCLP(amount) : '______________'}</strong>{' '}
          ({d.amount_words || '______________'}).
        </p>

        {hasInterest && (
          <p style={{ marginBottom: '16px' }}>
            El presente pagaré devengará un interés mensual de <strong>{interestRate}%</strong>,{' '}
            ascendiendo el monto total adeudado a la fecha de vencimiento a la cantidad de{' '}
            <strong>{totalWithInterest > 0 ? formatCLP(totalWithInterest) : '______________'}</strong>.
          </p>
        )}

        <p style={{ marginBottom: '16px' }}>
          EL DEUDOR se obliga a pagar la suma antes indicada en la ciudad de{' '}
          <strong>{d.payment_place || '______________'}</strong>,{' '}
          el día <strong>{d.maturity_date || '______________'}</strong>.
        </p>

        <p style={{ marginBottom: '16px' }}>
          En caso de mora, EL DEUDOR pagará un interés moratorio del máximo convencional permitido por la ley,
          además de todos los gastos judiciales y extrajudiciales que irrogue el cobro del presente pagaré.
        </p>

        <p style={{ marginBottom: '16px' }}>
          El presente pagaré se rige por las disposiciones del Código de Comercio y del Código Civil de la
          República de Chile. Para todos los efectos legales, las partes fijan su domicilio en la ciudad de{' '}
          <strong>{d.creditor_city || '______________'}</strong>,{' '}
          y se someten a la jurisdicción de sus tribunales ordinarios de justicia.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '60px',
          marginBottom: '40px',
          gap: '40px',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #1a1a1a',
              paddingTop: '8px',
              marginBottom: '4px',
            }}
          />
          <p style={{ fontSize: '10pt', margin: 0, fontWeight: 600 }}>{d.debtor_name || 'DEUDOR'}</p>
          <p style={{ fontSize: '9pt', color: '#6b7280', margin: 0 }}>RUT: {d.debtor_rut || '______________'}</p>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              borderTop: '1px solid #1a1a1a',
              paddingTop: '8px',
              marginBottom: '4px',
            }}
          />
          <p style={{ fontSize: '10pt', margin: 0, fontWeight: 600 }}>{d.creditor_name || 'ACREEDOR'}</p>
          <p style={{ fontSize: '9pt', color: '#6b7280', margin: 0 }}>RUT: {d.creditor_rut || '______________'}</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{
            borderTop: '1px solid #1a1a1a',
            paddingTop: '8px',
            display: 'inline-block',
            minWidth: '250px',
          }}
        />
        <p style={{ fontSize: '10pt', margin: '4px 0 0' }}>Testigo</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>
          Nombre: ____________________________ RUT: ______________________
        </p>
      </div>

      <div
        style={{
          borderTop: '2px solid #1a3a2a',
          paddingTop: '12px',
          paddingBottom: '40px',
          fontSize: '8pt',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>
          LegalUp Documents &mdash; Versi&oacute;n {templateVersion || 1}
        </p>
        <p style={{ margin: '4px 0 0' }}>
          Generado el {new Date().toLocaleDateString('es-CL')} &mdash; ID: {documentId || '—'}
        </p>
        <p style={{ margin: '4px 0 0' }}>
          Este documento es un instrumento privado generado autom&aacute;ticamente. Se recomienda revisi&oacute;n por abogado antes de su uso.
        </p>
      </div>
    </div>
  )
}

export default PagareTemplate