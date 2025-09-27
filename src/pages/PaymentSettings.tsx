import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Banknote, Shield, CheckCircle } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { StripeAccountStatus } from '@/components/StripeAccountStatus';

export default function PaymentSettings() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState('stripe');

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
        <div className="">
            <h1 className="text-2xl font-bold tracking-tight">Configuración de Pagos</h1>
            <p className="text-muted-foreground">
                Gestiona Stripe Connect para recibir pagos por tus servicios legales.
            </p>
        </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full md:w-auto md:grid-cols-2">
          <TabsTrigger value="stripe">
            Cuenta de Pago
          </TabsTrigger>
          <TabsTrigger value="billing">
            Facturación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stripe" className="space-y-6">
          <Card className="border-0">
              {!profileLoading && profile ? (
                <StripeAccountStatus profile={profile} />
              ) : (
                <div className="flex justify-center items-center py-16">
                  <div className="h-12 w-12 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  ¿Cómo funciona?
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <Banknote className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Conecta tu cuenta de Stripe para recibir pagos directamente de tus clientes.</span>
                  </li>
                  <li className="flex items-start">
                    <Shield className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Los pagos son seguros y están protegidos por Stripe.</span>
                  </li>
                  <li className="flex items-start">
                    <CreditCard className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Puedes retirar tus fondos en cualquier momento a tu cuenta bancaria.</span>
                  </li>
                </ul>
              </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de Facturación</CardTitle>
              <CardDescription>
                Revisa tu historial de pagos y facturas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Próximamente: Historial de facturación</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
