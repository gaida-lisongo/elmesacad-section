/** Réponses liste / client non privilégié : pas de clés d’API. */
export function sectionWithoutSecrets(s: Record<string, unknown>) {
  const { secretKey: _s, apiKey: _a, ...rest } = s;
  return { ...rest, secretKey: null, apiKey: null };
}
