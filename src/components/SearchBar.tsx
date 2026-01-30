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
  buttonWidth?: string;
  className?: string;
  placeholder?: string;
}

const buttonWidthMap: Record<string, string> = {
  '1/4': 'w-1/4',
  '1/3': 'w-1/3',
  '1/2': 'w-1/2',
  'full': 'w-full',
}

export function SearchBar({
  searchTerm,
  onSearchTermChange,
  location,
  onLocationChange,
  onSearch,
  onFiltersClick,
  showMobileFilters = true,
  buttonWidth = '1/4',
  className = '',
  placeholder = "Ej: despido injustificado, herencia, contrato, divorcio...",
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation(); // Stop event bubbling
      onSearch();
    }
  };

  return (
    <div className="w-full" onSubmit={(e) => e.preventDefault()}>
      <div className="w-full flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={placeholder}
            className="pl-9 h-12 w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <Button 
          onClick={onSearch}
          className={cn(
            'bg-blue-600 hover:bg-blue-700 text-white font-medium h-12',
            buttonWidthMap[buttonWidth] ?? 'w-1/3'
          )}
        >
          Buscar
        </Button>
      </div>
    </div>
  );
}
