"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createKeysClient } from "@/lib/playground/keys-client.mjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// A fresh owner/tab instance owns all sensitive state. No storage, toast,
// console logging or cross-view cache receives a credential.
function useLifetime() {
  const alive = useRef(false), controller = useRef(null), locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    return () => { alive.current = false; controller.current.abort(); };
  }, []);
  return { alive, controller, locked };
}

function KeysView({ owner, client }) {
  const [rows, setRows] = useState(null), [name, setName] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false), [secret, setSecret] = useState(null);
  const [revoke, setRevoke] = useState(null), [copyMessage, setCopyMessage] = useState("");
  const lifetime = useLifetime(), revealVersion = useRef(0), nameInput = useRef(null), refreshButton = useRef(null), revokeButton = useRef(null);
  const { alive, controller, locked } = lifetime;
  function dismiss() { revealVersion.current++; setSecret(null); setCopyMessage(""); }
  async function perform(action) {
    if (locked.current || !alive.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try { await action(controller.current.signal); }
    catch (error) { if (alive.current) setMessage(error.message); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  useEffect(() => {
    let current = true;
    locked.current = true;
    client.list(owner, controller.current.signal).then(result => { if (current) setRows(result); }, error => { if (current) setMessage(error.message); }).finally(() => { if (current) locked.current = false; });
    return () => { current = false; };
  }, [client, owner, controller, locked]);
  async function refresh() {
    dismiss();
    await perform(async signal => {
      const result = await client.list(owner, signal);
      if (alive.current) { setRows(result); setUncertain(false); }
    });
  }
  async function issue(event) {
    event.preventDefault();
    if (uncertain || rows === null) return;
    await perform(async signal => {
      try {
        const result = await client.issue(owner, name, signal);
        if (alive.current) {
          setRows(previous => [result.key, ...previous.filter(row => row.id !== result.key.id)]);
          setName(""); setCopyMessage(""); setSecret(result.secret);
        }
      } catch (error) { if (alive.current && error.code === 'ambiguous') setUncertain(true); throw error; }
    });
  }
  async function copy() {
    const version = revealVersion.current;
    setCopyMessage("");
    try {
      await navigator.clipboard.writeText(secret);
      if (alive.current && revealVersion.current === version) setCopyMessage("Copied. Store it somewhere safe.");
    } catch {
      if (alive.current && revealVersion.current === version) setCopyMessage("Copy failed. Select and copy the key manually.");
    }
  }
  return <section aria-labelledby="v1-keys-heading" className="space-y-5 min-w-0">
    <div><h2 id="v1-keys-heading" className="text-xl font-semibold">Your API keys</h2>
      <p className="text-sm text-muted-foreground">Keys allow public repository search. Each new secret is shown once. Your key list never reveals it again.</p></div>
    <form onSubmit={issue} className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1 min-w-0"><label htmlFor="v1-key-name" className="block text-sm mb-2">Key name</label>
        <Input ref={nameInput} id="v1-key-name" value={name} onChange={event => setName(event.target.value)} required maxLength={200} autoComplete="off" placeholder="Personal project" /></div>
      <Button type="submit" disabled={busy || rows === null || uncertain || !name.trim()}>Create key</Button>
      <Button ref={refreshButton} type="button" variant="outline" onClick={refresh} disabled={busy}>Refresh key list</Button>
    </form>
    <p role="status" aria-live="polite" className="text-sm break-words">{message || (busy ? "Working…" : rows === null ? "Loading key metadata…" : "")}</p>
    {rows?.length === 0 && <p>No keys yet.</p>}
    <ul className="space-y-3">{rows?.map(row => {
      const status = row.revoked_at ? 'Revoked' : Date.parse(row.expires_at) <= Date.now() ? 'Expired' : 'Active';
      return <li key={row.id} className="rounded-lg border p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0 space-y-1"><h3 className="font-medium break-all">{row.name}</h3>
          <code className="text-xs break-all">{row.prefix}…</code>
          <p className="text-sm text-muted-foreground">{status} · Expires {new Date(row.expires_at).toLocaleDateString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">Public repositories only</p></div>
        <Button variant="outline" disabled={busy || status !== 'Active'} aria-label={`Revoke ${row.name}`} onClick={event => { revokeButton.current = event.currentTarget; setMessage(""); setRevoke(row); }}>Revoke</Button>
      </li>;
    })}</ul>
    <Dialog open={secret !== null} onOpenChange={open => { if (!open) dismiss(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); nameInput.current?.focus(); }}>
        <DialogTitle>Save your new key</DialogTitle>
        <DialogDescription>Copy this key now. After you close this dialog, it cannot be displayed again. If you lose it, revoke it and create a replacement.</DialogDescription>
        {secret && <code aria-label="New API key" className="block select-all break-all rounded border p-3 text-sm">{secret}</code>}
        <Button type="button" onClick={copy}>Copy key</Button>
        <p role="status" className="text-sm">{copyMessage}</p>
        <Button type="button" variant="outline" onClick={dismiss}>I saved my key</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={revoke !== null} onOpenChange={open => { if (!open && !busy) setRevoke(null); }}>
      <DialogContent className="w-[calc(100%-2rem)]" onCloseAutoFocus={event => { event.preventDefault(); (revokeButton.current?.disabled ? refreshButton.current : revokeButton.current)?.focus(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogTitle>Revoke this key?</DialogTitle>
        <DialogDescription>This stops future requests with this key. Revocation cannot be undone.</DialogDescription>
        <p className="break-all">{revoke?.name}</p>
        <p role="status" aria-live="polite">{busy ? 'Revoking…' : message}</p>
        <Button disabled={busy} onClick={() => perform(async signal => {
          await client.revoke(owner, revoke.id, signal);
          if (alive.current) { setRows(previous => previous.map(row => row.id === revoke.id ? {...row, revoked_at:new Date().toISOString()} : row)); setRevoke(null); setMessage("Key revoked."); }
        })}>Confirm revocation</Button>
        <Button disabled={busy} variant="outline" onClick={() => setRevoke(null)}>Cancel</Button>
      </DialogContent>
    </Dialog>
  </section>;
}

function TestView({ owner, client }) {
  const [key, setKey] = useState(""), [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [result, setResult] = useState(null);
  const { alive, controller, locked } = useLifetime();
  const revision = useRef(0), searchAbort = useRef(null);
  function change(setValue, value) {
    revision.current++; searchAbort.current?.abort(); locked.current = false;
    setValue(value); setResult(null); setMessage(""); setBusy(false);
  }
  async function search(event) {
    event.preventDefault(); if (locked.current) return;
    const version = ++revision.current;
    searchAbort.current = new AbortController();
    const signal = AbortSignal.any([controller.current.signal, searchAbort.current.signal]);
    locked.current = true; setBusy(true); setResult(null); setMessage("");
    try { const value = await client.search(owner, key, query, signal); if (alive.current && revision.current === version) setResult(value); }
    catch (error) { if (alive.current && revision.current === version) setMessage(error.message); }
    finally { if (alive.current && revision.current === version) { locked.current = false; setBusy(false); } }
  }
  return <section aria-labelledby="v1-test-heading" className="space-y-4">
    <h2 id="v1-test-heading" className="text-xl font-semibold">Test public search</h2>
    <p className="text-sm text-muted-foreground">Paste a key you saved. A test counts toward its API quota. The key is cleared when you leave this view.</p>
    <form onSubmit={search} className="space-y-3">
      <label htmlFor="v1-test-key" className="block text-sm">API key</label>
      <Input id="v1-test-key" type="password" autoComplete="off" spellCheck={false} value={key} onChange={event => change(setKey,event.target.value)} required />
      <label htmlFor="v1-test-query" className="block text-sm">Repository search query</label>
      <Input id="v1-test-query" value={query} onChange={event => change(setQuery,event.target.value)} maxLength={500} required placeholder="Go HTTP server" />
      <div className="flex flex-wrap gap-3"><Button disabled={busy || !key || !query.trim()}>Run public search</Button>
        <Button type="button" variant="outline" onClick={() => change(setKey,"")}>Clear key and result</Button></div>
    </form>
    <p role="status">{message || (busy ? "Searching…" : result ? `${result.total} repositories found.` : "")}</p>
    {result && <ul className="space-y-2">{result.repositories.map((name,index) => <li key={`${index}:${name}`} className="break-all">{name}</li>)}</ul>}
  </section>;
}

export default function V1Playground({ userId }) {
  const [tab, setTab] = useState('keys');
  const client = useMemo(() => { const supabase = createClient(); return createKeysClient({getSession:() => supabase.auth.getSession()}); }, []);
  return <div className="space-y-6 min-w-0" data-key-mode="v1">
    <div className="flex flex-wrap gap-2" aria-label="Playground views">
      <Button type="button" variant={tab === 'keys' ? 'default' : 'outline'} aria-pressed={tab === 'keys'} onClick={() => setTab('keys')}>API keys</Button>
      <Button type="button" variant={tab === 'test' ? 'default' : 'outline'} aria-pressed={tab === 'test'} onClick={() => setTab('test')}>Test public search</Button>
      <Button asChild variant="outline"><Link href="/api-reference">API reference</Link></Button>
    </div>
    {tab === 'keys' ? <KeysView key={`${userId}:keys`} owner={userId} client={client} /> : <TestView key={`${userId}:test`} owner={userId} client={client} />}
  </div>;
}
