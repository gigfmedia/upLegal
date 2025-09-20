import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw, Scale } from "lucide-react";

export default function PaymentCanceled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex flex-col items-center justify-center p-4">
      <div 
        className="mb-8 flex items-center justify-center space-x-2 cursor-pointer"
        onClick={() => window.location.href = '/'}
      >
        <Scale className="h-8 w-8 text-blue-600" />
        <span className="text-2xl font-bold text-gray-900">LegalUp</span>
      </div>
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">
            Pago Cancelado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Tu pago ha sido cancelado. No se realizó ningún cargo a tu tarjeta.
          </p>
          
          <div className="space-y-4">
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
            <Link to="/search" className="block">
              <Button className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Buscar otro abogado
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}