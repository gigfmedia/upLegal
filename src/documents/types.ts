export interface DocumentField {
  id: string
  label: string
  placeholder?: string
  helpText?: string
  example?: string
  validation?: 'rut' | 'email' | 'number' | 'text' | 'date' | 'phone'
  group: string
  required: boolean
  pdfField: string
  type?: 'text' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  conditional?: {
    field: string
    value: string
  }
  mask?: string
  formatter?: 'clp' | 'rut' | 'phone' | 'uppercase'
  defaultValue?: string
}

export interface DocumentTemplateMetadata {
  slug: string
  title: string
  description: string
  category: string
  legalCategory: string
  searchKeywords: string[]
  estimatedTime: string
  estimatedReadTime: string
  estimatedGenerationTime: string
  icon: string
  badge?: string
  hero: {
    title: string
    description: string
  }
  button: {
    text: string
  }
  seo: {
    title: string
    description: string
  }
  faq: { question: string; answer: string }[]
  upsell: {
    title: string
    description: string
    buttonText: string
  }
  templateVersion: number
  priceKey?: string
}

export interface DocumentTemplate {
  metadata: DocumentTemplateMetadata
  schema: DocumentField[]
  component: React.ComponentType<{ payload: Record<string, any>; documentId?: string; templateVersion?: number }>
}