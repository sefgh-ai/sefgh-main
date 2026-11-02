// P7-02 retired the GitHub handler wrappers. This bounded issuer reader is
// still used by src/lib/supabase/verify-bearer.js for the retained Next routes.
export const IDENTITY_DEADLINE_MS = 4000;

// askIssuer makes one identity call. It answers { status: 200, body } with
// the decoded reply, { status: 401 } when the issuer refused the credential,
// and { status: 503 } when it did not answer as expected. It can also throw,
// for a network failure, a reply over 1 MiB or a reply that is not JSON; the
// caller answers 503 for those.
export async function askIssuer(send, signal, url, headers) {
  const response = await send(url, { headers, signal, cache: 'no-store', redirect: 'error' });
  // Only a plain 200 is an answer. Go applies the same rule.
  if (response.status !== 200) return { status: [401, 403].includes(response.status) ? 401 : 503 };
  // Bound identity responses, including chunked bodies.
  const reader = response.body.getReader();
  const parts = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 1024 * 1024) throw new Error('identity reply too large');
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return { status: 200, body: JSON.parse(new TextDecoder().decode(bytes)) };
}
