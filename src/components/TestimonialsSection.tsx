import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  content: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Paula Soto",
    role: "Madre de Sofía (8 años) y Educadora",
    location: "Santiago, Chile",
    content: "Buscaba un abogado para un tema de familia y encontré una asesoría muy clara en LegalUp. El proceso fue rápido y me sentí acompañada en todo momento. La modalidad online me ayudó mucho a ahorrar tiempo.",
    avatarColor: "bg-[#5EEAD4]" // Mint/Teal
  },
  {
    id: 2,
    name: "Marcela Oyarzún",
    role: "Médico Psiquiatra",
    location: "Pichilemu, Chile",
    content: "Mi experiencia fue espectacular. Agendar fue rápido y sin complicaciones, y el abogado que me atendió fue muy profesional. Entendió perfectamente mi caso y me dio una orientación clara y experta. Totalmente recomendable.",
    avatarColor: "bg-[#93C5FD]" // Light Blue
  },
  {
    id: 3,
    name: "Carolina Torres",
    role: "Profesional",
    location: "Santiago, Chile",
    content: "Muy buena experiencia. Tenía una duda laboral y la pude resolver en una videollamada en menos de 30 minutos. Me gustó la claridad en los precios y la calidad del abogado. Lo recomiendo.",
    avatarColor: "bg-[#C4B5FD]" // Light Purple
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="border bg-gray-900 rounded-full p-1 text-sm text-white mb-4 max-w-3xl mx-auto w-fit px-2 mt-4">OPINIONES</p>
          <h2 className="text-3xl font-bold font-serif text-gray-900 mb-2">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Muchos usuarios ya han resuelto sus dudas legales con los mejores profesionales del país.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 rounded-3xl overflow-hidden bg-white h-full flex flex-col">
              <CardContent className="p-8 relative flex-1 flex flex-col">
                <div className="flex-1">
                  {/* 5 Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#FBBF24] text-[#FBBF24]" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-gray-800 text-lg leading-relaxed mb-8 italic">
                    "{testimonial.content}"
                  </p>
                </div>

                {/* Footer Section */}
                <div className="mt-auto">
                  {/* Divider */}
                  <div className="h-px bg-gray-100 w-full mb-8" />

                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-green-900 flex items-center justify-center text-green-600 text-md`}>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-lg">{testimonial.name}</span>
                      <span className="text-gray-500 text-sm">{testimonial.role}</span>
                      <span className="text-gray-400 text-sm">{testimonial.location}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
