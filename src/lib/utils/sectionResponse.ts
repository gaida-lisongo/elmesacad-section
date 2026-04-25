export function sectionWithoutSecrets(s: Record<string, unknown>) {
  const { secretKey: _s, ...rest } = s;
  return { ...rest, secretKey: null as null };
}
