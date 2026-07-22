import { useRef } from 'react';

interface SpecialtiesSliderProps {
  selectedSpecialty: string[];
  onSpecialtyChange: (specialties: string[]) => void;
}

const normalizeSpecialty = (s: string): string => {
  const lower = s.toLowerCase();
  if (lower.includes('familia')) return 'Derecho de Familia';
  if (lower.includes('laboral')) return 'Derecho Laboral';
  if (lower.includes('penal')) return 'Derecho Penal';
  if (lower.includes('inmobiliario')) return 'Derecho Inmobiliario';
  if (lower.includes('arriendo') || lower.includes('arrendamiento')) return 'Derecho Civil';
  if (lower.includes('comercial')) return 'Derecho Comercial';
  if (lower.includes('tributario')) return 'Derecho Tributario';
  if (lower.includes('civil')) return 'Derecho Civil';
  if (lower.includes('salud')) return 'Derecho de Salud';
  if (lower.includes('administrativo')) return 'Derecho Administrativo';
  if (lower.includes('propiedad intelectual')) return 'Propiedad Intelectual';
  if (lower.includes('migracion') || lower.includes('migratorio') || lower.includes('extranjeria')) return 'Derecho Migratorio';
  return s;
};

const SPECIALTIES = [
  'Todas',
  'Derecho Civil',
  'Penal',
  'Laboral',
  'Familia',
  'Comercial',
  'Tributario',
  'Inmobiliario',
  'Salud',
  'Ambiental',
  'Consumidor',
  'Administrativo',
  'Procesal',
  'Propiedad Intelectual',
  'Seguridad Social',
  'Minero',
  'Aduanero',
  'Marítimo',
  'Aeronáutico',
  'Deportivo',
];

export default function SpecialtiesSlider({
  selectedSpecialty,
  onSpecialtyChange,
}: SpecialtiesSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mouse drag to scroll (desktop)
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex gap-2 overflow-x-auto py-2 px-1 cursor-grab active:cursor-grabbing select-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {SPECIALTIES.map((specialty) => {
        const value = specialty === 'Todas' ? 'all' : normalizeSpecialty(specialty);
        const isActive = selectedSpecialty.includes(value);

        return (
          <button
            key={specialty}
            type="button"
            onClick={() => {
              let newSpecialties = [...selectedSpecialty];
              if (value === 'all') {
                newSpecialties = ['all'];
              } else {
                newSpecialties = newSpecialties.filter((s) => s !== 'all');
                if (newSpecialties.includes(value)) {
                  newSpecialties = newSpecialties.filter((s) => s !== value);
                } else {
                  newSpecialties.push(value);
                }
                if (newSpecialties.length === 0) newSpecialties = ['all'];
              }
              onSpecialtyChange(newSpecialties);
            }}
            className={`
              flex-shrink-0 whitespace-nowrap rounded-full text-sm font-medium transition-colors
              ${isActive
                ? 'bg-gray-900 text-green-400 hover:bg-green-900'
                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'}
            `}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              fontWeight: 500,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            {specialty}
          </button>
        );
      })}
    </div>
  );
}
