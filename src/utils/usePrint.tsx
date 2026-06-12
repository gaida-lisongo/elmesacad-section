// hooks/usePrint.tsx
"use client";

import { createRoot } from 'react-dom/client';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import CommuniquePrintable from "@/components/Common/CommuniquePrintable";

export const usePrintCommunique = () => {
  const generate = (r: SessionResourceRow) => {
    // Créer une iframe invisible pour isoler l'impression
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Attendre le chargement du document de l'iframe
    iframe.onload = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Créer un conteneur dans l'iframe
      const container = iframeDoc.createElement('div');
      iframeDoc.body.appendChild(container);

      // Copier les styles de la page parente pour que Tailwind s'applique
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((s) => {
        iframeDoc.head.appendChild(s.cloneNode(true));
      });

      const root = createRoot(container);
      root.render(<CommuniquePrintable r={r} />);

      // Attendre le rendu (QR code SVG) puis lancer l'impression
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Nettoyage après impression
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(iframe);
        }, 100);
      }, 800);
    };

    // Déclencher le chargement en définissant le HTML de base
    iframe.src = 'about:blank';
  };

  return { generate };
};