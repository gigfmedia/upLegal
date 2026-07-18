import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Shield, FileText, Scale } from 'lucide-react'

const extraServices = [
  { icon: FileText, name: 'Redacción de contrato', desc: 'Redacción de contratos comerciales, laborales y civiles.' },
  { icon: Scale, name: 'Representación judicial', desc: 'Representación legal en juicios y audiencias.' },
  { icon: Shield, name: 'Due diligence', desc: 'Revisión exhaustiva de documentación legal.' },
]

export default function Services() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios adicionales</h1>
          <p className="text-gray-600 mt-1">Servicios legales fuera de tu plan de suscripción</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {extraServices.map((svc) => (
          <Card key={svc.name} className="p-6">
            <div className="w-10 h-10 bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <svc.icon className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{svc.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{svc.desc}</p>
            <Button variant="outline" className="w-full">Solicitar</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
