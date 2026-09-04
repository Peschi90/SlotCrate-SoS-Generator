"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    void loadCsrfToken();
  }, []);

  async function loadCsrfToken(): Promise<string> {
    const res = await fetch("/api/auth/csrf", { method: "GET" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { csrfToken?: string };
    if (!data.csrfToken) throw new Error("missing csrf token");
    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = csrfToken ?? (await loadCsrfToken());
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, csrfToken: token })
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `status ${res.status}`);
      router.replace("/admin");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 p-6 border border-neutral-800 rounded-md">
      <h1 className="text-lg font-semibold">{t("login.title")}</h1>
      <div>
        <label className="block text-sm mb-1" htmlFor="email">
          {t("login.email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="password">
          {t("login.password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        />
      </div>
      {error && (
        <div role="alert" className="text-sm text-red-400">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full px-4 py-2 rounded bg-crate-box hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "…" : t("login.submit")}
      </button>
    </form>
  );
}
