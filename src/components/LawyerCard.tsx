
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, CheckCircle, MessageCircle, Calendar } from "lucide-react";

interface Lawyer {
  id: number;
  name: string;
  specialties: string[];
  rating: number;
  reviews: number;
  location: string;
  hourlyRate: number;
  image: string;
  bio: string;
  verified: boolean;
}

interface LawyerCardProps {
  lawyer: Lawyer;
  onContact: () => void;
  onSchedule: () => void;
}

const formatCLP = (amount: number): string => {
  return amount.toLocaleString("es-CL");
}

export function LawyerCard({ lawyer, onContact, onSchedule }: LawyerCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={lawyer.image} alt={lawyer.name} />
            <AvatarFallback className="bg-blue-600 text-white text-lg">
              {lawyer.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-gray-900 truncate">
                {lawyer.name}
              </h3>
              {lawyer.verified && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-1 mt-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-medium text-gray-900">{lawyer.rating}</span>
              <span className="text-gray-500">({lawyer.reviews} reseñas)</span>
            </div>
            
            <div className="flex items-center space-x-1 mt-1 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{lawyer.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Specialties */}
          <div className="flex flex-wrap gap-2">
            {lawyer.specialties.map((specialty) => (
              <Badge key={specialty} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>

          {/* Bio */}
          <p className="text-gray-600 text-sm line-clamp-3">
            {lawyer.bio}
          </p>

          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                ${formatCLP(lawyer.hourlyRate)}
              </span>
              <span className="text-gray-600"> / hora</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={onContact}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contactar
            </Button>
            <Button
              onClick={onSchedule}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
