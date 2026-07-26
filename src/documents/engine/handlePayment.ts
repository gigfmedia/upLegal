import type { SupabaseClient } from '@supabase/supabase-js'

interface HandleDocumentPaymentInput {
  supabase: SupabaseClient
  documentId: string
  paymentId: string
  resend: any
  appUrl: string
}

export async function handleDocumentPayment(input: HandleDocumentPaymentInput) {
  const { supabase, documentId, paymentId, resend, appUrl } = input

  console.log(`[handleDocumentPayment] documentId=${documentId} paymentId=${paymentId}`)

  // 1. Update document to paid
  const { data: doc, error: docError } = await supabase
    .from('generated_documents')
    .update({
      status: 'paid',
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single()

  if (docError || !doc) {
    console.error('[handleDocumentPayment] Document not found:', docError)
    return
  }

  // 2. Trigger PDF generation
  try {
    const { generateDocument } = await import('./generateDocument')
    const { pdfUrl } = await generateDocument(supabase, {
      documentId,
      type: doc.type,
      payload: doc.payload,
      templateVersion: doc.template_version || 1,
    })

    console.log(`[handleDocumentPayment] PDF generated: ${pdfUrl}`)

    // 3. Send email via Resend
    if (resend && doc.user_email) {
      await sendDocumentEmail(resend, {
        to: doc.user_email,
        userName: doc.user_name || 'Usuario',
        documentType: doc.type,
        pdfUrl,
        appUrl,
      })

      await supabase
        .from('generated_documents')
        .update({ status: 'completed', email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', documentId)
    } else {
      await supabase
        .from('generated_documents')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', documentId)
    }
  } catch (genError: any) {
    console.error('[handleDocumentPayment] Generation error:', genError)

    await supabase
      .from('generated_documents')
      .update({
        status: 'delivery_failed',
        error_message: genError.message || 'Error al generar PDF',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
  }
}

async function sendDocumentEmail(
  resend: any,
  input: {
    to: string
    userName: string
    documentType: string
    pdfUrl: string
    appUrl: string
  }
) {
  const { to, userName, documentType, pdfUrl, appUrl } = input

  const typeLabels: Record<string, string> = {
    pagare: 'Mandato Pagaré',
  }

  const label = typeLabels[documentType] || documentType

  await resend.emails.send({
    from: 'LegalUp <hola@mg.legalup.cl>',
    to,
    subject: `Tu ${label} está listo — LegalUp`,
    html: `
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="color:#1a202c;font-size:22px;font-weight:800;">LegalUp</span>
          </div>
          <h1 style="color:#1a202c;">Tu documento está listo</h1>
          <p>Hola <strong>${userName}</strong>,</p>
          <p>Tu <strong>${label}</strong> fue generado exitosamente.</p>
          <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
            <a href="${pdfUrl}"
               style="display:inline-block;background:#111;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              Descargar PDF
            </a>
          </div>
          <p style="font-size:12px;color:#6b7280;text-align:center;">
            Si tienes problemas con el botón, copia este enlace en tu navegador:<br/>
            <span style="color:#2563eb;word-break:break-all;">${pdfUrl}</span>
          </p>
          <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br/>
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
    `,
  })

  console.log(`[sendDocumentEmail] Sent to ${to}`)
}