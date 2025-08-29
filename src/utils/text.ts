export function normalizeText(s: string) {
  // remove acentos de forma ampla
  return s.normalize('NFKD').replace(/\p{M}/gu, '');
}
