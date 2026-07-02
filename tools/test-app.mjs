// End-to-end Playwright suite for MajorSystem.html (38 checks).
// Usage: npm install playwright && node tools/test-app.mjs
// Env: SHOT_DIR (screenshot dir), CHROMIUM_PATH (browser binary override).
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..', 'MajorSystem.html');
const SHOT = process.env.SHOT_DIR || resolve(HERE, 'shots');
mkdirSync(SHOT, { recursive: true });

// The app frees window.MAJOR_DATA.rows after parsing, so tests read the data
// file from disk to find valid words.
const src = readFileSync(resolve(HERE, '..', 'MajorSystemData.js'), 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('= ') + 2, src.lastIndexOf(';')));
const ROWS = DATA.rows.split('\n').map(r => {
  const [w, d, z, c, p, a] = r.split('|');
  return { w, d, z: +z || 0, c: +c || 0, p: p || '?', a: a ? a.split(',') : null };
});
const wordFor = digits => ROWS.find(r => r.d === digits && !DATA.meta.confusing.includes(r.w))?.w;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};

await page.goto('file://' + APP);
await page.waitForTimeout(600);

// --- load & data ---
const stat = await page.textContent('#data-stat');
check('data loads', /[\d,]+ words loaded/.test(stat), stat);
check('rows freed after parse', await page.evaluate(() => window.MAJOR_DATA.rows === ''));

// --- encode tab: default pi demo ---
const segCount = await page.locator('#enc-out .seg').count();
check('pi demo renders segmentations', segCount >= 3, 'segs=' + segCount);
console.log('  pi best:', (await page.locator('#enc-out .seg').first().innerText()).replace(/\n/g, ' '));

await page.fill('#enc-in', '8675309');
await page.waitForTimeout(200);
console.log('  8675309:', (await page.locator('#enc-out .seg').first().innerText()).replace(/\n/g, ' '));
check('encodes 8675309', (await page.locator('#enc-out .seg').count()) > 0);
const digits = await page.$$eval('#enc-out .seg:first-child .wordchip span', els => els.map(e => e.textContent).join(''));
check('chip digits reassemble input', digits === '8675309', digits);

// swap a chip in row 1, then verify row 2's same-position chip did NOT change (shared-object bug)
const row2Before = await page.locator('#enc-out .seg').nth(1).innerText();
await page.locator('#enc-out .seg:first-child .wordchip').first().click();
check('alt popup opens', await page.locator('.alt-pop').count() === 1);
const row1WordBefore = await page.locator('#enc-out .seg:first-child .wordchip b').first().textContent();
// pick an alternative different from current
const altBtns = page.locator('.alt-pop button');
const altCount1 = await altBtns.count();
let picked = null;
for (let i = 0; i < altCount1; i++) {
  const t = (await altBtns.nth(i).innerText()).split(/\s/)[0];
  if (t !== row1WordBefore) { picked = t; await altBtns.nth(i).click(); break; }
}
await page.waitForTimeout(150);
const row1WordAfter = await page.locator('#enc-out .seg:first-child .wordchip b').first().textContent();
check('chip swap updates row 1', picked && row1WordAfter === picked, `${row1WordBefore}->${row1WordAfter}`);
const row2After = await page.locator('#enc-out .seg').nth(1).innerText();
check('chip swap does not leak into row 2', row2After === row2Before);

// confusing words: 3520 suggestions must not include "millions"
await page.fill('#enc-in', '3520');
await page.waitForTimeout(200);
const sug3520 = await page.$$eval('#enc-out .wordchip b', els => els.map(e => e.textContent));
check('no "millions" for 3520', !sug3520.includes('millions'), sug3520.slice(0, 6).join(','));

// --- decode ---
await page.fill('#dec-in', 'meteor lion bomb xyzzyq');
await page.waitForTimeout(150);
const dec = await page.textContent('#dec-out');
console.log('  decode:', dec.trim());
check('decode meteor=314', dec.includes('314'));
check('decode unknown marked', dec.includes('≈'));

await page.screenshot({ path: SHOT + '/1-encode.png' });

// --- pegs tab ---
await page.click('nav [data-tab=pegs]');
await page.waitForTimeout(400);
check('peg grid 100 cells', await page.locator('.peg-cell').count() === 100);
const empty = await page.$$eval('.peg-cell .word', els => els.filter(e => e.textContent === '—').length);
check('no empty pegs', empty === 0, 'empty=' + empty);
const sample = await page.$$eval('.peg-cell', els => [0, 12, 42, 88, 99].map(i => els[i].innerText.replace(/\s+/g, ':')));
console.log('  sample pegs:', sample.join('  '));

await page.locator('.peg-cell').nth(42).click();
await page.waitForTimeout(200);
check('peg dialog opens', await page.locator('#peg-dialog[open]').count() === 1);
check('dialog has alternates', await page.locator('#dlg-list button').count() > 5);
await page.locator('#dlg-list button').nth(2).click();
await page.waitForTimeout(150);
await page.click('#dlg-close');
check('custom pick highlighted', await page.locator('.peg-cell').nth(42).evaluate(el => el.classList.contains('custom')));
await page.screenshot({ path: SHOT + '/2-pegs.png' });

// --- train tab (number → word) ---
await page.click('nav [data-tab=train]');
await page.waitForTimeout(300);
const num = (await page.textContent('#train-num')).trim();
check('trainer shows a number', /^\d{1,2}$/.test(num), num);
await page.fill('#train-in', wordFor(num));
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('correct answer accepted', await page.locator('#train-fb.good').count() === 1,
  await page.textContent('#train-fb'));
