import { ArrowRight, Loader2 } from "lucide-react";

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
  isLoading?: boolean;
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
  placeholder = "Ej: me quieren desalojar por no pagar arriendo...",
  autoFocus = false,
  isLoading = false,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation(); // Stop event bubbling
      onSearch();
    }
  };

  return (
    <div className="relative group w-full bg-white shadow-2xl rounded-2xl overflow-hidden shadow-sm border border-gray-300 transition-colors duration-200 focus-within:border-green-900 focus-within:ring-1 focus-within:ring-green-900" onSubmit={(e) => e.preventDefault()}>
      {/* Contenedor relativo del textarea y boton */}
      <div className="relative w-full h-full flex flex-col z-20">
        <textarea
          placeholder={placeholder}
          className="relative w-full min-h-[120px] p-5 rounded-2xl bg-transparent border-none outline-none resize-none focus-visible:outline-none"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        <button 
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="absolute bottom-3 right-3 bg-gray-900 hover:bg-green-900 text-white rounded-full flex items-center justify-end group/btn h-10 w-10 md:hover:w-[190px] transition-all duration-300 ease-in-out overflow-hidden shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          title="Hablar con abogado"
        >
          {isLoading ? (
            <>
              <span className="hidden md:inline text-sm font-medium whitespace-nowrap opacity-0 md:group-hover/btn:opacity-100 transition-all duration-300 delay-75">
                Hablar con abogado
              </span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 text-white animate-spin" strokeWidth={2.5} />
              </div>
            </>
          ) : (
            <>
              <span className="hidden md:inline text-sm font-medium whitespace-nowrap opacity-0 md:group-hover/btn:opacity-100 transition-all duration-300 delay-75">
                Hablar con abogado
              </span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
