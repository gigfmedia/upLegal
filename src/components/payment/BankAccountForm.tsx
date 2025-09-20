import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

export default function BankAccountForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankAccount, setBankAccount] = useState({
    bank_name: '',
    account_number: '',
    account_name: '',
    rut: '',
    email: '',
  });

  useEffect(() => {
    const fetchBankAccount = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/get-bank-account', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setBankAccount({
              bank_name: data.bank_name || '',
              account_number: data.account_number || '',
              account_name: data.account_name || '',
              rut: data.rut || '',
              email: data.email || user.email || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBankAccount();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await fetch('/api/save-bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...bankAccount,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la información bancaria');
      }

      // Show success message
      alert('Información bancaria guardada correctamente');
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert(error.message || 'Error al guardar la información bancaria');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankAccount(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Bancaria</CardTitle>
        <CardDescription>
          Ingresa los datos de tu cuenta bancaria para recibir pagos. LegalUp te transferirá el 80% de cada pago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Banco</Label>
              <Input
                id="bank_name"
                name="bank_name"
                value={bankAccount.bank_name}
                onChange={handleChange}
                placeholder="Ej: Banco de Chile"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_number">Número de Cuenta</Label>
              <Input
                id="account_number"
                name="account_number"
                value={bankAccount.account_number}
                onChange={handleChange}
                placeholder="Número de cuenta"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_name">Nombre del Titular</Label>
              <Input
                id="account_name"
                name="account_name"
                value={bankAccount.account_name}
                onChange={handleChange}
                placeholder="Nombre como aparece en la cuenta"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rut">RUT del Titular</Label>
              <Input
                id="rut"
                name="rut"
                value={bankAccount.rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email para notificaciones</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={bankAccount.email}
                onChange={handleChange}
                placeholder="email@ejemplo.com"
                required
              />
            </div>
          </div>
          
          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Información Bancaria'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
