import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { BlogTopic } from './blogConversionConfig';

interface CategoryCTAProps {
  category: 'laboral' | 'arriendo' | 'familia' | 'penal';
  topic?: BlogTopic;
}

const CategoryCTA: React.FC<CategoryCTAProps> = ({ category, topic }) => {
  const content = {
    laboral: {
      title: '¿Necesitas ayuda con un tema laboral?',
      description: 'Un abogado laboral puede revisar tu caso, calcular indemnizaciones y ayudarte a demandar dentro del plazo legal.',
      link: '/search?specialty=Derecho%20Laboral',
      linkText: 'Ver abogados laborales disponibles',
    },
    arriendo: {
      title: '¿Tienes problemas con un arriendo o desalojo?',
      description: 'Protege tu propiedad o tus derechos como arrendatario con la ayuda de un experto en juicios de arrendamiento.',
      link: '/search?specialty=Derecho%20Civil',
      linkText: 'Ver abogados de arriendo disponibles',
    },
    familia: {
      title: '¿Necesitas ayuda con tu caso familiar?',
      description: 'Compara abogados especializados en derecho de familia y agenda una consulta online.',
      link: '/search?specialty=Derecho%20de%20Familia',
      linkText: 'Ver abogados de familia disponibles',
    },
    penal: {
      title: '¿Enfrentas una situación penal?',
      description: 'Cada minuto cuenta. Obtén una defensa técnica sólida o recibe asesoría para interponer querellas criminales.',
      link: '/search?specialty=Derecho%20Penal',
      linkText: 'Ver abogados penales disponibles',
    },
  };

  const topicOverrides: Partial<Record<BlogTopic, { description: string; link: string; linkText: string }>> = {
    divorcio: {
      description: 'Compara abogados especializados en divorcio unilateral y mutuo acuerdo, y agenda una consulta online.',
      link: '/abogado-divorcio-unilateral',
      linkText: 'Comparar abogados especializados',
    },
    pension: {
      description: 'Un abogado de familia puede ayudarte a demandar, aumentar, rebajar o cobrar pensiones de alimentos.',
      link: '/search?specialty=Derecho%20de%20Familia',
      linkText: 'Ver abogados de pensión de alimentos',
    },
    finiquito: {
      description: 'Revisa tu finiquito con un abogado laboral antes de firmar y asegúrate de cobrar todo lo que te corresponde.',
      link: '/search?specialty=Derecho%20Laboral',
      linkText: 'Revisar mi finiquito con un abogado',
    },
    despido: {
      description: 'Evalúa si tu despido fue legal y qué indemnizaciones te corresponden con un abogado laboral verificado.',
      link: '/search?specialty=Derecho%20Laboral',
      linkText: 'Ver abogados laborales disponibles',
    },
    arriendo: {
      description: 'Encuentra abogados especializados en contratos, desalojos, cobro de rentas y la ley Devuélveme mi Casa.',
      link: '/search?specialty=Derecho%20Civil',
      linkText: 'Ver abogados de arriendo disponibles',
    },
    penal: {
      description: 'Encuentra abogados penalistas verificados para defensa o querella criminal.',
      link: '/search?specialty=Derecho%20Penal',
      linkText: 'Ver abogados penales disponibles',
    },
    familia: {
      description: 'Compara abogados especializados en cuidado personal, visitas, mediación y conflictos familiares.',
      link: '/search?specialty=Derecho%20de%20Familia',
      linkText: 'Ver abogados de familia disponibles',
    },
  };

  const base = content[category];
  const override = topic ? topicOverrides[topic] : undefined;
  const activeContent = override ? { ...base, ...override } : base;

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 my-12 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-green-900 mb-2">{activeContent.title}</h3>
          <p className="text-green-900 mb-6 leading-relaxed">{activeContent.description}</p>
          <Link
            to={activeContent.link}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-md font-bold hover:bg-green-900 transition-all group"
          >
            {activeContent.linkText}
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CategoryCTA;
