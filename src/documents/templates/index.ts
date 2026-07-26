import type { DocumentTemplate } from '../types'

import pagareMetadata from './pagare/metadata'
import pagareSchema from './pagare/schema'
import PagareTemplate from './pagare/PagareTemplate'

export const templates: Record<string, DocumentTemplate> = {
  pagare: {
    metadata: pagareMetadata,
    schema: pagareSchema,
    component: PagareTemplate,
  },
}

export function getTemplate(slug: string): DocumentTemplate | undefined {
  return templates[slug]
}

export function getTemplateBySlug(slug: string): DocumentTemplate | undefined {
  return templates[slug]
}

export const documentSlugs = Object.keys(templates)