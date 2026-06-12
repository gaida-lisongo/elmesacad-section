// hooks/usePrint.ts
import { createRoot } from 'react-dom/client';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import CommuniquePrintable from "@/components/Common/CommuniquePrintable";

export const usePrintCommunique = () => {
  const generate = (r: SessionResourceRow) => {
    // Créer un conteneur temporaire
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Rendre le composant
    root.render(<CommuniquePrintable r={r} />);

    // Attendre un court instant que le SVG du QR code soit généré
    setTimeout(() => {
      window.print();
      // Nettoyage après impression
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(container);
      }, 100);
    }, 500);
  };

  return { generate };
};