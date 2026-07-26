// Server-side only — imported by server.mjs

import React from 'react'
import { renderToString } from 'react-dom/server'

const TEMPLATE_VERSION = 1

interface GenerateDocumentInput {
  documentId: string
  type: string
  payload: Record<string, any>
  templateVersion: number
}

export async function generateDocument(
  supabase: any,
  input: GenerateDocumentInput
): Promise<{ pdfUrl: string }> {
  const { documentId, type, payload, templateVersion } = input

  console.log(`[generateDocument] starting documentId=${documentId} type=${type}`)

  // 1. Mark as processing
  await supabase
    .from('generated_documents')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', documentId)

  try {
    // 2. Render template to HTML
    const { getTemplateComponent } = await import('./templateRenderer')
    const Component = getTemplateComponent(type)
    if (!Component) {
      throw new Error(`Template component not found for type: ${type}`)
    }

    const html = renderToString(
      React.createElement(Component, {
        payload: { ...payload, templateVersion: templateVersion || TEMPLATE_VERSION },
      })
    )

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    @page { margin: 0; size: letter; }
  </style>
</head>
<body>${html}</body>
</html>`

    // 3. Generate PDF with Puppeteer
    const puppeteer = await getPuppeteer()
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'letter',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      printBackground: true,
      preferCSSPageSize: true,
    })
    await browser.close()

    // 4. Upload to Supabase Storage
    const fileName = `documents/${type}/${documentId}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('[generateDocument] Upload error:', uploadError)
      // Try creating bucket
      await supabase.storage.createBucket('documents', { public: true })
      const { error: retryError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (retryError) throw retryError
    }

    // 5. Get public URL
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    const pdfUrl = urlData.publicUrl

    console.log(`[generateDocument] PDF uploaded: ${pdfUrl}`)

    // 6. Update document record
    await supabase
      .from('generated_documents')
      .update({
        status: 'completed',
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return { pdfUrl }
  } catch (error: any) {
    console.error('[generateDocument] Error:', error)

    await supabase
      .from('generated_documents')
      .update({
        status: 'failed',
        error_message: error.message || 'Error desconocido',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    throw error
  }
}

async function getPuppeteer() {
  try {
    // Try @sparticuz/chromium first (production on Render)
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer')
    return { ...puppeteer.default, launch: (opts: any) =>
      puppeteer.default.launch({
        ...opts,
        executablePath: await chromium.default.executablePath(),
        args: [...(opts.args || []), ...chromium.default.args],
      })
    }
  } catch {
    // Fallback to regular puppeteer (local dev)
    const puppeteer = await import('puppeteer')
    return puppeteer.default
  }
}