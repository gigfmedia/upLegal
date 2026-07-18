import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateCompany } from '@/services/empresaService'
import type { Company } from '@/types/empresas'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export default function Settings() {
  const { company } = useOutletContext<{ company: Company }>()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    contactName: company.contact_name,
    contactEmail: company.contact_email,
    contactPhone: company.contact_phone || '',
    address: company.address || '',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateCompany(company.id, {
        contact_name: form.contactName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone,
        address: form.address,
      })
      toast.success('Configuración actualizada')
    } catch (error) {
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Administra la configuración de tu empresa</p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Información de contacto</h2>
        <div className="space-y-4">
          <div>
            <Label>Nombre de contacto</Label>
            <Input
              value={form.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />
          </div>
          <div>
            <Label>Email de contacto</Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
            />
          </div>
          <div>
            <Label>Teléfono de contacto</Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
            />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
        </div>

        <Separator className="my-6" />

        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Información de la empresa</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">RUT</span>
            <span className="font-medium text-gray-900">{company.rut}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nombre</span>
            <span className="font-medium text-gray-900">{company.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Industria</span>
            <span className="font-medium text-gray-900">{company.industry || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Trabajadores</span>
            <span className="font-medium text-gray-900">{company.employee_count || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estado</span>
            <span className="font-medium text-gray-900 capitalize">{company.status}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
