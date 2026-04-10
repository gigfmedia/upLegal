import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { createMercadoPagoPayment } from '@/services/mercadopagoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';

export default function ConsultaDetalle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location_nav = useLocation();
  const queryParams = new URLSearchParams(location_nav.search);
  const rawCategory = queryParams.get('category') || '';
  
  // Normalize category names from the blog (Derecho Laboral -> Laboral)
  const normalizeCategory = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('laboral')) return 'Laboral';
    if (lower.includes('inmobiliario') || lower.includes('arriendo')) return 'Civil';
    if (lower.includes('familia')) return 'Familia';
    if (lower.includes('civil')) return 'Civil';
    if (lower.includes('penal')) return 'Penal';
    return cat;
  };

  const initialCategory = normalizeCategory(rawCategory);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || user?.profile?.first_name ? 
      `${user?.profile?.first_name} ${user?.profile?.last_name || ''}`.trim() : '',
    email: user?.email || '',
    category: initialCategory,
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const consultationId = `consulta-${Date.now()}`;
      
      const paymentParams = {
        amount: 30000, // $30,000 CLP
        userId: user?.id || 'guest',
        lawyerId: 'consulta-general',
        appointmentId: consultationId,
        description: `Consulta Legal - ${formData.category || 'General'}`,
        successUrl: `${window.location.origin}/consulta/confirmacion`,
        failureUrl: `${window.location.origin}/payment/failure`,
        pendingUrl: `${window.location.origin}/payment/pending`,
        userEmail: formData.email || user?.email,
        userName: formData.name
      };
      
      // Use the MercadoPago service
      const response = await createMercadoPagoPayment(paymentParams);
      
      // Backend returns 'payment_link', not 'init_point'
      const paymentUrl = response?.payment_link || response?.init_point;
      
      if (!paymentUrl) {
        throw new Error('No se recibió un enlace de pago válido de MercadoPago');
      }
      
      // Redirect to MercadoPago
      window.location.href = paymentUrl;

    } catch (error) {
      console.error('Error en el pago:', error);
      setError(`
        No se pudo conectar con el servicio de pagos. 
        ${process.env.NODE_ENV === 'development' ? `\n\n${error.message}` : 'Por favor, inténtalo más tarde o contacta a soporte.'}
      `);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl pt-36">
      <Header />
      <h1 className="text-3xl font-bold mb-2">Detalles de la consulta</h1>
      <p className="text-muted-foreground mb-6">Completa el formulario para agendar tu consulta legal.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Tu nombre"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Área de derecho</Label>
          <Select onValueChange={handleCategoryChange} value={formData.category} required>
            <SelectTrigger>
              <SelectValue placeholder="¿Qué tipo de problema legal tienes?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Laboral">
                Laboral (despido, finiquito)
              </SelectItem>
              <SelectItem value="Civil">
                Civil (contratos, deudas, arriendo)
              </SelectItem>
              <SelectItem value="Penal">
                Penal (denuncias, defensa)
              </SelectItem>
              <SelectItem value="Familia">
                Familia (divorcio, pensión, hijos)
              </SelectItem>
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground mt-1">
            No te preocupes si no eliges el área exacta, el abogado te orientará.
          </p>
        </div>

        
        <div className="space-y-2">
          <Label htmlFor="description">Describe tu problema legal</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Cuéntanos sobre tu situación legal..."
            rows={5}
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        {error && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        
        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full py-6 text-sm bg-gray-900 hover:bg-green-900"
            disabled={isLoading || !formData.category}
          >
            {isLoading ? 'Procesando pago...' : 'Pagar $30.000'}
          </Button>
        </div>
      </form>
    </div>
  );
}