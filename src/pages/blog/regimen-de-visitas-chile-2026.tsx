import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const VisitScheduleCalculator = () => {
    const [weekends, setWeekends] = useState(2);
    const [holidays, setHolidays] = useState(15);

    const monthlyDays = weekends * 2 + Math.round(holidays / 12);

    return (
        <div className="p-6 sm:p-8 rounded-md my-8 border">
            <div className="max-w-xl mx-auto">
                <h3 className="text-xl font-bold mb-6 text-gray-900">
                    Estima tiempo de visitas mensual
                </h3>

                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Fines de semana al mes
                        </label>
                        <select
                            value={weekends}
                            onChange={(e) => setWeekends(Number(e.target.value))}
                            className="w-full p-2 border border-gray-200 rounded-lg"
                        >
                            <option value={1}>1 fin de semana</option>
                            <option value={2}>2 fines de semana</option>
                            <option value={3}>3 fines de semana</option>
                            <option value={4}>4 fines de semana</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Días de vacaciones al año
                        </label>
                        <input
                            type="number"
                            value={holidays}
                            onChange={(e) => setHolidays(Number(e.target.value))}
                            className="w-full p-2 border border-gray-200 rounded-lg"
                        />
                    </div>
                </div>

                <div className="bg-green-100 p-6 rounded-xl text-center border border-green-100">
                    <p className="text-green-900 font-medium mb-1">
                        Tiempo estimado de convivencia mensual
                    </p>

                    <p className="text-3xl font-bold text-green-600">
                        {monthlyDays} días
                    </p>
                </div>

                <p className="text-sm italic text-gray-400 mt-4 leading-relaxed">
                    *Cálculo referencial. El régimen de visitas real depende de lo que
                    acuerden los padres o determine el tribunal considerando el interés
                    superior del niño, niña o adolescente.
                </p>
            </div>
        </div>
    );
};

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Qué es el régimen de visitas en Chile?",
            answer:
                "El régimen de visitas — actualmente llamado relación directa y regular — es el derecho y deber que tiene el padre o madre que no vive con el hijo para mantener contacto frecuente con él. Puede incluir fines de semana, vacaciones, videollamadas, cumpleaños y otras formas de convivencia.",
        },
        {
            question: "¿Quién fija el régimen de visitas?",
            answer:
                "Puede acordarse voluntariamente entre los padres mediante mediación o acuerdo aprobado judicialmente. Si no existe acuerdo, el Tribunal de Familia puede fijarlo considerando el interés superior del niño, niña o adolescente.",
        },
        {
            question: "¿Qué pasa si no me dejan ver a mi hijo?",
            answer:
                "Puedes solicitar cumplimiento judicial del régimen de visitas ante el Tribunal de Familia. El tribunal puede ordenar medidas para restablecer el contacto y sancionar incumplimientos reiterados.",
        },
        {
            question: "¿Puedo pedir visitas si no pago pensión?",
            answer:
                "Sí. El derecho a mantener relación con los hijos es independiente del pago de pensión de alimentos. No pagar pensión no elimina automáticamente el derecho a visitas.",
        },
        {
            question: "¿Se puede modificar el régimen de visitas?",
            answer:
                "Sí. Si cambian las circunstancias — horarios, ciudad, edad del niño o conflictos graves — cualquiera de los padres puede pedir una modificación ante el Tribunal de Familia.",
        },
        {
            question: "¿Puede uno de los padres negarse a cumplir el régimen de visitas?",
            answer:
                "No. Una vez fijado judicialmente o acordado ante el tribunal, el régimen de visitas es de cumplimiento obligatorio para ambas partes. El padre que impide el contacto puede enfrentar sanciones judiciales, multas y en casos graves incluso la modificación del cuidado personal del hijo.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Régimen de visitas en Chile 2026: derechos, horarios y qué hacer si no te dejan ver a tu hijo"
                description="Conoce cómo funciona el régimen de visitas en Chile 2026, qué derechos tienen los padres, cómo fijarlo judicialmente y qué hacer si existe incumplimiento."
                image="/assets/regimen-de-visitas-chile-2026.png"
                url="https://legalup.cl/blog/regimen-visitas-chile-2026"
                datePublished="2026-05-29"
                dateModified="2026-05-29"
                faqs={faqs}
            />

            <Header onAuthClick={() => { }} />
            <ReadingProgressBar />

            {/* HERO */}
            <div className="bg-green-900 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">

                    <div className="flex items-center gap-2 mb-4">
                        <Link to="/blog" className="hover:text-white transition-colors">
                            Blog
                        </Link>

                        <ChevronRight className="h-4 w-4" />

                        <span>Artículo</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
                        Régimen de visitas en Chile 2026: derechos, horarios y qué hacer si no te dejan ver a tu hijo
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>

                        <ul className="space-y-2">
                            {[
                                "El régimen de visitas protege el derecho del niño a mantener vínculo con ambos padres",
                                "Puede acordarse entre las partes o fijarse judicialmente",
                                "El incumplimiento puede denunciarse ante el Tribunal de Familia",
                                "Las visitas pueden incluir fines de semana, vacaciones y videollamadas",
                                "El tribunal siempre prioriza el interés superior del niño, niña o adolescente"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El régimen de visitas en Chile — actualmente conocido legalmente como relación directa y regular — es uno de los temas más importantes en Derecho de Familia. Cuando los padres se separan, muchas veces aparecen conflictos sobre horarios, visitas, vacaciones o incluso impedimentos para ver a los hijos.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>29 de Mayo, 2026</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="regimen-de-visitas-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">

                    <BlogShare
                        title="Régimen de visitas en Chile 2026"
                        url="https://legalup.cl/blog/regimen-visitas-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En esta guía 2026 te explicamos cómo funciona el régimen de visitas en Chile, qué derechos tienen ambos padres, cómo se fija judicialmente y qué hacer si la otra parte incumple el acuerdo o impide el contacto con tus hijos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si además existe conflicto por pensión alimenticia o incumplimientos económicos, revisa también nuestra guía sobre{" "}
                            <Link
                                to="/blog/deuda-pension-alimentos-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                deuda de pensión de alimentos en Chile
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Qué es el régimen de visitas en Chile?
                        </h2>

                        <p className="text-gray-600 mb-4">
                            El régimen de visitas es el sistema que regula cómo un padre o madre mantiene contacto con sus hijos cuando no vive con ellos de forma permanente.
                        </p>

                        <p className="text-gray-600 mb-4">
                            Actualmente, la legislación chilena utiliza el concepto de “relación directa y regular”, porque no se trata solamente de “visitar” al hijo, sino de mantener una relación activa, estable y permanente.
                        </p>

                        <InArticleCTA category="Derecho de Familia" />

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>

                            <p className="text-blue-800">
                                El objetivo principal no es beneficiar al padre o madre, sino proteger el derecho del niño a mantener vínculo con ambos padres.
                            </p>
                        </div>
                    </div>

                    {/* QUE PUEDE INCLUIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">
                            ¿Qué puede incluir el régimen de visitas?
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                {
                                    title: "Fines de semana",
                                    desc: "Visitas día sábado y domingo o fines de semana alternados.",
                                    icon: "📅",
                                },
                                {
                                    title: "Vacaciones",
                                    desc: "Distribución de vacaciones de verano e invierno.",
                                    icon: "✈️",
                                },
                                {
                                    title: "Videollamadas",
                                    desc: "Comunicación telefónica o virtual frecuente.",
                                    icon: "📱",
                                },
                                {
                                    title: "Fechas especiales",
                                    desc: "Cumpleaños, Navidad, Año Nuevo y celebraciones.",
                                    icon: "🎂",
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="font-bold text-gray-900">
                                            {item.title}
                                        </span>
                                    </div>

                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <VisitScheduleCalculator />

                    <div className="mb-12">

                    </div>

                    {/* COMO SE FIJA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Cómo se fija el régimen de visitas?
                        </h2>

                        <p className="text-gray-600 mb-4">
                            Existen dos formas principales:
                        </p>

                        <div className="space-y-4">
                            {[
                                {
                                    title: "Acuerdo entre los padres",
                                    desc: "Los padres pueden llegar a un acuerdo voluntario mediante mediación o directamente entre ellos.",
                                },
                                {
                                    title: "Resolución judicial",
                                    desc: "Si no existe acuerdo, el Tribunal de Familia fija el régimen considerando la edad del niño, estabilidad emocional, horarios y contexto familiar.",
                                },
                            ].map((step, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                                >
                                    <h3 className="font-bold text-gray-900 mb-2">
                                        {step.title}
                                    </h3>

                                    <p className="text-gray-600">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FACTORES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Qué considera el juez para fijar las visitas?
                        </h2>

                        <p className="text-gray-600 mb-6">
                            El tribunal analiza múltiples factores antes de fijar un régimen:
                        </p>

                        <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700">
                            {[
                                "Edad del niño o adolescente",
                                "Distancia entre domicilios",
                                "Horarios laborales y escolares",
                                "Relación previa entre el padre/madre y el hijo",
                                "Capacidad de cuidado y estabilidad",
                                "Existencia de violencia intrafamiliar o riesgos",
                                "Necesidades emocionales del niño",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic mt-8">
                            La jurisprudencia chilena ha reiterado que el listado de factores que considera el juez no es taxativo, sino enunciativo. El tribunal puede valorar circunstancias no previstas expresamente en la ley, siempre que resulten relevantes para el interés superior del niño. Por ejemplo, la opinión del adolescente manifestada en audiencia reservada tiene un peso creciente en la jurisprudencia actual, especialmente cuando existe madurez suficiente para formarse un juicio propio.
                        </p>
                    </div>



                    {/* INCUMPLIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Qué pasa si no me dejan ver a mi hijo?
                        </h2>

                        <p className="text-gray-600 mb-4">
                            Si existe un régimen de visitas vigente y el otro padre o madre impide el contacto, puedes denunciar el incumplimiento ante el Tribunal de Familia.
                        </p>

                        <p className="text-gray-600 mb-6">
                            El tribunal puede ordenar medidas para asegurar el cumplimiento y proteger el vínculo familiar.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                "Requerimiento judicial de cumplimiento",
                                "Compensación de visitas perdidas",
                                "Multas",
                                "Modificación del cuidado personal",
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-4"
                                >
                                    {/* <div className="text-red-500 font-bold text-lg flex-shrink-0">
                                        x
                                    </div> */}
                                    <p className="text-red-900 font-medium">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VISITAS SUPERVISADAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Qué son las visitas supervisadas?
                        </h2>

                        <p className="text-gray-600 mb-4">
                            En algunos casos, el tribunal puede ordenar visitas supervisadas cuando existe riesgo para el niño o conflicto grave entre los padres.
                        </p>

                        <p className="text-gray-600 mb-4">
                            Esto ocurre, por ejemplo, en situaciones de:
                        </p>

                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                            <ul className="space-y-3">
                                {[
                                    "Violencia intrafamiliar",
                                    "Consumo problemático de alcohol o drogas",
                                    "Alejamiento prolongado del hijo",
                                    "Problemas psicológicos graves",
                                    "Riesgo para la integridad del niño, niña o adolescente",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span className="text-amber-900">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic mt-8">
                            Desde una perspectiva jurisprudencial, los tribunales de familia chilenos han precisado que las visitas supervisadas no constituyen una sanción para el progenitor, sino una medida de protección. Su procedencia exige un análisis ponderado del riesgo concreto, sin que baste una mera alegación de peligro. La Corte Suprema ha establecido que deben preferirse medidas menos restrictivas del vínculo parental antes de recurrir a esta modalidad.
                        </p>
                    </div>

                    {/* CASOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">
                            Casos comunes en Chile
                        </h2>

                        <div className="space-y-4">
                            {[
                                {
                                    title: "Padre que no puede ver a su hijo",
                                    desc: "Se solicita cumplimiento judicial y recuperación de visitas perdidas.",
                                },
                                {
                                    title: "Cambio de ciudad",
                                    desc: "Se modifica el régimen para adaptarlo a distancia y viajes.",
                                },
                                {
                                    title: "Conflictos constantes",
                                    desc: "El tribunal fija horarios específicos y reglas claras.",
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                                >
                                    <h3 className="font-bold text-gray-900 mb-2">
                                        {item.title}
                                    </h3>

                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CUÁNTO DEMORA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            ¿Cuánto demora fijar un régimen de visitas en Chile?
                        </h2>

                        <p className="text-gray-600 mb-4">
                            El tiempo depende de si existe acuerdo entre los padres o si el conflicto debe resolverse judicialmente.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 mb-6">
                            {[
                                {
                                    title: "Con acuerdo",
                                    desc: "Si ambas partes llegan a acuerdo en mediación, el proceso puede resolverse en pocas semanas."
                                },
                                {
                                    title: "Sin acuerdo",
                                    desc: "Si el caso llega a juicio, el proceso puede durar varios meses dependiendo de la carga del tribunal y complejidad del conflicto."
                                },
                                {
                                    title: "Medidas urgentes",
                                    desc: "En situaciones graves, el tribunal puede dictar medidas provisorias para asegurar contacto inmediato."
                                },
                                {
                                    title: "Modificaciones posteriores",
                                    desc: "El régimen puede revisarse nuevamente si cambian las circunstancias familiares."
                                }
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                                >
                                    <h3 className="font-bold text-gray-900 mb-2">
                                        {item.title}
                                    </h3>

                                    <p className="text-gray-600">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>

                            <p className="text-blue-800">
                                Mientras antes se inicie el proceso, más rápido puede regularizarse la relación con el hijo. Esperar demasiado tiempo suele aumentar el conflicto y dificultar los acuerdos.
                            </p>
                        </div>
                        <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic mt-8">
                            En la práctica, la duración del proceso depende en buena medida de la carga del tribunal y de la complejidad probatoria. Los tribunales de familia con mayor volumen de causas en Santiago pueden demorar hasta 10 meses en audiencia de juicio, mientras que en regiones el plazo suele ser menor. Además, si se requiere evaluación psicológica o informe social, el tiempo se extiende naturalmente por la espera de dichas pericias.
                        </p>
                    </div>



                    {/* DOCUMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            Documentos necesarios para solicitar régimen de visitas
                        </h2>

                        <p className="text-gray-600 mb-6">
                            Para iniciar correctamente el proceso en Tribunal de Familia, normalmente necesitarás reunir antecedentes básicos que permitan acreditar la relación familiar y la situación actual.
                        </p>

                        <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700">
                            {[
                                "Certificado de nacimiento del hijo o hija",
                                "Cédula de identidad",
                                "Antecedentes de domicilio de ambas partes",
                                "Mensajes o pruebas de incumplimientos si existen",
                                "Acuerdos previos o mediaciones anteriores",
                                "Resoluciones judiciales anteriores relacionadas con familia"
                            ].map((doc, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    <span>{doc}</span>
                                </li>
                            ))}
                        </ul>

                        <p className="text-gray-600 mt-6">
                            Dependiendo del caso, el tribunal también puede solicitar informes psicológicos, antecedentes escolares o evaluaciones familiares para determinar qué régimen protege mejor el interés superior del niño, niña o adolescente.
                        </p>
                    </div>

                    {/* Enlaces relacionados */}
                    <div className="mb-6 space-y-3">
                        <div className="text-center py-4 border-t border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                                Artículos relacionados
                            </p>

                            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">

                                <Link
                                    to="/blog/derecho-de-familia-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Derecho de Familia en Chile
                                </Link>

                                <Link
                                    to="/blog/deuda-pension-alimentos-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Deuda de pensión de alimentos
                                </Link>

                                <Link
                                    to="/blog/aumento-pension-alimentos-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Aumento de pensión de alimentos
                                </Link>

                            </div>
                        </div>
                    </div>

                    {/* ERRORES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">
                            Errores comunes en conflictos por visitas
                        </h2>

                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    {
                                        title: "Usar al hijo como herramienta de presión",
                                        desc: "El conflicto entre adultos no debe afectar el vínculo con el niño, niña o adolecente.",
                                    },
                                    {
                                        title: "No dejar registro de incumplimientos",
                                        desc: "Guardar mensajes y antecedentes puede ser clave ante el tribunal.",
                                    },
                                    {
                                        title: "Pensar que la pensión y las visitas son lo mismo",
                                        desc: "Son obligaciones independientes legalmente.",
                                    },
                                    {
                                        title: "Incumplir horarios reiteradamente",
                                        desc: "Esto puede perjudicar futuras solicitudes judiciales.",
                                    },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="text-red-500 font-bold text-lg flex-shrink-0">
                                            ✕
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-red-900">
                                                {item.title}
                                            </h4>

                                            <p className="text-red-800 opacity-90">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CUANDO CONSULTAR A UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
                        <p className="text-gray-600 mb-4">Este artículo ofrece información general, pero hay escenarios donde la asesoría temprana marca la diferencia:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el otro progenitor impide las visitas de forma reiterada y se necesita activar medidas de cumplimiento forzado ante el tribunal.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existe riesgo de que el niño sea trasladado a otra ciudad o país sin autorización, lo que requiere medidas cautelares urgentes.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando se necesita modificar el régimen vigente por cambio de domicilio, horarios laborales o ingreso escolar del hijo.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existen denuncias cruzadas entre los padres que puedan afectar la determinación del régimen de visitas.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">Una evaluación temprana puede evitar la pérdida de contacto prolongado con el hijo y facilitar una solución judicial más rápida.</p>
                    </div>

                    {/* CTA before Conclusion */}
                    <PreConclusionCTA
                        description="Si no te permiten ver a tu hijo o el régimen actual ya no funciona, un abogado de familia puede solicitar medidas de cumplimiento o modificar el acuerdo ante el tribunal."
                        link="/abogado-pension-alimentos"
                        buttonText="Comparar abogados especializados"
                    />

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho de Familia" />

                    <div className="prose prose-lg max-w-none mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>

                        <p className="text-gray-600 leading-relaxed mb-4">
                            El régimen de visitas en Chile no se trata solo de horarios o días específicos. Su objetivo principal es proteger el vínculo entre padres e hijos después de una separación, asegurando estabilidad emocional y continuidad en la relación familiar.
                        </p>

                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando existe acuerdo entre los padres, el proceso suele ser más rápido y menos conflictivo. Sin embargo, cuando aparecen incumplimientos, bloqueos o disputas permanentes, el Tribunal de Familia puede intervenir para fijar reglas claras y proteger el interés superior del niño, niña o adolecente.
                        </p>

                        <p className="text-gray-600 leading-relaxed mb-4">
                            Muchas personas creen erróneamente que no pagar pensión elimina el derecho a visitas o que quien tiene el cuidado personal puede decidir unilateralmente cuándo permitir el contacto. En la práctica, ambos temas son independientes y deben resolverse judicialmente cuando existe conflicto.
                        </p>

                        <p className="text-gray-600 leading-relaxed mb-4">
                            Actuar rápido frente a incumplimientos es importante. Mientras más tiempo pasa sin contacto, más difícil puede volverse reconstruir el vínculo familiar, especialmente en niños pequeños.
                        </p>

                        <p className="text-gray-600 leading-relaxed mb-4">
                            Este artículo entrega información de carácter general sobre el régimen de visitas en Chile. Las particularidades de cada caso, la existencia de antecedentes de violencia intrafamiliar o la edad de los hijos pueden incidir en la decisión del tribunal de familia.
                        </p>

                        <p className="text-gray-600 leading-relaxed">
                            Si necesitas fijar, modificar o exigir el cumplimiento de un régimen de visitas, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado de familia
                            </Link>{" "}
                            puede evaluar tu situación y representarte ante el tribunal.
                        </p>
                    </div>

                    <CategoryCTA category="familia" topic="familia" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Preguntas frecuentes
                        </h2>
                        <div className="space-y-4">
                            {faqs.map((faq, i) => (
                                <div
                                    key={i}
                                    className="bg-gray-50 p-6 rounded-xl border border-gray-200"
                                >
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        {faq.question}
                                    </h3>

                                    <p className="text-gray-700">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>



            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">

                <div className="mt-8">
                    <BlogShare
                        title="Régimen de visitas en Chile 2026"
                        url="https://legalup.cl/blog/regimen-visitas-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="regimen-visitas-chile-2026" />

                <div className="mt-4 text-center">
                    <Link
                        to="/blog"
                        className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Blog
                    </Link>
                </div>
            </div>
            <BlogConversionPopup category="Derecho de Familia" topic="regimen-visitas" />
        </div>
    );
};

export default BlogArticle;