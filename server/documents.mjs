import QRCode from 'qrcode';

async function getPuppeteer() {
  try {
    const chromium = await import('@sparticuz/chromium');
    const pptr = await import('puppeteer-core');
    const puppeteerMod = pptr.default || pptr;
    const executablePath = await chromium.default.executablePath();
    const chromiumArgs = chromium.default.args;
    return {
      launch: (opts) => puppeteerMod.launch({
        ...opts,
        executablePath,
        args: [...(opts.args || []), ...chromiumArgs],
      }),
    };
  } catch {
    const pptr = await import('puppeteer');
    return pptr.default || pptr;
  }
}

function formatRut(rut) {
  if (!rut) return '______________'
  const clean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

function formatDate(dateStr) {
  if (!dateStr) return '______________'
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

function generatePagareNumber(documentId) {
  const year = new Date().getFullYear()
  const hash = (documentId || '').replace(/-/g, '').slice(-6).toUpperCase() || String(Math.random().toString(36).slice(2, 8).toUpperCase())
  return `PAG-${year}-${hash}`
}

function renderPagareHtml(payload, templateVersion, documentId, qrDataUrl) {
  const d = payload;
  const amount = Number(d.amount) || 0;
  const totalWithInterest = Number(d.total_with_interest) || amount;
  const interestRate = Number(d.interest_rate) || 0;
  const hasInterest = d.has_interest === 'yes' || interestRate > 0;

  const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
  const val = (key, fallback = '______________') => d[key] || fallback;
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const pagareNumber = generatePagareNumber(documentId)

  const interestClause = hasInterest
    ? `<p style="margin-bottom:14px;">El presente pagaré devengará un interés mensual de <strong>${interestRate}%</strong>, ascendiendo el monto total adeudado a la fecha de vencimiento a la cantidad de <strong>${totalWithInterest > 0 ? fmt(totalWithInterest) : '______________'}</strong>.</p>`
    : '';

  return `
    <div style="padding:50px 70px 30px;max-width:800px;margin:0 auto;background:#fff;font-size:11.5pt;line-height:1.8;color:#1a1a1a;">
      <div style="text-align:right;border-bottom:2px solid #1a3a2a;padding-bottom:10px;margin-bottom:28px;">
        <span style="font-size:15pt;font-weight:700;color:#1a3a2a;">LegalUp</span>
        <span style="font-size:8.5pt;color:#6b7280;display:block;">legalup.cl</span>
      </div>

      <h1 style="text-align:center;font-size:16pt;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Pagaré</h1>
      <p style="text-align:center;font-size:9pt;color:#6b7280;margin-bottom:24px;font-family:monospace;">${pagareNumber}</p>

      <div style="text-align:justify;margin-bottom:28px;">
        <p style="margin-bottom:14px;">
          En <strong>${esc(val('payment_place'))}</strong>, a <strong>${formatDate(val('issue_date'))}</strong>, por el presente pagaré,
          <strong>${esc(val('debtor_name'))}</strong>, RUT N° <strong>${formatRut(val('debtor_rut'))}</strong>,
          domiciliado en <strong>${esc(val('debtor_address'))}</strong>, <strong>${esc(val('debtor_city'))}</strong>
          (en adelante &ldquo;EL DEUDOR&rdquo;), promete pagar incondicionalmente a la orden de
          <strong>${esc(val('creditor_name'))}</strong>, RUT N° <strong>${formatRut(val('creditor_rut'))}</strong>,
          domiciliado en <strong>${esc(val('creditor_address'))}</strong>, <strong>${esc(val('creditor_city'))}</strong>
          (en adelante &ldquo;EL ACREEDOR&rdquo;), o a quien sus derechos represente, la suma de
          <strong>${amount > 0 ? fmt(amount) : '______________'}</strong>${esc(val('amount_words')) ? ' (' + esc(val('amount_words')) + ')' : ''}.
        </p>

        ${interestClause}

        <p style="margin-bottom:14px;">
          EL DEUDOR se obliga a pagar la suma antes indicada en la ciudad de <strong>${esc(val('payment_place'))}</strong>,
          el día <strong>${formatDate(val('maturity_date'))}</strong>.
        </p>

        <p style="margin-bottom:14px;">
          En caso de mora, EL DEUDOR pagará un interés moratorio del máximo convencional permitido por la ley,
          además de todos los gastos judiciales y extrajudiciales que irrogue el cobro del presente pagaré.
        </p>

        <p style="margin-bottom:14px;">
          El presente pagaré se rige por las disposiciones del Código de Comercio y del Código Civil de la
          República de Chile. Para todos los efectos legales, las partes fijan su domicilio en la ciudad de
          <strong>${esc(val('creditor_city'))}</strong>, y se someten a la jurisdicción de sus tribunales ordinarios de justicia.
        </p>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:50px;margin-bottom:36px;gap:40px;">
        <div style="flex:1;text-align:center;">
          <div style="border-top:1.5px solid #1a1a1a;padding-top:6px;margin-bottom:2px;min-width:120px;"></div>
          <p style="font-size:10pt;margin:0;font-weight:600;">${esc(val('debtor_name', 'DEUDOR'))}</p>
          <p style="font-size:8.5pt;color:#6b7280;margin:0;">RUT: ${formatRut(val('debtor_rut'))}</p>
          <p style="font-size:8.5pt;color:#6b7280;margin:4px 0 0;font-style:italic;">Firma</p>
        </div>
        <div style="flex:1;text-align:center;">
          <div style="border-top:1.5px solid #1a1a1a;padding-top:6px;margin-bottom:2px;min-width:120px;"></div>
          <p style="font-size:10pt;margin:0;font-weight:600;">${esc(val('creditor_name', 'ACREEDOR'))}</p>
          <p style="font-size:8.5pt;color:#6b7280;margin:0;">RUT: ${formatRut(val('creditor_rut'))}</p>
          <p style="font-size:8.5pt;color:#6b7280;margin:4px 0 0;font-style:italic;">Firma</p>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:36px;">
        <div style="border-top:1.5px solid #1a1a1a;padding-top:6px;display:inline-block;min-width:250px;"></div>
        <p style="font-size:10pt;margin:4px 0 0;font-weight:500;">Testigo</p>
        <p style="font-size:8.5pt;color:#6b7280;margin:0;">Nombre: ____________________________ RUT: ______________________</p>
        <p style="font-size:8.5pt;color:#6b7280;margin:4px 0 0;font-style:italic;">Firma</p>
      </div>

      ${qrDataUrl ? `
      <div style="text-align:center;padding:12px 0 4px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:9pt;font-weight:700;color:#1a3a2a;">LegalUp</span>
          <span style="font-size:7pt;color:#9ca3af;">legalup.cl</span>
        </div>
        <p style="font-size:7pt;color:#9ca3af;margin:0 0 6px;">Documento generado por LegalUp.cl</p>
        <img src="${qrDataUrl}" width="64" height="64" style="display:inline-block;" alt="QR LegalUp" />
        <p style="font-size:6.5pt;color:#9ca3af;margin:3px 0 0;">Verificar documento en legalup.cl/verificar</p>
      </div>` : ''}

      <div style="border-top:1.5px solid #1a3a2a;padding-top:8px;margin-top:6px;font-size:7.5pt;color:#9ca3af;text-align:center;line-height:1.6;">
        <p style="margin:0;">Documento generado automáticamente por LegalUp. Antes de utilizarlo o firmarlo, se recomienda la revisión de un abogado cuando existan dudas sobre su aplicación al caso concreto.</p>
        <p style="margin:4px 0 0;">ID: ${documentId ? documentId.slice(0, 8) + '…' : '—'} &mdash; Versión ${templateVersion || 1} &mdash; ${new Date().toLocaleDateString('es-CL')}</p>
      </div>
    </div>
  `;
}

function wrapHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; font-family: 'Times New Roman', Georgia, serif; }
    @page { margin: 0; size: letter; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function renderHtml(type, payload, templateVersion, documentId, qrDataUrl) {
  switch (type) {
    case 'pagare':
      return renderPagareHtml(payload, templateVersion || 1, documentId, qrDataUrl);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

function buildStoragePath(type, docId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `documents/${type}/${year}/${month}/${docId}.pdf`;
}

function sendDocumentEmail({ resend, doc, pdfUrl }) {
  const typeLabels = { pagare: 'Mandato Pagaré' };
  const label = typeLabels[doc.type] || doc.type;
  const userName = doc.user_name || 'Usuario';

  return resend.emails.send({
    from: 'LegalUp <hola@mg.legalup.cl>',
    to: doc.user_email,
    subject: `Tu ${label} está listo — LegalUp`,
    html: `
      <body style="margin:0;padding:16px;background:#f9fafb;">
        <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="color:#1a202c;font-size:22px;font-weight:800;">LegalUp</span>
          </div>
          <h1 style="color:#1a202c;">Tu documento est&aacute; listo</h1>
          <p>Hola <strong>${userName}</strong>,</p>
          <p>Tu <strong>${label}</strong> fue generado exitosamente.</p>
          <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
            <a href="${pdfUrl}"
               style="display:inline-block;background:#111;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              Descargar PDF
            </a>
          </div>
          <p style="font-size:12px;color:#6b7280;text-align:center;">
            Si tienes problemas con el bot&oacute;n, copia este enlace en tu navegador:<br/>
            <span style="color:#2563eb;word-break:break-all;">${pdfUrl}</span>
          </p>
          <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            &copy; 2026 LegalUp &mdash; Asesor&iacute;a legal online en Chile.<br/>
            Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
    `,
  });
}

// ──────────────────────────────────────────────────
// generateDocument — unified pipeline
//
//   load  →  validate  →  render  →  pdf  →  upload  →  email  →  analytics  →  return
// ──────────────────────────────────────────────────
async function generateDocument({ supabase, doc, resend }) {
  const id = doc.id;
  const start = Date.now();
  const timings = {};

  console.log(`[documents] pipeline id=${id} type=${doc.type} step=start`);

  // ── 1. Atomic transition to processing ──
  const { data: locked, error: lockError } = await supabase
    .from('generated_documents')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'paid')
    .select()
    .single();

  if (lockError || !locked) {
    throw new Error(`No se pudo transicionar a processing (id=${id}). Posible duplicado.`);
  }

  console.log(`[documents] pipeline id=${id} step=processing_started`);
  timings.processing_started = new Date().toISOString();

  // ── 2. Generate QR ──
  const qrDataUrl = await QRCode.toDataURL(`https://legalup.cl/verificar-documento/${id}`, {
    width: 160,
    margin: 1,
    color: { dark: '#1a3a2a', light: '#ffffff' },
  });

  // ── 3. Render HTML ──
  const bodyHtml = renderHtml(doc.type, doc.payload, doc.template_version || 1, id, qrDataUrl);
  const fullHtml = wrapHtml(bodyHtml);

  // ── 4. Generate PDF with 30s timeout ──
  const pdfStart = Date.now();
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  let pdfBuffer;
  try {
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    pdfBuffer = await page.pdf({
      format: 'letter',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000,
    });
  } finally {
    await browser.close().catch(() => {});
  }

  const pdfGenerationMs = Date.now() - pdfStart;
  timings.pdf_generation_ms = pdfGenerationMs;
  console.log(`[documents] pipeline id=${id} step=pdf_generated time=${pdfGenerationMs}ms`);

  // ── 4. Upload to Storage ──
  const fileName = buildStoragePath(doc.type, id);
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error('[documents] Upload error:', uploadError);
    await supabase.storage.createBucket('documents', { public: true }).catch(() => {});
    const { error: retryError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });
    if (retryError) throw retryError;
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
  const pdfUrl = urlData.publicUrl;
  console.log(`[documents] pipeline id=${id} step=uploaded url=${pdfUrl}`);

  // ── 5. Update record with PDF URL ──
  await supabase
    .from('generated_documents')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', id);

  // ── 6. Send email ──
  if (resend && doc.user_email) {
    const emailStart = Date.now();
    await sendDocumentEmail({ resend, doc, pdfUrl });
    const emailSentMs = Date.now() - emailStart;
    timings.email_sent_ms = emailSentMs;
    console.log(`[documents] pipeline id=${id} step=email_sent time=${emailSentMs}ms`);

    await supabase
      .from('generated_documents')
      .update({
        status: 'completed',
        pdf_url: pdfUrl,
        email_sent_at: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } else {
    await supabase
      .from('generated_documents')
      .update({
        status: 'completed',
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  timings.processing_finished = new Date().toISOString();
  timings.total_ms = Date.now() - start;
  console.log(`[documents] pipeline id=${id} step=completed total=${timings.total_ms}ms`, timings);

  return { pdfUrl, timings };
}

// ──────────────────────────────────────────────────
// handleDocumentPayment — thin entry point
// ──────────────────────────────────────────────────
export async function handleDocumentPayment({ supabase, documentId, paymentId, resend }) {
  console.log(`[documents] handleDocumentPayment id=${documentId} paymentId=${paymentId}`);

  // 1. Load document
  const { data: doc, error: docError } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !doc) {
    console.error(`[documents] Document not found: ${documentId}`);
    return;
  }

  // 2. Idempotency — already completed
  if (doc.status === 'completed') {
    console.log(`[documents] Idempotent call — document ${documentId} already completed`);
    return { status: 'completed', pdf_url: doc.pdf_url };
  }

  // 3. Safety net — stuck in processing from a previous attempt
  if (doc.status === 'processing') {
    console.log(`[documents] Safety net — document ${documentId} was stuck in processing. Resetting to paid.`);
    await supabase
      .from('generated_documents')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', documentId);
  }

  // 4. Mark as paid
  const { error: payError } = await supabase
    .from('generated_documents')
    .update({
      status: 'paid',
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (payError) {
    console.error(`[documents] Error marking as paid: ${payError.message}`);
    return;
  }

  // Reload to ensure fresh state
  const { data: freshDoc } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!freshDoc) return;

  // 5. Execute unified pipeline
  try {
    await generateDocument({ supabase, doc: freshDoc, resend });
  } catch (err) {
    const errorStack = err.stack || err.message;
    console.error(`[documents] Generation failed for ${documentId}:`, errorStack);
    await supabase
      .from('generated_documents')
      .update({
        status: 'failed',
        error_message: errorStack.substring(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
  }
}