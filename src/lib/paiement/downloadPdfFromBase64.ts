/**
 * Déclenche le téléchargement d’un PDF à partir d’une chaîne base64 (retour typique d’une Server Action).
 */
export function downloadPdfFromBase64(pdfBase64: string, filename: string): void {
  const bin = atob(pdfBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const name = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
