import { useRef } from 'react';

interface SpecialtiesSliderProps {
  selectedSpecialty: string[];
  onSpecialtyChange: (specialties: string[]) => void;
}

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
        const value = specialty === 'Todas' ? 'all' : specialty;
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
