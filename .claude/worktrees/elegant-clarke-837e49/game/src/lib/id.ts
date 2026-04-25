export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 短縮ID（店舗共有URL用）: base36で8文字 */
export function shortId(): string {
  const a = Math.random().toString(36).slice(2, 6);
  const b = Math.random().toString(36).slice(2, 6);
  return (a + b).padEnd(8, "0").slice(0, 8);
}

/** 引き継ぎコード: 人が書き写せる長さで */
export function handoverCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 視認性低い0/O/1/Iは除外
  let s = "";
  for (let i = 0; i < 12; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7) s += "-";
  }
  return s;
}
