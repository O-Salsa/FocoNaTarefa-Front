// util simples para ler exp do JWT sem validar assinatura
export function parseJwt(token: string): any | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  const data = parseJwt(token);
  if (!data?.exp) return false; // se não tiver exp, trate como não expirado
  const nowSec = Math.floor(Date.now() / 1000);
  // margem de segurança de 30s contra “clock skew”
  return data.exp < (nowSec + 30);
}
