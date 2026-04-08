import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after 300px of scroll
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-50 md:hidden"
        >
          <Button
            size="lg"
            className="w-full bg-gray-900 hover:bg-green-900 text-white shadow-2xl rounded-xl flex items-center justify-center gap-2 h-14 text-base font-bold transition-all"
            onClick={() => {
              const form = document.getElementById("lead-form");
              form?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <MessageSquare className="w-5 h-5" />
            Hablar con un abogado ahora
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
