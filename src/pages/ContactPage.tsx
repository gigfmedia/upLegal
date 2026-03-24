import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { Check, Loader2, Mail, Phone, MapPin, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";

export default function ContactPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-fill user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      const userData = user.user_metadata || {};
      const profile = userData.profile || {};
      const fullName = [
        profile.first_name || userData.first_name,
        profile.last_name || userData.last_name
      ].filter(Boolean).join(' ').trim() || userData.full_name || user.email?.split('@')[0] || '';
      
      setFormData(prev => ({
        ...prev,
        name: fullName,
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFieldValid = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (!value) return false;
    
    switch (field) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'name':
        return value.trim().length >= 2;
      case 'subject':
        return value.trim().length >= 3; // Reduced from 5 to 3
      case 'message':
        return value.trim().length >= 5; // Reduced from 10 to 5
      default:
        return value.length > 0;
    }
  };

  const isFormValid = () => {
    return (
      isFieldValid('name') &&
      isFieldValid('email') &&
      isFieldValid('subject') &&
      isFieldValid('message')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor, completa todos los campos correctamente antes de enviar.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Send email notification or save to database
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          { 
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            user_id: user?.id || null
          }
        ]);
      
      if (error) throw error;
      
      toast({
        title: "¡Mensaje enviado!",
        description: "Hemos recibido tu mensaje y nos pondremos en contacto contigo pronto.",
      });
      
      navigate('/');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: string, label: string, type = 'text', isTextarea = false) => {
    const isValid = isFieldValid(field);
    const value = formData[field as keyof typeof formData];
    
    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium text-gray-700">
          {label} {!value && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          {isTextarea ? (
            <Textarea
              id={field}
              name={field}
              value={value}
              onChange={handleChange}
              className={`min-h-[120px] ${isValid ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
              disabled={isLoading}
            />
          ) : (
            <Input
              id={field}
              name={field}
              type={type}
              value={value}
              onChange={handleChange}
              className={`${isValid ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
              disabled={isLoading || (field === 'email' && !!user)}
            />
          )}
          {isValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
            </div>
          )}
        </div>
        {!isValid && value.length > 0 && (
          <p className="text-xs text-red-500 mt-1">
            {field === 'email' ? 'Correo inválido' : 
             field === 'subject' ? 'Asunto muy corto (mín. 3 caracteres)' :
             field === 'message' ? 'Mensaje muy corto (mín. 5 caracteres)' :
             'Campo inválido'}
          </p>
        )}
      </div>
    );
  };



  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 flex-1">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="mb-2">
                  <p className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl w-fit px-2 mt-4 items-start gap-2">
                  Contacto
                </p>
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 font-serif sm:text-4xl">
                    ¿Tienes alguna pregunta o comentario? Estamos aquí para ayudarte.
                  </h1>
                </div>
              <p className="text-gray-600">
                Rellena el formulario y te contactaremos pronto.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-green-900 p-2 rounded-full">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Correo electrónico</h3>
                  <p className="text-sm text-gray-600">contacto@legalup.cl</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-green-900 p-2 rounded-full">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Teléfono</h3>
                  <p className="text-sm text-gray-600">+56 9 5091 3358</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-green-900 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Dirección</h3>
                  <p className="text-sm text-gray-600">
                    Pichilemu, Chile
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border border-gray-200 rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle></CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {renderField('name', 'Nombre completo')}
                {renderField('email', 'Correo electrónico', 'email')}
                {renderField('subject', 'Asunto')}
                {renderField('message', 'Mensaje', '', true)}
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-gray-900 hover:bg-green-900 mb-4" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar mensaje
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
