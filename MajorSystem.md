# Major System Studio

`MajorSystem.html` is a self-contained web app that turns numbers into memorable words using
the [Major System](https://en.wikipedia.org/wiki/Mnemonic_major_system) — the classic mnemonic
technique where each digit maps to a consonant *sound*, and vowels are free filler.

Open `MajorSystem.html` in any browser (double-click works; no server, no build, no network
needed — the dataset ships alongside it in `MajorSystemData.js`).

## What it does

| Tab | What you get |
|---|---|
| **Encode** | Type any number → the best word sequences that phonetically spell it, found by a k-best dynamic-programming segmentation. Click any word chip to swap in alternatives. Presets for 20 digits of π, e, √2. **Practice recall** hides the number and checks you can reproduce it from the words (telling you exactly where you diverged). A reverse box decodes words back to digits. |
| **Peg list** | A ranked 0–9 / 00–99 peg list — the best mnemonic word for every number. Click a cell to pick from ~60 alternates (choices persist in localStorage). Copy or print your list. |
| **Train** | Leitner-box flashcards on your peg list, in both directions: *number → word* (recall a peg; any dictionary word that encodes the number counts) and *word → number* (decode a word's sounds back to digits). Your peg and alternates are revealed after each answer. Progress persists locally. |
| **Reference** | The digit→sound table with memory hooks, and dataset provenance. |

## Why the words are good

This is the follow-through on the word-API research in `WordApis.html`: instead of guessing
which words make good mnemonics, every candidate is scored with real linguistic data.

The dataset (38,269 words) joins four public sources:

- **CMU Pronouncing Dictionary** — ARPABET phonemes, so encoding is *phonetic*, not
  orthographic: `knife` = 28 (n·f), `thumb` = 13 (th·m), `bomb` = 93 (b·m).
- **SUBTLEX-US** — word frequency from 51M tokens of film subtitles, converted to the
  Zipf scale (how *familiar* a word is).
- **Brysbaert, Warriner & Kuperman (2014)** concreteness norms (1–5) plus dominant part
  of speech (how *imageable* a word is — concrete nouns make the strongest mental images).
- **google-10000-english** and **dwyl/english-words** as sanity filters.

Ranking blends `0.45·frequency + 0.45·concreteness + noun bonus`, with penalties for proper
names, unknown POS, and very long words. Number words (`five` encodes 88!) are excluded from
suggestions as hopelessly confusing — including inflected forms like `millions` — though the
decoder still understands them. Alternate CMU pronunciations are preserved (561 words), so
the trainer accepts both `82` and `812` readings of “often”.

### Digit → sound mapping (classic)

| Digit | Sounds | Digit | Sounds |
|---|---|---|---|
| 0 | s, z | 5 | l |
| 1 | t, d, th | 6 | ch, j, sh, zh |
| 2 | n | 7 | k, hard g, ng |
| 3 | m | 8 | f, v |
| 4 | r | 9 | p, b |

Vowels and w, h, y carry no digit.

## Rebuilding the dataset

```sh
cd tools
npm install cmu-pronouncing-dictionary subtlex-word-frequencies
# download into the same directory:
#   concreteness.txt  — Brysbaert et al. norms (tab-separated)
#   google10k.txt     — google-10000-english word list
#   dwyl.json         — dwyl/english-words words_dictionary.json
node build-major-data.mjs   # writes MajorSystemData.js
```

The build prints coverage diagnostics (every 2-digit number has candidates; 824/1000
3-digit numbers do) and spot-checks classic pegs (`tie`=1, `moon`=32, `rock`=47, …).
