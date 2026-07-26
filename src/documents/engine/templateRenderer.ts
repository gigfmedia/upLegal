// Server-side template loader — used by generateDocument.ts

const templateCache: Record<string, any> = {}

export async function registerTemplate(type: string, Component: any) {
  templateCache[type] = Component
}

export function getTemplateComponent(type: string): any {
  return templateCache[type] || null
}

// Auto-register on import
export async function loadAllTemplates() {
  const templates = [
    { type: 'pagare', path: '../templates/pagare/PagareTemplate' },
  ]

  for (const t of templates) {
    try {
      const mod = await import(t.path)
      registerTemplate(t.type, mod.default)
      console.log(`[templateRenderer] Registered: ${t.type}`)
    } catch (err) {
      console.error(`[templateRenderer] Failed to load ${t.type}:`, err)
    }
  }
}