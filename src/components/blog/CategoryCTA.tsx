import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Home, Users, Shield } from 'lucide-react';

interface CategoryCTAProps {
  category: 'laboral' | 'arriendo' | 'familia' | 'penal';
}

const CategoryCTA: React.FC<CategoryCTAProps> = ({ category }) => {
  const content = {
    laboral: {
      title: '¿Necesitas ayuda con un tema laboral?',
      description: 'Un abogado laboral puede revisar tu caso, calcular indemnizaciones y ayudarte a demandar dentro del plazo legal.',
      link: '/search?specialty=Derecho%20Laboral',
      linkText: 'Ver abogados laborales disponibles'
    },
    arriendo: {
      title: '¿Tienes problemas con un arriendo o desalojo?',
      description: 'Protege tu propiedad o tus derechos como arrendatario con la ayuda de un experto en juicios de arrendamiento y ley "Devuélveme mi casa".',
      link: '/search?specialty=Derecho%20Civil',
      linkText: 'Ver abogados de arriendo disponibles'
    },
    familia: {
      title: '¿Buscas asesoría en temas de familia?',
      description: 'Nuestros especialistas te guiarán en procesos de pensión de alimentos, divorcio, cuidado personal y mediación con total confidencialidad.',
      link: '/search?specialty=Derecho%20de%20Familia',
      linkText: 'Ver abogados de familia disponibles'
    },
    penal: {
      title: '¿Enfrentas una situación penal?',
      description: 'Cada minuto cuenta. Obtén una defensa técnica sólida o recibe asesoría para interponer querellas criminales de forma inmediata.',
      link: '/search?specialty=Derecho%20Penal',
      linkText: 'Ver abogados penales disponibles'
    }
  };

  const activeContent = content[category];

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 my-12 shadow-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-green-900 mb-2">
            {activeContent.title}
          </h3>
          <p className="text-green-900 mb-6 leading-relaxed">
            {activeContent.description}
          </p>
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