check('session accuracy updates', (await page.textContent('#st-acc')).trim() === '100%');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const num2 = (await page.textContent('#train-num')).trim();
check('enter advances to next card', num2 !== '' && num2 !== num, num2);
await page.fill('#train-in', 'zzzznotaword');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('wrong answer rejected', await page.locator('#train-fb.bad').count() === 1);
check('answer revealed after wrong', (await page.textContent('#train-ans')).trim().length > 0);

// Enter with a focused button must not double-advance (old double-fire bug)
await page.keyboard.press('Enter'); // advance to fresh card
await page.waitForTimeout(150);
const numA = (await page.textContent('#train-num')).trim();
await page.fill('#train-in', 'zzzznotaword');
await page.keyboard.press('Enter'); // grade wrong
await page.waitForTimeout(100);
await page.focus('#train-next');
await page.keyboard.press('Enter'); // button Enter → exactly one advance
await page.waitForTimeout(150);
const numB = (await page.textContent('#train-num')).trim();
check('button Enter advances exactly once', numB !== numA && (await page.textContent('#train-fb')).trim() === '',
  `${numA}->${numB}`);

// number-word answers: accepted but flagged (e.g. "five" encodes 88)
await page.evaluate(() => { document.querySelector('#train-in').focus(); });
await page.screenshot({ path: SHOT + '/3-train.png' });

// --- reverse trainer mode + leading-zero tolerance ---
await page.selectOption('#train-mode', 'w2n');
await page.waitForTimeout(200);
let shownWord = (await page.textContent('#train-num')).trim();
check('w2n shows a word', /^[a-z]+$/.test(shownWord), shownWord);
let wantNum = ROWS.find(r => r.w === shownWord)?.d;
// answer without leading zero when applicable, else exact
await page.fill('#train-in', wantNum.replace(/^0+(?=.)/, ''));
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('w2n accepts unpadded answer', await page.locator('#train-fb.good').count() === 1,
  `word=${shownWord} want=${wantNum} fb=` + await page.textContent('#train-fb'));
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
await page.fill('#train-in', '999999');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('w2n wrong rejected', await page.locator('#train-fb.bad').count() === 1);
// empty Enter must not grade
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
await page.fill('#train-in', '');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('empty enter ignored', (await page.textContent('#train-fb')).trim() === '');

// --- encode presets + practice ---
await page.click('nav [data-tab=encode]');
await page.waitForTimeout(200);
await page.click('.preset'); // pi
await page.waitForTimeout(300);
const piDigits = await page.$$eval('#enc-out .seg:first-child .wordchip span', els => els.map(e => e.textContent).join(''));
check('pi preset encodes fully', piDigits === '31415926535897932384', piDigits);
console.log('  pi-20 best:', (await page.locator('#enc-out .seg').first().innerText()).replace(/\n/g, ' '));

// swap first chip, then practice must use the swapped word
await page.locator('#enc-out .seg:first-child .wordchip').first().click();
await page.waitForTimeout(150);
const altBtns2 = page.locator('.alt-pop button');
const cnt2 = await altBtns2.count();
const cur1 = await page.locator('#enc-out .seg:first-child .wordchip b').first().textContent();
let picked2 = null;
for (let i = 0; i < cnt2; i++) {
  const t = (await altBtns2.nth(i).innerText()).split(/\s/)[0];
  if (t !== cur1) { picked2 = t; await altBtns2.nth(i).click(); break; }
}
await page.waitForTimeout(150);
await page.click('#enc-practice');
await page.waitForTimeout(200);
check('practice panel opens', !(await page.locator('#practice').isHidden()));
const pracText = await page.textContent('#prac-words');
check('practice uses swapped word', picked2 && pracText.includes(picked2), `picked=${picked2} prac=${pracText}`);
await page.fill('#prac-in', '31415926535897932384');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('practice correct', await page.locator('#prac-fb.good').count() === 1);
await page.fill('#prac-in', '31415999');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('practice diverge msg', (await page.textContent('#prac-fb')).includes('digit 7'));

// practice disabled for over-limit input
await page.fill('#enc-in', '1'.repeat(50));
await page.waitForTimeout(200);
check('practice disabled >40 digits', await page.locator('#enc-practice').isDisabled());

// --- reference tab ---
await page.click('nav [data-tab=ref]');
await page.waitForTimeout(200);
check('reference table has 10 rows', await page.locator('#ref-table tr').count() === 10);
await page.screenshot({ path: SHOT + '/4-reference.png' });

// --- persistence + corruption resilience ---
await page.reload();
await page.waitForTimeout(500);
await page.click('nav [data-tab=pegs]');
await page.waitForTimeout(300);
check('custom peg persists after reload', await page.locator('.peg-cell').nth(42).evaluate(el => el.classList.contains('custom')));

// corrupted localStorage must not brick the app
await page.evaluate(() => {
  localStorage.setItem('major.pegPicks.v1', '{bad json');
  localStorage.setItem('major.train.v1', '{"cards":null}');
});
await page.reload();
await page.waitForTimeout(500);
check('app survives corrupted localStorage', /[\d,]+ words loaded/.test(await page.textContent('#data-stat')));
await page.click('nav [data-tab=train]');
await page.waitForTimeout(300);
check('trainer survives corrupted store', /^\d{1,2}$/.test((await page.textContent('#train-num')).trim()));
// box out of range sanitized
await page.evaluate(() => localStorage.setItem('major.train.v1', '{"cards":{"07":{"box":9}}}'));
await page.reload();
await page.waitForTimeout(500);
await page.click('nav [data-tab=train]');
await page.waitForTimeout(300);
check('bad box value sanitized', /^\d+$/.test((await page.textContent('#st-due')).trim()));

console.log(errors.length ? '\nJS ERRORS:\n' + errors.join('\n') : '\nno JS errors');
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
