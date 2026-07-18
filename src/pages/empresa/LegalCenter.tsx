import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import {
  getLegalFolders,
  getLegalDocuments,
  getLegalDocumentVersions,
  getDocumentLinkedRequests,
  getCompanyRequests,
  seedLegalFolders,
} from '@/services/empresaService'
import type { Company, LegalFolder, LegalDocument, LegalDocumentVersion } from '@/types/empresas'
import {
  FolderIcon,
  FileText,
  ChevronRight,
  ChevronDown,
  Upload,
  Plus,
  Download,
  Trash2,
  History,
  Link2,
  X,
  Search,
  File,
  Loader2,
  Gavel,
  ScrollText,
  Briefcase,
  Receipt,
  Shield,
  Building2,
  Folder,
} from 'lucide-react'

const FOLDER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': FileText,
  'gavel': Gavel,
  'scroll': ScrollText,
  'briefcase': Briefcase,
  'receipt': Receipt,
  'shield': Shield,
  'building': Building2,
  'folder': Folder,
}

function getFolderIcon(icon: string, className?: string) {
  const Icon = FOLDER_ICON_MAP[icon] || Folder
  return <Icon className={className || 'w-4 h-4'} />
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface FolderNode extends LegalFolder {
  children: FolderNode[]
  depth: number
}

function buildTree(folders: LegalFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>()
  const roots: FolderNode[] = []

  for (const f of folders) {
    map.set(f.id, { ...f, children: [], depth: 0 })
  }

  for (const f of folders) {
    const node = map.get(f.id)!
    if (f.parent_id && map.has(f.parent_id)) {
      node.depth = (map.get(f.parent_id)!.depth || 0) + 1
      map.get(f.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function findFolder(folders: FolderNode[], id: string): FolderNode | null {
  for (const f of folders) {
    if (f.id === id) return f
    const found = findFolder(f.children, id)
    if (found) return found
  }
  return null
}

function getBreadcrumbs(folders: FolderNode[], folderId: string | null): { id: string | null; name: string }[] {
  const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Todos los documentos' }]
  if (!folderId) return crumbs

  const allFolders: LegalFolder[] = []
  const flatten = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      allFolders.push(n)
      flatten(n.children)
    }
  }
  flatten(folders)

  const path: LegalFolder[] = []
  let current = allFolders.find(f => f.id === folderId)
  while (current) {
    path.unshift(current)
    current = allFolders.find(f => f.id === current!.parent_id) || undefined as unknown as LegalFolder
  }

  for (const f of path) {
    crumbs.push({ id: f.id, name: f.name })
  }
  return crumbs
}

function countDocsInFolder(allDocs: LegalDocument[], folderId: string | null): number {
  return allDocs.filter(d => d.folder_id === folderId).length
}

export default function LegalCenter() {
  const { company } = useOutletContext<{ company: Company }>()
  const { user } = useAuth()

  const [folders, setFolders] = useState<FolderNode[]>([])
  const [allFolders, setAllFolders] = useState<LegalFolder[]>([])
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [allDocuments, setAllDocuments] = useState<LegalDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Document detail
  const [detailDoc, setDetailDoc] = useState<LegalDocument | null>(null)
  const [docVersions, setDocVersions] = useState<LegalDocumentVersion[]>([])
  const [docRequests, setDocRequests] = useState<any[]>([])
  const [showDetail, setShowDetail] = useState(false)

  // New folder modal
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const seededRef = useRef(false)
  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!company || isLoadingRef.current) return
    isLoadingRef.current = true
    try {
      const [folderData, docData] = await Promise.all([
        getLegalFolders(company.id),
        getLegalDocuments(company.id),
      ])
      setAllFolders(folderData)
      setFolders(buildTree(folderData))
      setDocuments(selectedFolderId
        ? docData.filter(d => d.folder_id === selectedFolderId)
        : docData)
      setAllDocuments(docData)

      if (folderData.length === 0 && !seededRef.current) {
        seededRef.current = true
        setIsSeeding(true)
        try {
          await seedLegalFolders(company.id)
          const newFolders = await getLegalFolders(company.id)
          setAllFolders(newFolders)
          setFolders(buildTree(newFolders))
        } catch (e) {
          console.error('[LegalCenter] Seed error:', e)
        } finally {
          setIsSeeding(false)
        }
      }
    } catch (error) {
      console.error('[LegalCenter] Error loading data:', error)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [company, selectedFolderId])

  useEffect(() => {
    loadData()
  }, [company])

  const selectFolder = async (folderId: string | null) => {
    setSelectedFolderId(folderId)
    if (!company) return

    if (folderId === null) {
      const docs = await getLegalDocuments(company.id)
      setDocuments(docs || [])
      return
    }

    // Include documents from all descendant folders
    const collectDescendantIds = (id: string): string[] => {
      const ids = [id]
      const children = allFolders.filter(f => f.parent_id === id)
      for (const child of children) {
        ids.push(...collectDescendantIds(child.id))
      }
      return ids
    }
    const folderIds = collectDescendantIds(folderId)

    const docs = await supabase
      .from('legal_documents')
      .select('*')
      .eq('company_id', company.id)
      .in('folder_id', folderIds)
      .order('updated_at', { ascending: false })
    setDocuments(docs.data || [])
  }

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName || !company || !user) return
    setIsUploading(true)
    try {
      const fileExt = uploadFile.name.split('.').pop()
      const storagePath = `legal-center/${company.id}/${Date.now()}_${uploadFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath)

      const token = (await supabase.auth.getSession()).data.session?.access_token

      const createRes = await fetch('/api/empresas/legal-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          companyId: company.id,
          folderId: uploadFolderId,
          name: uploadName,
          description: uploadDescription || null,
          fileUrl: publicUrl,
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          fileSize: uploadFile.size,
        }),
      })

      if (!createRes.ok) throw new Error('Error al crear documento')

      setShowUploadModal(false)
      setUploadFile(null)
      setUploadName('')
      setUploadDescription('')
      setUploadFolderId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Reload
      const allDocs = await getLegalDocuments(company.id)
      setAllDocuments(allDocs)
      await selectFolder(selectedFolderId)
    } catch (error) {
      console.error('[LegalCenter] Upload error:', error)
      alert('Error al subir documento')
    } finally {
      setIsUploading(false)
    }
  }

  const openDetail = async (doc: LegalDocument) => {
    setDetailDoc(doc)
    setShowDetail(true)
    try {
      const [versions, requests] = await Promise.all([
        getLegalDocumentVersions(doc.id),
        getDocumentLinkedRequests(doc.id),
      ])
      setDocVersions(versions || [])
      setDocRequests(requests || [])
    } catch (error) {
      console.error('[LegalCenter] Error loading detail:', error)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName || !company) return
    try {
      await supabase.from('legal_folders').insert({
        company_id: company.id,
        parent_id: newFolderParentId,
        name: newFolderName,
      })
      setShowNewFolder(false)
      setNewFolderName('')
      setNewFolderParentId(null)
      const folders = await getLegalFolders(company.id)
      setAllFolders(folders)
      setFolders(buildTree(folders))
    } catch (error) {
      console.error('[LegalCenter] Error creating folder:', error)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await supabase.from('legal_documents').delete().eq('id', deleteTarget.id)
      setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id))
      setAllDocuments(prev => prev.filter(d => d.id !== deleteTarget.id))
      if (detailDoc?.id === deleteTarget.id) setShowDetail(false)
    } catch (error) {
      console.error('[LegalCenter] Error deleting document:', error)
    } finally {
      setDeleteTarget(null)
    }
  }

  const filteredDocuments = searchQuery
    ? documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents

  const currentFolder = selectedFolderId
    ? allFolders.find(f => f.id === selectedFolderId)
    : null

  const crumbs = getBreadcrumbs(folders, selectedFolderId)

  // Render folder tree recursively
  const renderFolderNode = (node: FolderNode) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedFolders.has(node.id)
    const isSelected = selectedFolderId === node.id
    const docCount = countDocsInFolder(allDocuments, node.id)

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm group ${
            isSelected ? 'bg-gray-300 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${12 + node.depth * 16}px` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
            className={`p-0.5 rounded ${isSelected ? 'text-gray-900' : 'text-gray-400'} ${!hasChildren ? 'invisible' : ''}`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <span className="mr-1.5 shrink-0">{getFolderIcon(node.icon, 'w-4 h-4')}</span>
          <span
            className="flex-1 truncate"
            onClick={() => selectFolder(node.id)}
          >
            {node.name}
          </span>
          <span className={`text-xs ${isSelected ? 'text-gray/70' : 'text-gray-400'}`}>
            {docCount}
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderFolderNode(child))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro Legal</h1>
          <p className="text-gray-600 mt-1">Repositorio centralizado de documentos legales</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowNewFolder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva carpeta
          </Button>
          <Button onClick={() => { setUploadFolderId(selectedFolderId); setShowUploadModal(true) }}>
            <Upload className="w-4 h-4 mr-2" />
            Subir documento
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Folder tree sidebar */}
        <div className="w-64 shrink-0">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carpetas</span>
            </div>

            {/* Root option */}
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm mb-1 ${
                selectedFolderId === null ? 'bg-gray-300 text-green-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => selectFolder(null)}
            >
              <FolderIcon className="w-4 h-4" />
              <span className="flex-1">Todos</span>
              <span className="text-xs text-gray-400">{allDocuments.length}</span>
            </div>

            {/* Folder tree */}
            <div className="space-y-0.5">
              {folders.map(node => renderFolderNode(node))}
              {folders.length === 0 && !isSeeding && (
                <p className="text-xs text-gray-400 px-2 py-2">
                  No hay carpetas aún
                </p>
              )}
              {isSeeding && (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creando estructura predeterminada...
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Documents area */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb + search */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              {crumbs.map((crumb, idx) => (
                <span key={crumb.id || 'root'} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                  <button
                    onClick={() => selectFolder(crumb.id)}
                    className={`hover:text-gray-900 transition-colors ${
                      idx === crumbs.length - 1 ? 'text-gray-900 font-medium' : ''
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Document grid */}
          {filteredDocuments.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery ? 'Sin resultados' : 'No hay documentos'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery
                  ? 'Ningún documento coincide con tu búsqueda.'
                  : currentFolder
                    ? 'Esta carpeta está vacía.'
                    : 'Sube tu primer documento legal.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => { setUploadFolderId(selectedFolderId); setShowUploadModal(true) }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir documento
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map(doc => (
                <Card
                  key={doc.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => openDetail(doc)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: doc.id, name: doc.name }) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{doc.name}</h3>
                  {doc.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(doc.updated_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Subir documento</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Archivo</Label>
                <div
                  className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-700">{uploadFile.name}</span>
                      <span className="text-xs text-gray-400">({formatFileSize(uploadFile.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Arrastra o haz clic para seleccionar</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                </div>
              </div>

              <div>
                <Label htmlFor="upload-name">Nombre del documento</Label>
                <Input id="upload-name" value={uploadName} onChange={e => setUploadName(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="upload-desc">Descripción (opcional)</Label>
                <Input id="upload-desc" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="upload-folder">Carpeta</Label>
                  <select
                    id="upload-folder"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={uploadFolderId || ''}
                    onChange={e => setUploadFolderId(e.target.value || null)}
                  >
                    <option value="">-- Sin carpeta --</option>
                    {allFolders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.parent_id ? '  ─ ' : ''}{f.name}
                      </option>
                    ))}
                  </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowUploadModal(false)} disabled={isUploading}>
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={!uploadFile || !uploadName || isUploading}>
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Subir</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* New Folder Modal */}
      {showNewFolder && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setShowNewFolder(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nueva carpeta</h2>
              <button onClick={() => setShowNewFolder(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-name">Nombre</Label>
                <Input id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="mt-1" autoFocus />
              </div>
              <div>
                <Label htmlFor="folder-parent">Carpeta padre</Label>
                <select
                  id="folder-parent"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={newFolderParentId || ''}
                  onChange={e => setNewFolderParentId(e.target.value || null)}
                >
                  <option value="">-- Raíz --</option>
                  {allFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancelar</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName}>Crear</Button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Document Detail Slideover */}
      {showDetail && detailDoc && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={() => setShowDetail(false)}>
          <div
            className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{detailDoc.name}</h2>
                <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailDoc.description && (
                <p className="text-sm text-gray-600 mb-4">{detailDoc.description}</p>
              )}

              {/* Current version */}
              {docVersions[0] && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Versión actual (v{docVersions[0].version_number})
                      </p>
                      <p className="text-xs text-gray-500">
                        {docVersions[0].file_name} · {formatFileSize(docVersions[0].file_size)}
                      </p>
                    </div>
                    <a
                      href={docVersions[0].file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-gray-700"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Version history */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historial de versiones
                  </h3>
                </div>
                <div className="space-y-2">
                  {docVersions.map(ver => (
                    <div key={ver.id} className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          v{ver.version_number}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{ver.file_name}</p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(ver.file_size)} · {formatDate(ver.created_at)}
                            {ver.notes && ` · ${ver.notes}`}
                          </p>
                        </div>
                      </div>
                      <a href={ver.file_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                  {docVersions.length === 0 && (
                    <p className="text-xs text-gray-400">Sin versiones</p>
                  )}
                </div>
              </div>

              {/* Linked requests */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4" />
                  Vinculado a solicitudes
                </h3>
                <div className="space-y-2">
                  {docRequests.map((link: any) => (
                    <div key={link.request_id} className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{link.request?.title || 'Sin título'}</p>
                        <p className="text-xs text-gray-400">{link.request?.status}</p>
                      </div>
                    </div>
                  ))}
                  {docRequests.length === 0 && (
                    <p className="text-xs text-gray-400">No vinculado a ninguna solicitud</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Delete Confirmation Modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Eliminar documento</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <strong>{deleteTarget.name}</strong>? Se perderán todas sus versiones.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm}>Eliminar</Button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
