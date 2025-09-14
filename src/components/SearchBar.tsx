import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  onSearch: () => void;
  onFiltersClick: () => void;
  showMobileFilters?: boolean;
}

export function SearchBar({
  searchTerm,
  onSearchTermChange,
  location,
  onLocationChange,
  onSearch,
  onFiltersClick,
  showMobileFilters = true,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="w-full">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Buscar abogados o especialidades..."
            className="pl-9 h-10 w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Ubicación"
            className="pl-9 h-10 w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <Button 
          onClick={onSearch}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </div>
  );
}
