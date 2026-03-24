import { Search, MapPin, SlidersHorizontal, ArrowRight } from "lucide-react";
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
  autoFocus?: boolean;
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
  placeholder = "Describe tu problema, ej: Me quieren subir el arriendo sin aviso, ¿es legal?",
  autoFocus = false,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation(); // Stop event bubbling
      onSearch();
    }
  };

  return (
    <div className="relative group w-full bg-white shadow-2xl rounded-2xl overflow-hidden shadow-sm border border-gray-300 group-focus-within:border-transparent transition-colors duration-300" onSubmit={(e) => e.preventDefault()}>
      {/* Centered Rotating Square using custom CSS keyframes to ensure duration is respected */}
      <div 
        className="pointer-events-none absolute top-1/2 left-1/2 w-[120vw] h-[120vw] md:w-[1200px] md:h-[1200px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 bg-[conic-gradient(from_0deg,transparent_0deg,theme(colors.blue.500)_90deg,theme(colors.purple.500)_180deg,theme(colors.pink.500)_270deg,transparent_360deg)] z-0"
        style={{ animation: 'search-bar-spin 3s linear infinite' }}
      />

      {/* Internal "Mask" to create the 2px border effect */}
      <div className="absolute inset-[2px] rounded-[14px] bg-white pointer-events-none z-10" />

      {/* Contenedor relativo del textarea y boton */}
      <div className="relative w-full h-full flex flex-col z-20">
        <textarea
          placeholder={placeholder}
          className="relative w-full min-h-[120px] p-5 rounded-2xl bg-transparent border-none outline-none resize-none"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        <button 
          type="button"
          onClick={onSearch}
          className="absolute bottom-3 right-3 bg-gray-900 hover:bg-black text-white rounded-full flex items-center justify-end group/btn h-10 w-10 hover:w-[100px] transition-all duration-300 ease-in-out overflow-hidden shadow-md"
          title="Buscar"
        >
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-all duration-300 delay-75 transform -translate-x-2 group-hover/btn:translate-x-0 absolute right-10">
            Buscar
          </span>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-transparent">
            <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        </button>
      </div>
    </div>
  );
}
