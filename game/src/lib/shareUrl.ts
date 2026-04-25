/**
 * 理想のお店を URL に埋め込んでシェアするためのエンコード/デコード
 *
 * URL 例:
 *   /share?n=ドリームパーク&s=juggler&m=eyJ...
 *
 * - n: 店舗名 (URI encoded)
 * - s: シリーズ ID (任意)
 * - m: 機種マッピング {machineId: count} を JSON → base64
 *
 * GitHub Pages の静的サイトでも動くよう、サーバー無しで成立する設計。
 */

export interface SharedShop {
  name: string;
  seriesId: string | null;
  entries: Record<string, number>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(b64: string): Uint8Array {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const padded = norm + "=".repeat(pad);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 店舗データを URL クエリ文字列にエンコード */
export function encodeShop(shop: SharedShop): string {
  const json = JSON.stringify(shop.entries);
  const bytes = new TextEncoder().encode(json);
  const m = bytesToBase64(bytes);
  const params = new URLSearchParams();
  params.set("n", shop.name);
  if (shop.seriesId) params.set("s", shop.seriesId);
  params.set("m", m);
  return params.toString();
}

/** URL クエリ文字列から店舗データを復元 */
export function decodeShop(query: string): SharedShop | null {
  try {
    const params = new URLSearchParams(query);
    const name = params.get("n") ?? "";
    const seriesId = params.get("s");
    const m = params.get("m");
    if (!m) return null;
    const json = new TextDecoder().decode(base64ToBytes(m));
    const entries = JSON.parse(json) as Record<string, number>;
    return { name, seriesId, entries };
  } catch {
    return null;
  }
}

/** 現在のサイトの絶対 URL でシェア用フル URL を組み立てる */
export function buildShareUrl(shop: SharedShop): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const query = encodeShop(shop);
  // BrowserRouter の basename と整合する形で
  return `${base}share?${query}`.replace(/([^:])\/\//g, "$1/");
}
