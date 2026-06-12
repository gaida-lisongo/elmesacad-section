// components/print/CommuniquePrintable.tsx
import { QRCodeSVG } from 'qrcode.react';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";

export default function CommuniquePrintable({ r }: { r: SessionResourceRow }) {
  const baseUrl = "https://sections.inbtp.net";
  const qrValue = `${baseUrl}/qr/session/${r.id}`;

  return (
    <div className="p-0 w-[210mm] min-h-[297mm] bg-white text-black mx-auto font-sans">
      {/* ── Header bandeau ────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1a365d] to-[#2b6cb0] text-white px-10 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold uppercase tracking-wide">Communiqué</h1>
            <p className="text-lg mt-2 opacity-90 font-medium">{r.designation}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{r.amount?.toLocaleString('fr-FR')} {r.currency}</p>
            <p className="text-sm opacity-75">Montant de la session</p>
          </div>
        </div>
      </div>
      {/* ── Corps ─────────────────────────────────── */}
      <div className="px-10 py-8 space-y-4">
        {/* Introduction */}
        <div className="bg-blue-50 border-l-4 border-[#2b6cb0] rounded-r-xl p-5">
          <p className="text-base leading-relaxed text-gray-800">
            <strong>Objet :</strong> Paiement des frais de session — Veuillez scanner le <strong>QR code</strong> ci-dessous
            pour procéder au paiement de votre session d&apos;examen.
          </p>
        </div>

        {r.matieresSummary && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
            <span className="font-semibold text-gray-700">Matières concernées :</span>
            <span>{r.matieresSummary}</span>
          </div>
        )}

        {/* Étapes */}
        <div>
          <h2 className="text-lg font-bold text-[#1a365d] mb-0 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2b6cb0] text-white text-xs font-bold">i</span>
            Procédure à suivre
          </h2>
          <div className="space-y-2">
            {[
              {
                step: 1,
                title: "Scannez le QR code & recherchez votre nom",
                desc: "Une fois le QR code scanné, vous accéderez à la page de paiement. Utilisez la barre de recherche pour trouver votre nom dans la liste.",
              },
              {
                step: 2,
                title: "Renseignez votre téléphone & référence du reçu",
                desc: "Saisissez votre numéro de téléphone ainsi que la référence de votre reçu de paiement pour identification.",
              },
              {
                step: 3,
                title: "Déposez vos preuves & validez le montant",
                desc: "Joignez les preuves de paiement (capture d'écran, scan) et renseignez le montant perçu. L'agent percepteur validera votre paiement.",
              },
              {
                step: 4,
                title: "Rescannez le QR code pour générer votre macaron",
                desc: "Après validation, rescann ez le QR code pour générer et télécharger votre macaron d'examen officiel.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2b6cb0] text-white font-bold text-sm shadow-sm">
                  {step}
                </div>
                <div className="pt-0.5">
                  <p className="font-semibold text-gray-800">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center border-t border-gray-200">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 inline-flex flex-col items-center">
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="H"
              includeMargin
              className="rounded-lg"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 text-center max-w-xs">
            Scannez ce code avec votre téléphone pour accéder à la plateforme de paiement sécurisée.
          </p>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="fixed bottom-0 w-[210mm] bg-gray-50 border-t border-gray-200 px-10 py-4">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>© {new Date().getFullYear()} INBTP — Sections</span>
          <span className="font-mono">{baseUrl}</span>
        </div>
      </div>
    </div>
  );
}