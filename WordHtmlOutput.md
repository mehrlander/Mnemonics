CORS + "What did we get?"
Shows headers, bytes, schema, top words, sample lookups, and POS tag inventory.
Run
Sample word lookups (freq sources)
word
SUBTLEX
wordfreq-25k
google-10k
FreqWords
word_freq_32k
you
2,134,713 count
-4.63 log10
15 rank
28,787,591 count
68,408,394 count
the
1,501,908 count
-2.83 log10
1 rank
22,761,659 count
936,350,691 count
and
682,780 count
-3.66 log10
3 rank
10,572,938 count
524,890,456 count
zebra
128 count
-12.94 log10
— rank
1,752 count
36,160 count
budget
513 count
-9.62 log10
1,383 rank
9,026 count
1,807,064 count
wring
62 count
— log10
— rank
874 count
— count
fetch-json
per-million freq (Google Books Ngrams)
array of {word, score, tags[], defs[]}
defs: 7, API: no key, 100k/day

tags: query, n, v, f:295.866105
      
top
"example" → POS: n, freq: 295.866105/M
sample
tags: query, n, v, f:295.866105
extra
n Something that is representative of all such things in a group.
fetch-json
per-million (realtime API)
single word lookup
Note: API calls per lookup, slower

Full tags: query, n, adj, v, f:29.505647
      
top
"budget" → POS: n,adj,v, freq: 29.505647
sample
Full tags: query, n, adj, v, f:29.505647
fetch-json
raw subtitle count (SUBTLEXus-style)
array(74,286) of {word, count}
sorted_desc=true

you:2134713 · the:1501908 · and:682780 · zebra:128 · budget:513 · wring:62
      
top
you 2134713 · I 2038529 · the 1501908 · to 1156570 · s 1057301
sample
you:2134713 · the:1501908 · and:682780 · zebra:128 · budget:513 · wring:62
fetch-json
log10 frequency score (wordfreq-derived)
array(25,000) of [word, score]
score_range≈[-9.85, -2.83]
sorted_desc=true · lin("the")≈1.47e-3

you:-4.63 · the:-2.83 · and:-3.66 · zebra:-12.94 · budget:-9.62 · wring:—
      
top
the -2.83 · of -3.57 · to -3.59 · and -3.66 · a -3.78
sample
you:-4.63 · the:-2.83 · and:-3.66 · zebra:-12.94 · budget:-9.62 · wring:—
fetch-text
rank (1=most common, from Google Trillion Word)
text lines=10,000, one word per line
no counts, just rank order

you:#15 · the:#1 · and:#3 · zebra:#— · budget:#1383 · wring:#—
      
top
the, of, and, to, a, in, for, is
sample
you:#15 · the:#1 · and:#3 · zebra:#— · budget:#1383 · wring:#—
fetch-text
raw count (OpenSubtitles-derived)
text lines=50,000 "word count"
sorted_desc=true

you:28,787,591 · the:22,761,659 · and:10,572,938 · zebra:1,752 · budget:9,026 · wring:874
      
top
you 28787591 · i 27086011 · the 22761659 · to 17099834 · a 14484562
sample
you:28,787,591 · the:22,761,659 · and:10,572,938 · zebra:1,752 · budget:9,026 · wring:874
fetch-json
boolean (word exists)
object keys=370,100 → {word: 1}
validation only, no frequency

you:✓ · the:✓ · and:✓ · zebra:✓ · budget:✓ · wring:✓
      
top
a, aa, aaa, aah, aahed, aahing, aahs, aal
sample
you:✓ · the:✓ · and:✓ · zebra:✓ · budget:✓ · wring:✓
extra
Last 5: zwinglianism, zwinglianist, zwitter, zwitterion, zwitterionic
fetch-json
dictionary entry (POS, defs, synonyms)
object keys=113,376 → {word, pos, definitions[], synonyms}
~4% have synonyms (sampled 5k)

you:— · the:— · and:— · zebra:— · budget:— · wring:—
      
top
POS tags found: n., prep., a., v., adv., p., interj., conj., pron.
sample
you:— · the:— · and:— · zebra:— · budget:— · wring:—
extra
Sample def: "Abdicating; renouncing; -- followed by of. Monks abdicant of…"
fetch-json
raw count (large corpus)
object keys=32,641 word→count
very large magnitudes

you:68,408,394 · the:936,350,691 · and:524,890,456 · zebra:36,160 · budget:1,807,064 · wring:—
      
top
the 936,350,691 · and 524,890,456 · of 486,715,646 · to 428,396,439 · a 329,062,259
sample
you:68,408,394 · the:936,350,691 · and:524,890,456 · zebra:36,160 · budget:1,807,064 · wring:—
import
token tags (compromise tagset)
terms=9 (json terms)
unique_tags=0

The/— quick/— brown/— fox/— jumps/— over/— 13/— lazy/—
      
top
The · quick · brown · fox · jumps · over · 13 · lazy
sample
The/— quick/— brown/— fox/— jumps/— over/— 13/— lazy/—
extra
tags:
import
Penn Treebank POS tags
tokens=10 {value, pos}
tags: ., CD, DT, IN, JJ, NN, NNS

The/DT quick/JJ brown/JJ fox/NN jumps/NNS over/IN 13/CD lazy/NN dogs/NNS ./.
      
top
The/DT quick/JJ brown/JJ fox/NN jumps/NNS over/IN 13/CD lazy/NN
sample
The/DT quick/JJ brown/JJ fox/NN jumps/NNS over/IN 13/CD lazy/NN dogs/NNS ./.
