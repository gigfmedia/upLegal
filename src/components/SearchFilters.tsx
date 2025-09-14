import { X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";


interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpecialty: string;
  onSpecialtyChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  specialties: string[];
  onApplyFilters: (filters: {
    priceRange: [number, number];
    minRating: number;
    minExperience: number;
    availableNow: boolean;
  }) => void;
  onClearFilters: () => void;
}

export function SearchFilters({
  isOpen,
  onClose,
  selectedSpecialty,
  onSpecialtyChange,
  sortBy,
  onSortByChange,
  specialties,
  onApplyFilters,
  onClearFilters,
}: SearchFiltersProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  const [availabilityFilters, setAvailabilityFilters] = useState({
    availableToday: false,
    availableThisWeek: false,
    quickResponse: false,
    emergencyConsultations: false,
  });

  const handleAvailabilityChange = (filter: keyof typeof availabilityFilters) => {
    setAvailabilityFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters({
      priceRange,
      minRating,
      minExperience,
      availableNow,
      ...availabilityFilters,
    });
    onClose();
  };

  const handleClearFilters = () => {
    setPriceRange([0, 1000000]);
    setMinRating(0);
    setMinExperience(0);
    setAvailableNow(false);
    onClearFilters();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
            onClick={onClose}
          />

          {/* Filters Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-[110] overflow-y-auto flex flex-col"
          >
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Filtros</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Specialty Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Especialidad</h3>
                <Select 
                  value={selectedSpecialty} 
                  onValueChange={onSpecialtyChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las especialidades</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
              <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Ordenar por</h3>
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mejor calificación</SelectItem>
                  <SelectItem value="reviews">Más reseñas</SelectItem>
                  <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
                </SelectContent>
              </Select>
            </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Rango de precios (CLP/hora)</h3>
                <div className="space-y-4">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    min={0}
                    max={1000000}
                    step={10000}
                    minStepsBetweenThumbs={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>${priceRange[0].toLocaleString()}</span>
                    <span>${priceRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Calificación mínima</h3>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setMinRating(star)}
                      className={`p-1 rounded-full ${minRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <Star className={`h-5 w-5 ${minRating >= star ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {minRating > 0 ? `${minRating}+` : 'Cualquiera'}
                  </span>
                </div>
              </div>

              {/* Years of Experience */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Años de experiencia mínima</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 3, 5, 10].map((years) => (
                    <button
                      key={years}
                      type="button"
                      onClick={() => setMinExperience(years)}
                      className={`px-2 py-2 text-sm rounded-md border ${
                        minExperience === years
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {years === 0 ? 'Cualquiera' : `${years}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Disponibilidad</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={availabilityFilters.availableToday}
                      onChange={() => handleAvailabilityChange('availableToday')}
                    />
                    <span className="text-sm text-gray-700">Disponible hoy</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={availabilityFilters.availableThisWeek}
                      onChange={() => handleAvailabilityChange('availableThisWeek')}
                    />
                    <span className="text-sm text-gray-700">Disponible esta semana</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={availabilityFilters.quickResponse}
                      onChange={() => handleAvailabilityChange('quickResponse')}
                    />
                    <span className="text-sm text-gray-700">Respuesta rápida (&lt; 2 horas)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={availabilityFilters.emergencyConsultations}
                      onChange={() => handleAvailabilityChange('emergencyConsultations')}
                    />
                    <span className="text-sm text-gray-700">Consultas de emergencias</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-white sticky bottom-0">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-300"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleApplyFilters}
                >
                  Aplicar filtros
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
