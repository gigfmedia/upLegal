import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ShieldCheck } from "lucide-react";

export const CAEPopup = () => {
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (hasShown) return;

      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent > 50) {
        setShow(true);
        setHasShown(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasShown]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100 overflow-hidden"
        >
          
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 text-center">
            <div className="bg-green-900 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2 font-serif">
              ¿Tienes deuda CAE?
            </h3>
            
            <p className="text-gray-600 mb-8 text-lg">
              No esperes a que tu situación escale. Revisa tus opciones legales antes de tomar cualquier decisión.
            </p>

            <div className="space-y-3">
              <Button 
                className="w-full bg-gray-900 hover:bg-green-900 text-white font-bold h-12 text-base rounded-xl transition-all"
                onClick={() => {
                  setShow(false);
                  const form = document.getElementById("lead-form");
                  form?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Revisar mi caso ahora
              </Button>
              
              <button 
                onClick={() => setShow(false)}
                className="text-gray-400 text-sm hover:underline"
              >
                No por ahora, solo quiero leer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
