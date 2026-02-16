import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

interface SpecialtiesSliderProps {
  selectedSpecialty: string[];
  onSpecialtyChange: (specialties: string[]) => void;
}

export default function SpecialtiesSlider({
  selectedSpecialty,
  onSpecialtyChange,
}: SpecialtiesSliderProps) {
  return (
    <Swiper
      modules={[Navigation]}
      spaceBetween={8}
      slidesPerView={'auto'}
      navigation={false}
      className="py-2 px-2"
      style={{ paddingLeft: '8px', paddingRight: '8px' }}
    >
      {[
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
      ].map((specialty) => (
        <SwiperSlide key={specialty} className="w-auto" style={{ width: 'auto' }}>
          <button
            onClick={() => {
              const value = specialty === 'Todas' ? 'all' : specialty;
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
            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedSpecialty.includes(specialty === 'Todas' ? 'all' : specialty)
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
            }`}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              fontWeight: 500,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            type="button"
          >
            {specialty}
          </button>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
