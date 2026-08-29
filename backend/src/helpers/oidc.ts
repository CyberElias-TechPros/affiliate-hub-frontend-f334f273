// Minimal OIDC helpers: RS256 id_token verification against a provider JWKS.
// No external dependencies — uses WebCrypto + fetch.

interface JwtHeader { alg: string; kid?: string; typ?: string }
export interface OIDCPayload { sub?: string; email?: string; email_verified?: boolean; name?: string; exp?: number; iss?: string; aud?: string | string[] }

interface JwksKey {
  kty: string;
  kid: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  x5c?: string[];
}

const jwksCache = new Map<string, { keys: JwksKey[]; expiresAt: number }>();

async function fetchJwks(url: string): Promise<JwksKey[]> {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const res = await fetch(url, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys: JwksKey[] };
  jwksCache.set(url, { keys: body.keys || [], expiresAt: Date.now() + 60 * 60 * 1000 });
  return body.keys || [];
}

function decodePart(part: string): Record<string, unknown> {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function verifyRs256(
  token: string,
  jwksUrl: string,
  opts: { issuer?: string[]; audience: string }
): Promise<OIDCPayload> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('Malformed id_token');
  const header = decodePart(h) as unknown as JwtHeader;
  const payload = decodePart(p) as unknown as OIDCPayload;
  if (!header.kid) throw new Error('id_token missing kid');
  if (!payload.sub) throw new Error('id_token missing subject');
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('id_token expired');
  if (opts.issuer && !opts.issuer.includes(payload.iss || '')) throw new Error('id_token issuer mismatch');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(opts.audience)) throw new Error('id_token audience mismatch');

  const keys = await fetchJwks(jwksUrl);
  const key = keys.find((k) => k.kid === header.kid && (k.alg === 'RS256' || k.alg === undefined));
  if (!key || key.kty !== 'RSA' || !key.n || !key.e) throw new Error('No matching JWKS key');

  const jwk = {
    kty: 'RSA',
    n: key.n,
    e: key.e,
    alg: 'RS256',
    ext: true,
  };
  const cryptoKey = await crypto.subtle.importKey('jwk', jwk as JsonWebKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);

  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
  if (!valid) throw new Error('id_token signature invalid');
  return payload;
}

export async function verifyGoogleIdToken(idToken: string, audience: string): Promise<OIDCPayload> {
  return verifyRs256(idToken, 'https://www.googleapis.com/oauth2/v3/certs', {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience,
  });
}

export async function verifyAppleIdToken(idToken: string, audience: string): Promise<OIDCPayload> {
  return verifyRs256(idToken, 'https://appleid.apple.com/auth/keys', {
    issuer: ['https://appleid.apple.com'],
    audience,
  });
}

export function decodePayloadUnsafe(token: string): OIDCPayload {
  const p = token.split('.')[1];
  return decodePart(p) as unknown as OIDCPayload;
}

export async function exchangeCodeForToken(params: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  extra?: Record<string, string>;
}): Promise<{ id_token: string; access_token?: string }> {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    ...(params.extra || {}),
  });
  const res = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as { id_token: string; access_token?: string };
}
