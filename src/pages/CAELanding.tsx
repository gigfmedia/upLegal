import { useState } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Scale, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Banknote,
  Gavel,
  Star,
  ChevronDown
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { StickyCTA } from "@/components/StickyCTA";
import { CAEPopup } from "@/components/CAEPopup";

const CAELanding = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    stage: ""
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.stage) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos del formulario.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          { 
            name: formData.name,
            email: formData.email,
            subject: `Consulta CAE: ${formData.stage}`,
            message: `Lead proveniente de landing CAE. Etapa seleccionada: ${formData.stage}. El usuario solicita revisión de su caso.`,
          }
        ]);

      if (error) throw error;

      toast({
        title: "¡Recibido!",
        description: "Un abogado experto en CAE revisará tu caso y te contactará pronto.",
      });
      setFormData({ name: "", email: "", stage: "" });
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToForm = () => {
    const form = document.getElementById("lead-form");
    form?.scrollIntoView({ behavior: "smooth" });
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <StickyCTA />
      <CAEPopup />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
              Especialistas en Deuda CAE
            </p>
          </motion.div>
          
          <motion.h1 
            className="text-3xl sm:text-[3.5rem] leading-[1.4] sm:leading-[1.2] font-bold text-gray-900 font-serif mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ¿Tienes deuda CAE y no sabes <br />
            <span className="text-green-900 underline underline-offset-8 font-serif">qué puede pasar contigo?</span>
          </motion.h1>

          <motion.p 
            className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Antes de pagar, firmar un convenio o dejar que avance, revisa tu caso con un abogado.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button 
              size="lg" 
              className="bg-gray-900 hover:bg-green-900 text-white px-10 py-6 text-md rounded-xl shadow-xl transition-all h-14"
              onClick={scrollToForm}
            >
              Revisar mi caso ahora
            </Button>
            
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-600 font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Respuesta clara según tu situación
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Abogados verificados
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> 100% online
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <p className="text-left text-green-900 mb-2">Revisión de casos</p>
              <h2 className="text-3xl font-bold font-serif text-left text-gray-900 mb-8 leading-tight">
                No todos los casos de CAE son iguales
              </h2>
              <div className="space-y-4">
                {[
                  "Dejaste de pagar y no sabes qué pasará",
                  "Te llegó una notificación o demanda",
                  "Estás en TGR y no puedes pagar el convenio",
                  "No sabes si te pueden embargar",
                  "Nunca te notificaron y han pasado años"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-gray-700">
                    <AlertTriangle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-lg font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="mt-10 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-8 py-4 rounded-xl font-bold h-12"
                onClick={scrollToForm}
              >
                Revisar mi caso
              </Button>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm leading-relaxed">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Info className="w-6 h-6 text-green-900" /> La urgencia es real
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  El sistema de cobranza judicial del CAE es automático. Una vez que el banco activa el cobro, el proceso avanza rápidamente hacia TGR o demanda judicial.
                </p>
                <div className="p-4 bg-green-900 rounded-xl font-serif">
                  <p className="text-white font-medium text-md italic">
                    "Actuar en las etapas tempranas puede evitar el embargo de bienes y retención de impuestos."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Insights Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="mb-12">
            <p className="text-left text-green-900 mb-2">Consideraciones Clave</p>
            <h2 className="text-3xl font-bold font-serif text-left text-gray-900 mb-4">
              Antes de pagar o tomar una decisión
            </h2>
            <p className="text-left text-gray-600 mb-12">
              Analiza estas situaciones que pueden cambiar completamente tu panorama legal.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              {
                title: "Cobros diferenciados",
                text: "No todos los cobros se ejecutan igual. Depende de tu universidad, el banco y el tiempo transcurrido."
              },
              {
                title: "Convenios en TGR",
                text: "Firmar un convenio puede limitar opciones después. Considera si es la mejor salida para tu patrimonio."
              },
              {
                title: "Estados de deuda",
                text: "El estado (banco, TGR o demanda) cambia completamente tu situación y las defensas posibles."
              },
              {
                title: "Plazos legales",
                text: "El tiempo y la notificación son factores clave para alegar prescripción o nulidades."
              }
            ].map((insight, i) => (
              <motion.div 
                key={i} 
                className="p-6 rounded-2xl border-2 border-transparent bg-white shadow-sm h-full flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors">
                  <Scale className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold mb-3">{insight.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-grow">{insight.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="mt-12 text-center">
            <Button 
              variant="link" 
              className="text-green-900 font-bold text-lg group hover:no-underline"
              onClick={scrollToForm}
            >
              Ver mi situación <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Cases Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="mb-12">
            <p className="text-left text-green-900 mb-2">Hiper Segmentación</p>
            <h2 className="text-3xl font-bold font-serif text-left text-gray-900 mb-4">
              Identifica en qué etapa de CAE te encuentras
            </h2>
            <p className="text-left text-gray-600 mb-12">
              Selecciona tu caso para recibir una orientación específica.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {/* Caso 1 */}
            <motion.div 
              className="h-full"
              {...fadeInUp}
            >
              <Card className="h-full border border-gray-100 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <CardContent className="p-8 flex-1 flex flex-col">
                  <div className="bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Caso 1: Aún con el banco</h3>
                  <p className="text-gray-600 mb-8 flex-1">
                    Puedes estar a tiempo de revisar antes de que el cobro pase a instancias más complejas.
                  </p>
                  <Button 
                    className="w-full bg-gray-900 hover:bg-green-900 font-bold h-12 rounded-xl"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, stage: "Banco" }));
                      scrollToForm();
                    }}
                  >
                    Revisar este caso
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Caso 2 */}
            <motion.div 
              className="h-full"
              {...fadeInUp}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full border border-gray-200 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <CardContent className="p-8 flex-1 flex flex-col">
                  <div className="bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Caso 2: Deuda en TGR</h3>
                  <p className="text-gray-600 mb-8 flex-1">
                    Hay decisiones que impactan directamente tu situación financiera y retenciones actuales.
                  </p>
                  <Button 
                    className="w-full bg-gray-900 hover:bg-green-900 font-bold h-12 rounded-xl"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, stage: "TGR" }));
                      scrollToForm();
                    }}
                  >
                    Revisar este caso
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Caso 3 */}
            <motion.div 
              className="h-full"
              {...fadeInUp}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full border border-gray-200 transition-all rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <CardContent className="p-8 flex-1 flex flex-col">
                  <div className="bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Gavel className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Caso 3: Demanda o embargo</h3>
                  <p className="text-gray-600 mb-8 flex-1">
                    Es clave actuar a tiempo y entender en qué etapa judicial te encuentras exactamente.
                  </p>
                  <Button 
                    className="w-full bg-gray-900 hover:bg-green-900 font-bold h-12 rounded-xl"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, stage: "Demanda" }));
                      scrollToForm();
                    }}
                  >
                    Revisar este caso
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2 {...fadeInUp} className="text-3xl font-bold font-serif text-gray-900 mb-12">
            Lo que dicen quienes ya se orientaron
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              "No sabía que tenía opciones hasta que revisé mi caso con el abogado.",
              "Pensé que tenía que pagar sí o sí, pero entendí mejor mi situación real.",
              "Me ayudó a tomar una decisión con más claridad frente al banco."
            ].map((quote, i) => (
              <motion.div 
                key={i} 
                className="p-8 rounded-2xl bg-white border border-gray-100 italic text-gray-700 shadow-sm relative"
                {...fadeInUp}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-green-900 text-5xl font-serif absolute -top-2 left-6 opacity-10">“</div>
                "{quote}"
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Form Section */}
      <section id="lead-form" className="py-24 px-4 bg-white scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold font-serif text-gray-900 mb-4">Antes de que avance tu caso, revísalo</h2>
            <p className="text-gray-600">Tomar una decisión sin información puede costarte más después.</p>
          </motion.div>

          <motion.div 
            className="p-8 md:p-12 rounded-3xl shadow-2xl"
            {...fadeInUp}
          >
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Juan Pérez" 
                    className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ejemplo@correo.com" 
                    className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage" className="text-sm font-bold">¿En qué etapa estás?</Label>
                <Select 
                  value={formData.stage}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
                >
                  <SelectTrigger className="h-12 bg-gray-50 border-gray-200 text-gray-900 focus:bg-white">
                    <SelectValue placeholder="Selecciona tu etapa actual" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-none">
                    <SelectItem value="Banco">Aún con el banco</SelectItem>
                    <SelectItem value="TGR">Deuda en TGR</SelectItem>
                    <SelectItem value="Demanda">Demanda o Embargo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-gray-900 hover:bg-green-900 text-white py-6 text-md rounded-xl shadow-xl mt-4 h-14"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Revisar mi caso ahora"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <p className="border bg-gray-900 rounded-full p-1 text-sm text-white mb-4 max-w-3xl mx-auto w-fit px-2 mt-4">FAQ</p>
            <h2 className="text-3xl font-bold font-serif text-gray-900">Preguntas Frecuentes</h2>
          </motion.div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              {
                question: "¿Qué pasa si no pago el CAE?",
                answer: "El no pago activa la garantía estatal. El banco cobra al fisco y la deuda pasa a Tesorería, lo que puede derivar en retenciones de impuestos y demandas judiciales."
              },
              {
                question: "¿Me pueden embargar?",
                answer: "Sí, las deudas de CAE son títulos ejecutivos que permiten el embargo tras una demanda judicial. Actuar a tiempo es clave para defender el patrimonio."
              },
              {
                question: "¿Qué pasa si estoy en TGR?",
                answer: "En Tesorería la deuda genera retenciones de la devolución de impuestos anual. Existen mecanismos para revisar la deuda incluso en esta etapa."
              },
              {
                question: "¿Puedo repactar con el banco?",
                answer: "Se puede, pero usualmente implica reconocer la deuda completa y renunciar a defensas posteriores. Por eso recomendamos asesoría antes de firmar."
              },
              {
                question: "¿Después de cuántos años prescribe?",
                answer: "La prescripción depende de varios factores y plazos legales específicos del título. Un abogado debe revisar tu caso para determinar si es aplicable."
              }
            ].map((faq, index) => (
              <motion.div key={index} {...fadeInUp} transition={{ delay: index * 0.1 }}>
                <Card 
                  className="border border-gray-200 hover:border-black transition-colors cursor-pointer bg-white overflow-hidden shadow-sm"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <CardHeader className="p-6">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="bg-gray-900 p-2 rounded-lg text-white text-xs w-7 h-7 flex items-center justify-center flex-shrink-0 font-bold">
                          {index + 1}
                        </div>
                        <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                          {faq.question}
                        </CardTitle>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                          openFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CardHeader>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaqIndex === index ? "auto" : 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="px-6 pb-6 pt-0 text-left">
                      <div className="pt-4 border-t border-gray-50">
                        <p className="text-gray-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </CardContent>
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre Section */}
      <section className="py-24 px-4 bg-white text-center pb-32">
        <motion.div {...fadeInUp} className="max-w-2xl mx-auto">
          <p className="text-green-900 mb-2">Conclusión</p>
          <h2 className="text-3xl font-bold font-serif text-gray-900 mb-6 leading-tight">Cada caso es distinto.</h2>
          <p className="text-gray-600 text-xl mb-10">Antes de pagar o dejar que avance, revisa el tuyo con expertos.</p>
          <Button 
            size="lg" 
            className="bg-gray-900 hover:bg-green-900 text-white px-12 py-6 text-sm font-bold rounded-xl shadow-xl transition-all h-14"
            onClick={scrollToForm}
          >
            Ver mi caso
          </Button>
        </motion.div>
      </section>
    </div>
  );
};

export default CAELanding;
