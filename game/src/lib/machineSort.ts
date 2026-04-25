/**
 * 機種を 50 音・年代 で分類するユーティリティ
 *
 * - 機種名の頭にある型式プレフィックス (P / L / Ｐ / Ｌ / CR / スマスロ / 新台 等) を除去
 * - 残った先頭文字を 50 音グループ (あ行〜わ行 / 英字 / 数字 / 記号) に分類
 * - 年代は releaseYear を 5 つのバケツ (新世代から旧へ) に
 */

const PREFIX_PATTERNS: RegExp[] = [
  // 半角・全角プレフィックス
  /^[Ｐｐ]\s*[\u30FB\s]?\s*/, // P / Ｐ
  /^[Ｌｌ]\s*[\u30FB\s]?\s*/, // L / Ｌ
  /^P\s+/i,
  /^L\s+/i,
  /^CR\s*/i,
  /^ＣＲ\s*/,
  // 機種カテゴリ
  /^スマスロ\s*/,
  /^スマパチ\s*/,
  /^パチスロ\s*/,
  /^パチンコ\s*/,
  /^新台\s*/,
  // 装飾
  /^[「『【]+/,
];

/** 機種名の頭にあるプレフィックス類を剥がす */
export function stripPrefix(name: string): string {
  let s = name;
  // 反復して全部剥がす
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const p of PREFIX_PATTERNS) {
      if (p.test(s)) {
        s = s.replace(p, "");
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s.trim();
}

// 50 音インデックス
const KANA_GROUPS: Array<{ key: string; label: string; chars: string }> = [
  { key: "a", label: "あ", chars: "あいうえおぁぃぅぇぉアイウエオァィゥェォ" },
  { key: "ka", label: "か", chars: "かきくけこがぎぐげごカキクケコガギグゲゴ" },
  { key: "sa", label: "さ", chars: "さしすせそざじずぜぞサシスセソザジズゼゾ" },
  { key: "ta", label: "た", chars: "たちつてとだぢづでどっタチツテトダヂヅデドッ" },
  { key: "na", label: "な", chars: "なにぬねのナニヌネノ" },
  { key: "ha", label: "は", chars: "はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ" },
  { key: "ma", label: "ま", chars: "まみむめもマミムメモ" },
  { key: "ya", label: "や", chars: "やゆよゃゅょヤユヨャュョ" },
  { key: "ra", label: "ら", chars: "らりるれろラリルレロ" },
  { key: "wa", label: "わ", chars: "わをんワヲンー" },
];

/** 文字列の最初の (プレフィックス剥がした後の) 文字から、50音グループキーを返す。漢字・英数字は別枠。 */
export function getKanaKey(name: string): string {
  const core = stripPrefix(name);
  const ch = core.charAt(0);
  if (!ch) return "other";
  // 数字
  if (/[0-9０-９]/.test(ch)) return "num";
  // 英字
  if (/[A-Za-zＡ-Ｚａ-ｚ]/.test(ch)) return "alpha";
  for (const g of KANA_GROUPS) {
    if (g.chars.includes(ch)) return g.key;
  }
  // 漢字 (CJK Unified)
  if (/[\u4e00-\u9fff]/.test(ch)) return "kanji";
  return "other";
}

export interface KanaFilterOption {
  key: string;
  label: string;
}

export const KANA_FILTERS: KanaFilterOption[] = [
  ...KANA_GROUPS.map(({ key, label }) => ({ key, label })),
  { key: "alpha", label: "A-Z" },
  { key: "num", label: "0-9" },
  { key: "kanji", label: "漢" },
  { key: "other", label: "他" },
];

// ============================================================
// 年代バケツ
// ============================================================

export interface YearBucket {
  key: string;
  label: string;
  /** 含まれる年の判定 (true なら該当) */
  test: (year: number) => boolean;
}

/** 直近 5 年は単独、それ以降はまとめる */
export const YEAR_BUCKETS: YearBucket[] = (() => {
  const thisYear = new Date().getFullYear();
  const recent: YearBucket[] = [];
  for (let y = thisYear; y >= thisYear - 4; y--) {
    recent.push({
      key: String(y),
      label: String(y),
      test: (yr) => yr === y,
    });
  }
  recent.push({
    key: "older",
    label: `${thisYear - 5}以前`,
    test: (yr) => yr < thisYear - 4,
  });
  return recent;
})();
