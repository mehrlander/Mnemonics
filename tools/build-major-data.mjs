// Build MajorSystemData.js: word → Major System digits + memorability signals.
//
// Sources:
//   - CMU Pronouncing Dictionary (npm cmu-pronouncing-dictionary) — ARPABET phonemes
//   - SUBTLEX-US word frequencies (npm subtlex-word-frequencies) — 51M-token subtitle corpus
//   - Brysbaert, Warriner & Kuperman (2014) concreteness norms (+ dominant POS)
//   - google-10000-english — rank sanity check
//   - dwyl/english-words — real-word filter
import { dictionary } from 'cmu-pronouncing-dictionary';
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';

const require = createRequire(import.meta.url);
const subtlex = require('subtlex-word-frequencies');

// --- Major System phoneme → digit (classic mapping) ---
// 0 s,z | 1 t,d,th | 2 n | 3 m | 4 r | 5 l | 6 ch,j,sh,zh | 7 k,g,(ng) | 8 f,v | 9 p,b
// vowels, w, h, y carry no digit.
const PH2DIG = {
  S: '0', Z: '0',
  T: '1', D: '1', TH: '1', DH: '1',
  N: '2',
  M: '3',
  R: '4', ER: '4',
  L: '5',
  CH: '6', JH: '6', SH: '6', ZH: '6',
  K: '7', G: '7', NG: '7',
  F: '8', V: '8',
  P: '9', B: '9',
};

const toDigits = (pron) => {
  let out = '';
  for (const raw of pron.split(' ')) {
    const ph = raw.replace(/[0-9]/g, '');
    const d = PH2DIG[ph];
    if (d !== undefined) out += d;
  }
  return out;
};

// --- Load signals ---
const SUBTLEX_TOKENS_M = 51; // SUBTLEX-US corpus ≈ 51M tokens
const freq = new Map();
for (const { word, count } of subtlex) {
  const w = word.toLowerCase();
  freq.set(w, (freq.get(w) || 0) + count);
}
const zipfOf = (w) => {
  const c = freq.get(w);
  if (!c) return null;
  // Zipf = log10(freq per billion words)
  return Math.log10((c / SUBTLEX_TOKENS_M) * 1000);
};

const conc = new Map(); // word -> { c: concreteness 1..5, pos }
const POS_MAP = { Noun: 'N', Verb: 'V', Adjective: 'J', Adverb: 'A', Name: 'M' };
{
  const lines = readFileSync('concreteness.txt', 'utf8').trim().split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const f = line.replace(/\r$/, '').split('\t');
    const w = f[0].toLowerCase();
    if (f[1] !== '0') continue; // skip bigrams (two-word entries)
    const c = parseFloat(f[2]);
    const known = parseFloat(f[6]);
    if (!Number.isFinite(c) || !(known >= 0.85)) continue; // NaN known → reject, not accept
    conc.set(w, { c, pos: POS_MAP[f[8]] || '?' });
  }
}

const g10k = new Map();
readFileSync('google10k.txt', 'utf8').trim().split(/\r?\n/).forEach((w, i) => g10k.set(w.toLowerCase(), i + 1));

const dwyl = new Set(Object.keys(JSON.parse(readFileSync('dwyl.json', 'utf8'))).map(w => w.toLowerCase()));

// Alternate pronunciations: the npm package keys variants as "word(1)", "word(2)".
// Collect the digit strings that differ from the primary so the app can accept
// e.g. both 82 and 812 for "often".
const altDigits = new Map();
for (const [key, pron] of Object.entries(dictionary)) {
  const m = key.match(/^([a-z]+)\((\d)\)$/);
  if (!m) continue;
  const d = toDigits(pron);
  if (!d || d.length > 10) continue;
  if (!altDigits.has(m[1])) altDigits.set(m[1], new Set());
  altDigits.get(m[1]).add(d);
}

// --- Build entries ---
const entries = [];
let skippedNonWord = 0, skippedNoDigits = 0, skippedObscure = 0;
for (const [word, pron] of Object.entries(dictionary)) {
  if (!/^[a-z]+$/.test(word)) { skippedNonWord++; continue; } // plain lowercase words only
  if (word.length < 2 || word.length > 14) { skippedNonWord++; continue; }
  const digits = toDigits(pron);
  if (!digits || digits.length > 10) { skippedNoDigits++; continue; }
  const alts = [...(altDigits.get(word) || [])].filter(d => d !== digits);

  const z = zipfOf(word);
  const cc = conc.get(word);
  const rank = g10k.get(word);
  const inDwyl = dwyl.has(word);

  // Keep if the word is plausibly known to a normal person:
  //  - reasonably frequent, OR
  //  - has concreteness norms (i.e., it was normed → real, known word), OR
  //  - in google-10k
  const keep =
    (z !== null && z >= 2.3 && inDwyl) ||
    (cc && (z !== null || inDwyl)) ||
    (rank !== undefined && rank <= 10000 && inDwyl);
  if (!keep) { skippedObscure++; continue; }

  const zipf = z === null ? 0 : Math.round(z * 10) / 10;
  const c = cc ? Math.round(cc.c * 10) / 10 : 0;
  const pos = cc ? cc.pos : '?';
  entries.push({ word, digits, zipf, c, pos, alts });
}

