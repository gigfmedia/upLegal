import { Link2, Linkedin, Mail } from "lucide-react";
import { toast } from "sonner";

interface BlogShareProps {
  title: string;
  url: string;
  showBorder?: boolean;
}

export const BlogShare = ({ title, url, showBorder = true }: BlogShareProps) => {
  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Mira este artículo de LegalUp: ${url}`)}`,
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado al portapapeles");
  };

  return (
    <div className={showBorder ? "py-12 mt-12 mb-12" : "pb-12 mb-12 border-b border-gray-100"}>
      <div className="flex flex-col gap-6 items-center text-center">
        <h4 className="text-2xl font-bold text-gray-900 tracking-tight">
          Comparte este artículo
        </h4>
        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* Email */}
          <button
            onClick={() => window.open(shareLinks.email, '_self')}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Compartir por Email"
          >
            <Mail className="h-7 w-7 md:h-8 md:w-8 stroke-[1.5]" />
          </button>
          
          {/* WhatsApp */}
          <button
            onClick={() => window.open(shareLinks.whatsapp, '_blank')}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Compartir en WhatsApp"
          >
            <svg className="h-7 w-7 md:h-8 md:w-8 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </button>

          {/* Facebook - Circular */}
          <button
            onClick={() => window.open(shareLinks.facebook, '_blank')}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Compartir en Facebook"
          >
          <svg className="h-7 w-7 md:h-8 md:w-8 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path id="primary" d="M14,6h3a1,1,0,0,0,1-1V3a1,1,0,0,0-1-1H14A5,5,0,0,0,9,7v3H7a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1H9v7a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V14h2.22a1,1,0,0,0,1-.76l.5-2a1,1,0,0,0-1-1.24H13V7A1,1,0,0,1,14,6Z"></path>
          </svg>
          </button>

          {/* LinkedIn - Square */}
          <button
            onClick={() => window.open(shareLinks.linkedin, '_blank')}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Compartir en LinkedIn"
          >
            <svg className="h-7 w-7 md:h-8 md:w-8 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d='M19.959 11.719v7.379h-4.278v-6.885c0-1.73-.619-2.91-2.167-2.91-1.182 0-1.886.796-2.195 1.565-.113.275-.142.658-.142 1.043v7.187h-4.28s.058-11.66 0-12.869h4.28v1.824l-.028.042h.028v-.042c.568-.875 1.583-2.126 3.856-2.126 2.815 0 4.926 1.84 4.926 5.792zM2.421.026C.958.026 0 .986 0 2.249c0 1.235.93 2.224 2.365 2.224h.028c1.493 0 2.42-.989 2.42-2.224C4.787.986 3.887.026 2.422.026zM.254 19.098h4.278V6.229H.254v12.869z' /></svg>
          </button>

          {/* X (Twitter) - Custom SVG */}
          <button
            onClick={() => window.open(shareLinks.twitter, '_blank')}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Compartir en X"
          >
            <svg className="h-7 w-7 md:h-8 md:w-8 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>

          {/* Link */}
          <button
            onClick={copyToClipboard}
            className="text-gray-900 hover:text-green-600 transition-colors"
            title="Copiar enlace"
          >
            <Link2 className="h-7 w-7 md:h-8 md:w-8" />
          </button>
        </div>
      </div>
    </div>
  );
};
