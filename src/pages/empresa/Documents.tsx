import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Upload, FileText, Download, Trash2 } from 'lucide-react'

const mockDocuments = [
  { id: '1', name: 'Contrato de arriendo.pdf', category: 'Contratos', date: '2026-06-15', size: '2.4 MB' },
  { id: '2', name: 'Escritura sociedad.docx', category: 'Escrituras', date: '2026-06-10', size: '1.1 MB' },
]

export default function Documents() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis documentos</h1>
          <p className="text-gray-600 mt-1">Biblioteca de documentos de tu empresa</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Subir documento
        </Button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600">Arrastra documentos aquí o haz clic para subir</p>
      </div>

      <div className="space-y-3">
        {mockDocuments.map((doc) => (
          <Card key={doc.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.category} · {doc.date} · {doc.size}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