// Order by digits, then zipf desc. Ranking is the app's job (pegScore there is
// the single scoring authority); the file order is only for readability.
entries.sort((a, b) => a.digits === b.digits ? b.zipf - a.zipf : a.digits.localeCompare(b.digits));

console.log(`entries: ${entries.length}`);
console.log(`skipped: nonword=${skippedNonWord} nodigits=${skippedNoDigits} obscure=${skippedObscure}`);
console.log(`entries with alt pronunciations: ${entries.filter(e => e.alts.length).length}`);

// Words the app must never SUGGEST (still fine to decode): number words that
// clash with the digits they name, and profanity. Shipped in meta so the app
// and this check share one list. The app additionally blocks plural/inflected
// forms of these via suffix stripping.
const CONFUSING = [
  'one','two','three','four','five','six','seven','eight','nine','ten','zero',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen',
  'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety',
  'hundred','thousand','million','billion','trillion',
  'shit','fuck','fucker','fucking','cunt','nigger','faggot','bitch','asshole','dick','pussy',
];
const confusingSet = new Set(CONFUSING);
const suggestible = (e) =>
  !confusingSet.has(e.word) &&
  !confusingSet.has(e.word.replace(/s$/, '')) &&
  !confusingSet.has(e.word.replace(/es$/, ''));

// Coverage check: every 1- and 2-digit number needs suggestible candidates,
// or pegs/trainer break. Fail the build loudly if not.
const byDigits = new Map();
for (const e of entries) {
  if (!byDigits.has(e.digits)) byDigits.set(e.digits, []);
  byDigits.get(e.digits).push(e);
}
let missing = [], thin2 = [];
for (const len of [1, 2]) {
  for (let i = 0; i < 10 ** len; i++) {
    const k = String(i).padStart(len, '0');
    const n = (byDigits.get(k) || []).filter(suggestible).length;
    if (n === 0) missing.push(k);
    else if (len === 2 && n < 5) thin2.push(`${k}(${n})`);
  }
}
if (missing.length) {
  console.error(`FATAL: no suggestible candidates for: ${missing.join(',')}`);
  process.exitCode = 1;
}
console.log('1+2-digit coverage: missing =', missing.length ? missing.join(',') : 'none');
console.log('2-digit thin (<5):', thin2.length ? thin2.join(' ') : 'none');
let missing3 = 0;
for (let i = 0; i < 1000; i++) {
  const k = String(i).padStart(3, '0');
  if (!byDigits.has(k)) missing3++;
}
console.log(`3-digit coverage: ${1000 - missing3}/1000`);

// Spot-check famous pegs
for (const w of ['tie', 'noah', 'ma', 'rye', 'law', 'shoe', 'cow', 'ivy', 'bee', 'sea', 'dice', 'tack', 'moon', 'rock', 'lily', 'judge', 'coffee', 'puppy']) {
  const e = entries.find(x => x.word === w);
  console.log(`  ${w}: ${e ? e.digits + ' z' + e.zipf + ' c' + e.c + ' ' + e.pos : 'MISSING'}`);
}

// --- Emit compact data file ---
const rows = entries.map(e => [
  e.word, e.digits, e.zipf || '', e.c || '', e.pos === '?' ? '' : e.pos, e.alts.join(','),
].join('|'));
const payload = {
  meta: {
    words: entries.length,
    sources: 'CMUdict (phonemes) · SUBTLEX-US (Zipf frequency) · Brysbaert et al. 2014 (concreteness, POS) · google-10k · dwyl/english-words',
    mapping: '0=s,z 1=t,d,th 2=n 3=m 4=r 5=l 6=ch,j,sh 7=k,g,ng 8=f,v 9=p,b',
    fields: 'word|digits|zipf|concreteness|pos(N,V,J,A,M)|altDigits(comma-sep)',
    confusing: CONFUSING,
  },
  rows: rows.join('\n'),
};
const js = '// Generated by tools/build-major-data.mjs — do not edit by hand.\n' +
  '// word|digits|zipf|concreteness|pos|altDigits, one per line in .rows\n' +
  'window.MAJOR_DATA = ' + JSON.stringify(payload) + ';\n';
writeFileSync('MajorSystemData.js', js);
console.log(`wrote MajorSystemData.js (${(js.length / 1024).toFixed(0)} KB)`);
