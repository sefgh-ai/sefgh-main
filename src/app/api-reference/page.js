import Link from "next/link";
import AppFooter from "@/components/ui/app-footer";

export const metadata = {
  title: "API Reference | SEFGH",
  description: "Personal API keys and public repository search.",
  alternates: { canonical: "https://sefgh.org/api-reference" },
};
const available = process.env.NEXT_PUBLIC_SEFGH_KEYS_V1 === '1';
export default function ApiReferencePage() {
  return <main className="min-h-screen bg-background text-foreground">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <header className="space-y-3"><h1 className="text-3xl font-bold">SEFGH API reference</h1>
        <p className="text-muted-foreground">Personal keys provide read access to public GitHub repository search.</p></header>
      {!available ? <section className="rounded-xl border p-5 space-y-3">
        <h2 className="text-xl font-semibold">The new API is not available yet</h2>
        <p>API key access will be announced when it is ready. Existing playground keys cannot be used with the new API.</p>
      </section> : <>
        <section className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-semibold">Create and protect a key</h2>
          <p><Link className="underline" href="/playground">Open the playground</Link> while signed in to create, list or revoke your keys. Save a new key when it appears: it is shown once and cannot be retrieved later.</p>
          <p>Each key allows public repository search only. It cannot access private repositories, chat or your account data. Keep it on your server, outside source control. Use HTTPS.</p>
          <p>Keys expire and can be revoked. A revoked or expired key no longer works. If you lose a key, revoke it and create a replacement.</p>
        </section>
        <section className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-semibold">GET /api/v1/search</h2>
          <p>Send a repository query in the <code>q</code> parameter and your key in the <code>Authorization: Bearer</code> header. Responses use <code>total_count</code> and <code>items</code>.</p>
          <pre className="whitespace-pre-wrap break-all rounded bg-muted p-4 text-sm"><code>{'curl --get https://sefgh.org/api/v1/search --data-urlencode "q=Go HTTP server" --header "Authorization: Bearer $SEFGH_API_KEY"'}</code></pre>
          <p>The playground can test this endpoint with a pasted key. Tests count toward your quota. Quotas and key availability depend on your account; this page does not promise an unlimited allowance.</p>
          <dl className="space-y-2 text-sm"><div><dt className="font-semibold">401</dt><dd>Check that your API key is complete, active and unexpired.</dd></div><div><dt className="font-semibold">429</dt><dd>Your quota has been reached. Wait before trying again.</dd></div><div><dt className="font-semibold">503 or 404</dt><dd>The key service is unavailable. Creation may be unconfirmed: refresh the metadata list and revoke unexpected keys before trying again.</dd></div></dl>
        </section>
      </>}
      <Link className="inline-block underline" href="/playground">Back to playground</Link>
    </div><AppFooter />
  </main>;
}
