// components/print/CommuniquePrintable.tsx
import { QRCodeSVG } from 'qrcode.react';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";

export default function CommuniquePrintable({ r }: { r: SessionResourceRow }) {
  return (
    <div className="p-10 w-[210mm] min-h-[297mm] bg-white text-black mx-auto">
      <div className="text-center border-b border-black pb-8 mb-8">
        <h1 className="text-4xl font-bold uppercase">Communiqué</h1>
        <p className="text-xl mt-2">{r.designation}</p>
      </div>

      <div className="space-y-4">
        <p className="text-lg">Montant : <strong>{r.amount} {r.currency}</strong></p>
        {r.matieresSummary && (
          <p className="text-lg">Matières : {r.matieresSummary}</p>
        )}
      </div>

      <div className="mt-16 flex flex-col items-center">
        <QRCodeSVG 
          value={`https://sections.inbtp.net/qr/session/${r.id}`} 
          size={300} 
          level="H" 
        />
        <p className="mt-4 text-sm font-mono">{r.id}</p>
      </div>
    </div>
  );
}