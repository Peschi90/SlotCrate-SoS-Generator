/**
 * Serverseitiger Fetcher zur CAD-API. Läuft ausschließlich in
 * Server-Components und Route-Handlern, damit der interne Bearer-Token
 * niemals im Browser landet.
 */
import { headers } from "next/headers";
import { BoxRequest, LayoutRequest } from "./schema";

const API_URL = process.env.CAD_API_URL ?? "http://127.0.0.1:6294";
const TOKEN = process.env.CAD_API_INTERNAL_TOKEN;

function authHeaders(): HeadersInit {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

export interface ActiveSettings {
  geometryVersion: string;
  settingsVersion: number;
  grid: { columns: number; rows: number; pitch: number };
  box: {
    defaultHeightMm: number;
    wallThicknessMm: number;
    floorThicknessMm: number;
    pickupTopZMm: number;
  };
  limits: {
    minCells: number;
    maxCells: number;
    minHeightMm: number;
    maxHeightMm: number;
  };
  filenamePrefix: string;
}

export async function fetchActiveSettings(): Promise<ActiveSettings> {
  // Vermeidet Warnung "headers() not called" bei Next-14 App-Router-Nutzung.
  void headers();
  const res = await fetch(`${API_URL}/v1/settings/active`, {
    headers: authHeaders(),
    next: { revalidate: 30 }
  });
  if (!res.ok) throw new Error(`settings/active failed: ${res.status}`);
  return (await res.json()) as ActiveSettings;
}

export async function requestBoxStl(payload: BoxRequest, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_URL}/v1/box/stl`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok) throw new Error(`box/stl failed: ${res.status}`);
  return await res.blob();
}

export async function requestLayoutZip(payload: LayoutRequest, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${API_URL}/v1/layout/zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok) throw new Error(`layout/zip failed: ${res.status}`);
  return await res.blob();
}
