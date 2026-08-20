# A History and Algorithmic Deep-Dive of Tokenization

> Educational research note for the "第一课 — Tokenizer" module.
> Focus: the *actual algorithms*, described step-by-step so they could be reimplemented, plus rigorous citations.
> Every algorithm below is written so you can code it from this document alone.

---

## 0. Orientation: what problem is tokenization solving?

A neural language model operates on a **finite vocabulary** of discrete symbols, each mapped to an embedding vector. Text, however, is an **open vocabulary** — new words appear constantly (names, typos, compounds, code, emoji, other languages). Tokenization is the bridge: it converts a raw character/byte stream into a sequence of integer IDs drawn from a fixed vocabulary.

The central design tension, which every method below is a different answer to:

- **Vocabulary size** (embedding table size, softmax cost) — want it *small*.
- **Sequence length** (compute is roughly quadratic in length for attention) — want tokens *long*, i.e. few tokens per sentence.
- **Coverage / no out-of-vocabulary (OOV)** — want *every* possible input representable.
- **Semantic usefulness** — want tokens to align with meaningful units (morphemes, words).

Word-level maximizes semantics but breaks coverage and vocab size. Character-level maximizes coverage with a tiny vocab but destroys semantics and explodes sequence length. **Subword** methods (BPE, WordPiece, Unigram) are the negotiated middle, and are what essentially all modern LLMs use.

---

## 1. Word-level tokenization (pre-2015 NMT / word2vec era)

### Core idea
Split text on whitespace and punctuation; treat each distinct surface word as one atomic token. This was the default for `word2vec` (Mikolov et al. 2013), GloVe, and the first wave of sequence-to-sequence NMT (Sutskever et al. 2014; Bahdanau et al. 2015).

### How the vocabulary was built (training procedure)
1. **Pre-tokenize / segment** the corpus into words. For English: a regex or rule-based tokenizer (e.g. Moses `tokenizer.perl`, Penn Treebank tokenizer) that splits on whitespace and peels off punctuation (`don't` → `do n't`, `end.` → `end .`). For Chinese/Japanese/Thai (no whitespace) you needed a *separate* word-segmenter (e.g. Jieba, MeCab, KyTea) as a preprocessing stage.
2. **Count** the frequency of every distinct word type across the corpus.
3. **Truncate** the vocabulary to the top-*V* most frequent types (typical NMT: V = 30k–80k; some systems up to 500k). Everything else is mapped to a single special token **`<UNK>`**. Add specials: `<UNK>`, `<PAD>`, `<BOS>`/`<EOS>`.
4. Assign each kept word an integer ID → build the embedding matrix of shape `V × d`.

### Inference procedure
Run the *same* pre-tokenizer, then look each word up in the vocab dictionary; any word not in the table becomes `<UNK>`. To detokenize, join with spaces and apply de-tokenization rules to fix punctuation spacing.

### Why it failed for open vocabulary (the three linked problems)
- **OOV / `<UNK>` collapse.** Any unseen word — a name, a number, a rare inflection, a typo, a URL — becomes a single meaningless `<UNK>`. The model can neither read nor generate it. In NMT this is catastrophic: `<UNK>` in the source can't be translated, and `<UNK>` in the target is a literal hole in the output.
- **Rare-word / long-tail sparsity.** Natural language word frequencies follow **Zipf's law**: a huge fraction of word *types* occur only once or twice. Their embeddings are trained on almost no signal, so they're effectively noise. Morphology is invisible: `run`, `runs`, `running`, `runner` are four unrelated IDs; the model can't share what it learned about one across the others.
- **Huge, yet still incomplete, vocabulary.** To cover more words you grow V, but the output **softmax cost grows linearly in V** (and dominates NMT compute), and the embedding table becomes enormous — while *still* never achieving full coverage, because word formation is productive/infinite (German compounds, agglutinative languages, code identifiers). You pay more and still leak OOVs.

### Trade-off summary
Best possible per-token semantics (a token ≈ a word), but fundamentally cannot handle open vocabulary, wastes capacity on the long tail, and needs language-specific pre-segmentation for scriptio-continua languages.

**Key references:**
- Mikolov, Sutskever, Chen, Corrado, Dean (2013), *Distributed Representations of Words and Phrases and their Compositionality*, NeurIPS. https://arxiv.org/abs/1310.4546
- Sutskever, Vinyals, Le (2014), *Sequence to Sequence Learning with Neural Networks*, NeurIPS. https://arxiv.org/abs/1409.3215
- Bahdanau, Cho, Bengio (2015), *Neural Machine Translation by Jointly Learning to Align and Translate*, ICLR. https://arxiv.org/abs/1409.0473
- Luong, Sutskever, Le, Vinyals, Zaremba (2015), *Addressing the Rare Word Problem in Neural Machine Translation*, ACL. https://arxiv.org/abs/1410.8206 — an explicit pre-subword patch (copy-through UNK dictionary), illustrating how painful the OOV problem was.

---

## 2. Character-level tokenization

### Core idea
The vocabulary is just the set of characters (or the 256 possible bytes). Every string is a sequence of these atoms. There is, by construction, **no OOV**.

### Training procedure
Trivial: enumerate the distinct characters in the corpus (or fix the vocab to all 256 byte values, needing *no* training data at all). Vocab size is tiny — dozens to a few thousand for multilingual Unicode-character models, or exactly 256 for byte-level.

### Inference procedure
Map each character/byte to its ID. Detokenization is a lossless concatenation. Completely language-agnostic; no pre-tokenizer needed.

### Pros
- **Tiny vocabulary** → tiny embedding table and cheap softmax.
- **Zero OOV**, ever. Handles any script, emoji, typo, code, mixed languages.
- No language-specific pre-tokenization.

### Cons
- **Very long sequences.** An English word averages ~4–5 characters, so sequences are ~4–5× longer than word-level. With self-attention costing O(n²), this is expensive, and it shrinks the effective context window (fewer "real" words fit).
- **Weak / diffuse semantics per token.** A single character carries almost no meaning; the burden of composing characters into morphemes and words is pushed entirely onto the model, which needs more layers/parameters and more data to learn what a subword tokenizer hands it for free.
- Harder, longer-range dependencies (the model must remember spelling across many steps).

### Trade-off vs word-level
Character-level trades away per-token semantics and sequence efficiency to *completely* solve the OOV and vocab-size problems. Subword methods (next) were invented precisely to sit between these two extremes — small-ish vocab, no OOV, *and* reasonably short sequences with meaningful units.

**Representative references:**
- Kim, Jernite, Sontag, Rush (2016), *Character-Aware Neural Language Models*, AAAI. https://arxiv.org/abs/1508.06615
- Ling et al. (2015), *Finding Function in Form: Compositional Character Models...*, EMNLP. https://arxiv.org/abs/1508.02096
- (Later, byte-level end-to-end) Xue et al. (2022), *ByT5: Towards a Token-Free Future with Pre-trained Byte-to-Byte Models*, TACL. https://arxiv.org/abs/2105.13626

---

## 3. Byte Pair Encoding (BPE)

### 3a. Origin: Philip Gage, 1994 — a *compression* algorithm

**Citation:** Philip Gage (1994), *A New Algorithm for Data Compression*, **The C Users Journal**, Vol. 12, No. 2 (February 1994), pp. 23–38. (Very frequently cited as "Dr. Dobb's Journal, Feb 1994"; the two are often conflated in the literature. The C Users Journal is the original venue.) Widely mirrored, e.g. http://www.pennelynn.com/Documents/CUJ/HTML/94HTML/19940045.HTM — and summarized at https://en.wikipedia.org/wiki/Byte_pair_encoding

**Original idea (data compression):** Repeatedly find the most frequent pair of adjacent bytes in the data and replace all occurrences of that pair with a single byte value **that does not currently appear** in the data, recording the substitution in a table. Repeat until no unused byte value remains or no pair repeats. Decompression replays the substitution table in reverse. It gets LZW-like compression with a very simple decoder. The key mechanic — *"merge the most frequent adjacent pair, iterate"* — is exactly what NLP later borrowed.

### 3b. Adaptation to NLP: Sennrich, Haddow, Birch, 2016

**Citation:** Rico Sennrich, Barry Haddow, Alexandra Birch (2016), *Neural Machine Translation of Rare Words with Subword Units*, **ACL 2016**, pp. 1715–1725.
- ACL Anthology: https://aclanthology.org/P16-1162/
- arXiv (2015 preprint): https://arxiv.org/abs/1508.07909

**Core idea (2–3 sentences):** Instead of compressing bytes, run BPE over *characters within words* to learn a vocabulary of frequent **subword units** (morphemes, common stems/affixes, whole common words). Rare/unseen words are then representable as a sequence of known subwords, giving **open-vocabulary** translation with a fixed, modest vocabulary and no `<UNK>`. The merge operations learned on training data are stored as an ordered **merge list** and re-applied deterministically at inference.

#### The word-boundary trick
BPE is applied *within* words, not across them. Each word is first split into characters, and a special **end-of-word marker** (the paper uses `</w>`) is appended so the tokenizer knows where words end and can distinguish e.g. the suffix `est` from the standalone `est`. (SentencePiece later uses a *start*-of-word marker `▁` instead — see §6.)

#### Exact TRAINING algorithm (learning the merges)
```
Input:  a word-frequency table {word: count} from the corpus
        target number of merges N (this ~= vocab size)
Output: an ordered list of merge rules [(a,b), ...]  and the symbol vocabulary

1. Represent each word as a tuple of characters with </w> appended.
     "low" (count 5)  ->  ('l','o','w','</w>')
2. Initialize the symbol vocabulary = set of all characters (+ </w>).
3. Repeat N times:
   a. Count the frequency of every adjacent symbol PAIR across all words,
      weighting each pair occurrence by that word's count.
   b. Find the pair (a,b) with the highest total frequency.
      (Ties: break deterministically, e.g. first-seen / lexicographic.)
   c. Record the merge rule (a,b) -> "ab" and append it to the ordered list.
   d. In EVERY word, replace every adjacent occurrence of (a,b) with "ab".
      Add "ab" to the symbol vocabulary.
4. Final vocabulary = initial characters + all merged symbols.
```
Only the **ordered merge list** (plus the base alphabet) is needed at inference — the order is the whole point.

#### Exact ENCODING / inference algorithm
```
To tokenize a new word W:
1. Split W into characters and append </w>.
2. Repeatedly:
     among all adjacent symbol pairs currently in W, find the one whose
     merge rule has the SMALLEST index (earliest-learned) in the merge list;
     if none of the current pairs is in the merge list, STOP.
     Apply that merge (replace the pair with the merged symbol).
3. The remaining symbols are the subword tokens.
```
Because merges are applied in the exact order they were learned, encoding is deterministic and reproduces the segmentation implied by training.

#### Concrete worked example
Corpus word counts (with `</w>`):

| word | count |
|------|-------|
| `low` | 5 |
| `lower` | 2 |
| `newest` | 6 |
| `widest` | 3 |

Initial (characters + `</w>`):
```
l o w </w>            x5
l o w e r </w>        x2
n e w e s t </w>      x6
w i d e s t </w>      x3
```

**Pair counts, round 1** (weighted by word count). Look at candidates:
- `e s`: appears in `newest`(6) and `widest`(3) → **9**
- `s t`: `newest`(6)+`widest`(3) → 9
- `t </w>`: `newest`(6)+`widest`(3) → 9
- `l o`: `low`(5)+`lower`(2) → 7
- `o w`: `low`(5)+`lower`(2) → 7
- `w </w>`: `low`(5) → 5, etc.

`e s`, `s t`, `t </w>` all tie at 9. Take the first by the deterministic tie-break → **merge `e s` → `es`**.
```
l o w </w>            x5
l o w e r </w>        x2
n e w es t </w>       x6
w i d es t </w>       x3
```
**Round 2:** now `es t` = 9 is the max → **merge `es t` → `est`**.
```
n e w est </w>        x6
w i d est </w>        x3
```
**Round 3:** `est </w>` = 9 → **merge `est </w>` → `est</w>`**.
```
n e w est</w>         x6
w i d est</w>         x3
```
**Round 4:** now `l o` = 7 is the max → **merge `l o` → `lo`**.
```
lo w </w>             x5
lo w e r </w>         x2
```
**Round 5:** `lo w` = 7 → **merge `lo w` → `low`**.
```
low </w>              x5
low e r </w>          x2
```

Learned **merge list (in order):**
```
1. (e, s)        -> es
2. (es, t)       -> est
3. (est, </w>)   -> est</w>
4. (l, o)        -> lo
5. (lo, w)       -> low
```

**Now encode a *new* word `lowest`:** start `l o w e s t </w>`.
- Applicable pairs and their merge-list indices: `(e,s)`→#1 (smallest) → apply → `l o w es t </w>`
- `(es,t)`→#2 → apply → `l o w est </w>`
- `(est,</w>)`→#3 → apply → `l o w est</w>`
- `(l,o)`→#4 → apply → `lo w est</w>`
- `(lo,w)`→#5 → apply → `low est</w>`
- No remaining adjacent pair is in the merge list → **STOP**.
- Result: **`low` + `est</w>`** — i.e. `lowest` = `low` + `est`, a sensible stem+suffix split, even though `lowest` was never in the training corpus. This is exactly the open-vocabulary win.

### Trade-off vs its predecessors
Versus **word-level**: no OOV, far smaller vocab, morphology partly captured (shared subwords). Versus **character-level**: much shorter sequences and more semantic tokens, at the cost of a training step and a fixed learned vocab. The remaining weakness: merges are chosen by **raw frequency**, a greedy heuristic with no probabilistic model of the corpus, and the segmentation is deterministic (one fixed split per word).

> **Byte-level BPE (BBPE)** — used by GPT-2 (Radford et al. 2019) and most modern LLMs — runs the same algorithm but the base alphabet is the **256 bytes** rather than Unicode characters. This guarantees *zero OOV for any possible input* (any byte sequence is representable) while keeping the base alphabet at exactly 256. Ref: Radford et al. (2019), *Language Models are Unsupervised Multitask Learners* (GPT-2). https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf ; and Wang et al. (2019), *Neural Machine Translation with Byte-Level Subwords*. https://arxiv.org/abs/1909.03341

---

## 4. WordPiece (Schuster & Nakajima 2012; used by BERT)

**Citation:** Mike Schuster, Kaisuke Nakajima (2012), *Japanese and Korean Voice Search*, **ICASSP 2012**, pp. 5149–5152. https://research.google/pubs/pub37842/ (IEEE: https://doi.org/10.1109/ICASSP.2012.6289079). Popularized for NLP by BERT: Devlin, Chang, Lee, Toutanova (2019), *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*, NAACL. https://arxiv.org/abs/1810.04805

**Core idea (2–3 sentences):** WordPiece is bottom-up merging like BPE, but the pair it merges each step is **not** the most *frequent* pair — it is the pair whose merge most **increases the likelihood of the training corpus** under a unigram language model over the current vocabulary. Concretely it merges the pair `(a,b)` maximizing a score
$$\text{score}(a,b)=\frac{\text{freq}(ab)}{\text{freq}(a)\cdot \text{freq}(b)}.$$
This rewards pairs that co-occur *more than their individual frequencies would predict*, so it favors merges that carve out genuinely word-like units rather than merely common ones.

#### Why that score = likelihood gain (the derivation, briefly)
Model the corpus with a unigram LM: probability of a segmentation is the product of token unigram probabilities `p(t)=freq(t)/Total`. Merging `a` and `b` into `ab` changes the corpus log-likelihood; to first order the change from merging is proportional to
`log p(ab) − log p(a) − log p(b) = log[ freq(ab)·Total / (freq(a)·freq(b)) ] + const`.
Maximizing that is equivalent to maximizing `freq(ab)/(freq(a)·freq(b))` — hence the score. That is the one-line difference from BPE: **BPE ranks by `freq(ab)`; WordPiece ranks by `freq(ab)/(freq(a)·freq(b))`.**

#### The `##` continuation-prefix convention
WordPiece marks *word-internal* (non-initial) pieces with a `##` prefix. E.g. `playing` → `play`, `##ing`; `unaffable` → `un`, `##aff`, `##able`. A piece *without* `##` may start a word; a piece *with* `##` must attach to the preceding piece. This is how WordPiece encodes word boundaries (BERT vocab: `[UNK] [CLS] [SEP] [MASK]` specials + base chars + `##`-prefixed and bare subwords). Detokenization: concatenate, dropping the `##`, and insert spaces before bare (non-`##`) pieces.

#### TRAINING algorithm
```
1. Initialize the vocabulary with all base characters. Word-internal characters
   get a "##" form as well (e.g. 'p' and '##l','##a','##y'...), because the same
   character behaves differently at word start vs. inside a word.
2. Represent each word as its sequence of these (##-marked) character pieces.
3. Repeat until vocab reaches target size (or best score below a threshold):
   a. For every adjacent pair (a,b) currently present, compute
        score(a,b) = freq(ab) / (freq(a) * freq(b)).
   b. Merge the pair with the highest score into a new token; add it to the vocab.
   c. Update the piece sequences accordingly.
```
Note: the *original* Schuster–Nakajima paper phrases the objective as "choose the merge that maximizes the language-model likelihood of the training data"; the `freq/(freq·freq)` formula is the standard, widely-cited practical realization (see the Hugging Face WordPiece writeup in §7). Google has never open-sourced the exact original training code, so this reconstruction is the community-standard one — flagging that as a mild uncertainty.

#### INFERENCE algorithm — greedy longest-match-first
```
To tokenize a word W:
1. Start at the beginning of W. Find the LONGEST prefix of W that is in the vocab.
     - The first piece is matched in its bare form; subsequent pieces must exist
       in "##"-prefixed form.
2. Emit that piece, remove it from the front of W, and repeat on the remainder
   (looking up "##..." pieces).
3. If at any point no prefix of the remaining string is in the vocab,
   the WHOLE WORD is mapped to [UNK].
```
Example with a vocab containing `un, ##aff, ##able, ##a, ##b, ...`: `unaffable` → `un`, then longest match on `affable` is `##aff`, then `able` → `##able` → `[un, ##aff, ##able]`. (Contrast BPE, which replays its ordered merge list rather than doing longest-prefix lookup.)

#### Trade-off vs BPE
Same bottom-up family, but the likelihood-based score produces subwords that are more "informative" (it won't greedily merge a very common piece onto everything just because the pair is frequent). Downsides: (1) inference is greedy longest-match, which can be locally suboptimal and, unlike BPE, maps unresolvable words to a single `[UNK]` (so byte-level BPE has stronger no-OOV guarantees); (2) the training objective is still a heuristic, not a global optimization of the segmentation.

---

## 5. Unigram Language Model tokenizer (Kudo 2018)

**Citation:** Taku Kudo (2018), *Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates*, **ACL 2018**, pp. 66–75.
- ACL Anthology: https://aclanthology.org/P18-1007/
- arXiv: https://arxiv.org/abs/1804.10959

**Core idea (2–3 sentences):** Unigram is **top-down**, the opposite of BPE/WordPiece. It starts from a *large* seed vocabulary of candidate subwords, assigns each a probability, and **iteratively prunes** the tokens whose removal least hurts the corpus's total likelihood, using an EM algorithm — shrinking the vocab to the target size. Because every token carries a probability, a word generally has **many** possible segmentations with different probabilities, so the tokenizer can return the most probable one *or sample* alternatives (**subword regularization**, a data-augmentation/regularization technique).

#### The probabilistic model
A sentence `X` is segmented into subwords `x = (x_1,...,x_M)`. Under a unigram LM the segmentation probability is
$$P(\mathbf{x}) = \prod_{i=1}^{M} p(x_i), \qquad \sum_{x\in V} p(x)=1.$$
The probability of the sentence is the sum over all valid segmentations `S(X)`: `P(X)=Σ_{x∈S(X)} P(x)`. The most likely segmentation is `x* = argmax_{x∈S(X)} P(x)`, found efficiently with the **Viterbi** algorithm over the lattice of possible subword splits.

#### TRAINING algorithm (seed → prune via EM)
```
1. Build a large SEED vocabulary (much bigger than the target), e.g. all
   substrings up to some length / all characters + most frequent substrings,
   often via a Suffix Automaton / by taking top-K frequent n-grams. Include
   all single characters so every string is always segmentable.
2. Initialize probabilities p(x) (e.g. from substring frequencies).
3. Repeat until |V| <= target size:
   a. (E-step + M-step) Fix the vocabulary. Run EM to (re)estimate p(x):
        E: for each sentence, use the forward-backward / Viterbi-style
           computation over its segmentation lattice to get expected counts
           of each subword.
        M: set p(x) proportional to its expected count. Iterate to convergence.
   b. For each subword x, compute its LOSS_x = how much the total corpus
        log-likelihood would DROP if x were removed from the vocabulary
        (each affected word re-segmented with the remaining pieces).
   c. Sort subwords by loss. KEEP all single characters (never prune them,
        to preserve full coverage). PRUNE the bottom fraction (e.g. drop the
        10–20% with the smallest loss — the "least useful" tokens).
   d. If |V| is still above target, go to (a).
4. Output the final vocabulary with its probabilities p(x).
```

#### INFERENCE algorithm
```
Default: Viterbi decode — return argmax_x P(x) = the single most probable
         segmentation, using p(x) as emission scores over the split lattice.

Subword regularization (training-time augmentation): instead of the 1-best,
SAMPLE a segmentation from the l-best list (or via forward-filtering /
backward-sampling), controlled by a temperature parameter alpha:
   P_sample(x) proportional to P(x)^alpha.
Different epochs see the same word split differently -> regularizes the model.
(Related: BPE-dropout, Provilkov et al. 2020, achieves similar stochasticity
by randomly skipping merges in BPE. https://arxiv.org/abs/1910.13267)
```

#### Contrast with BPE (bottom-up vs top-down)
| | BPE / WordPiece | Unigram LM |
|---|---|---|
| Direction | **Bottom-up**: start from characters, *merge* upward | **Top-down**: start from a big vocab, *prune* down |
| Selection criterion | greedy: most frequent pair (BPE) / best likelihood-ratio pair (WordPiece) | global: remove tokens that least reduce corpus likelihood (EM) |
| Per-token info | none (just a merge order) | an explicit **probability** p(x) |
| Segmentations per word | exactly one (deterministic) | **many**, scored; can pick best or **sample** |
| Enables regularization? | not natively (needs BPE-dropout) | yes, natively (subword regularization) |

#### Trade-off vs BPE
Unigram optimizes a cleaner probabilistic objective and, via sampling, gives free regularization and often better/robuster segmentations (especially low-resource, out-of-domain). Cost: training is heavier (EM + repeated lattice re-segmentation and pruning) than BPE's simple merge loop, and the model is conceptually more involved. Unigram is the default algorithm behind many modern tokenizers (T5, ALBERT, XLNet, and most SentencePiece-based multilingual models).

---

## 6. SentencePiece (Kudo & Richardson 2018) — the *framework*, not a new algorithm

**Citation:** Taku Kudo, John Richardson (2018), *SentencePiece: A Simple and Language Independent Subword Tokenizer and Detokenizer for Neural Text Processing*, **EMNLP 2018 (System Demonstrations)**, pp. 66–71.
- ACL Anthology: https://aclanthology.org/D18-2012/
- arXiv: https://arxiv.org/abs/1808.06226
- Code: https://github.com/google/sentencepiece

**Core idea (2–3 sentences):** SentencePiece is a *library/implementation* that provides both **BPE** and **Unigram** training, with one crucial engineering change: it treats the input as a **raw Unicode stream** and does **no language-specific pre-tokenization** — whitespace itself is encoded as a normal symbol, the meta-symbol **`▁` (U+2581, "lower one-eighth block")**. Because spaces are part of the token stream, detokenization is *lossless and reversible* by design (`text == decode(encode(text))`), and the whole pipeline is language-agnostic — which is exactly what you need for Chinese/Japanese/Thai, where there are no spaces to pre-split on.

#### The `▁` whitespace trick (this is the distinctive part)
1. Normalize the raw text (Unicode NFKC by default) — no tokenizer, no Moses, no Jieba.
2. Replace every space with `▁`. Conventionally a `▁` is prepended to the start so the first word is treated like any other. Example: `"Hello world"` → `▁Hello▁world`.
3. Run BPE or Unigram over *this* character stream (spaces are now ordinary characters). Learned tokens look like `▁Hello`, `▁world`, `▁the`, `ing`, etc. — a leading `▁` means "there was a space before this piece" (contrast WordPiece's `##`, which marks the *absence* of a preceding space).
4. **Detokenize losslessly:** concatenate all tokens and replace `▁` back with a space. No heuristics, no rules — it round-trips exactly, including for languages with no spaces (where `▁` simply won't appear inside words).

#### Training procedure
Identical to §3 (BPE) or §5 (Unigram) — SentencePiece adds no new *learning* algorithm — except it operates on the `▁`-encoded raw stream and applies its own normalization; you pick `--model_type=bpe` or `--model_type=unigram` (default is unigram) and `--vocab_size`. It can also do char/word modes.

#### Inference procedure
`▁`-encode + normalize the input, then apply the chosen algorithm's encoder (BPE merge replay, or Unigram Viterbi). Output IDs. Decoding = map IDs to pieces, concatenate, swap `▁`→space.

#### Trade-off vs its predecessors
The algorithmic content is BPE/Unigram; the *contribution* is making subword tokenization **truly end-to-end, reversible, and language-independent** by removing the fragile, language-specific pre-tokenization step and by treating whitespace as data. This is why SentencePiece became the de-facto standard for multilingual models (mBART, T5, XLM-R, LLaMA's tokenizer is SentencePiece-BPE-style, etc.). The only real "cost" is that you must standardize on its normalization and the `▁` convention across your whole pipeline.

---

## 7. Freely-usable visual explainers, animations & diagrams to link/reference

**Hugging Face LLM Course — "The Tokenizers" chapter (Chapter 6)** — the best free, well-diagrammed walkthrough with step-by-step animations and runnable code for all three algorithms:
- Chapter 6 overview: https://huggingface.co/learn/llm-course/chapter6/1
- Normalization & pre-tokenization: https://huggingface.co/learn/llm-course/chapter6/4
- **BPE, step by step:** https://huggingface.co/learn/llm-course/chapter6/5
- **WordPiece, step by step** (includes the `freq(ab)/(freq(a)·freq(b))` score explained): https://huggingface.co/learn/llm-course/chapter6/6
- **Unigram, step by step** (EM pruning + Viterbi): https://huggingface.co/learn/llm-course/chapter6/7
- "Comparison of the three": https://huggingface.co/learn/llm-course/chapter6/8
  *(These also exist under the older path `/learn/nlp-course/chapter6/...` which currently redirects to the `llm-course` path.)*
- HF docs conceptual summary with diagrams: https://huggingface.co/docs/transformers/en/tokenizer_summary

**Interactive playgrounds (great for live demos):**
- OpenAI Tokenizer (see GPT tokens colored inline): https://platform.openai.com/tokenizer
- Tiktokenizer (multi-model, side-by-side, live): https://tiktokenizer.vercel.app/
- The Tokenizer Playground (Hugging Face Space, compares tokenizers): https://huggingface.co/spaces/Xenova/the-tokenizer-playground

**Video / long-form:**
- Andrej Karpathy, *Let's build the GPT Tokenizer* (2h, builds BPE from scratch; excellent and free): https://www.youtube.com/watch?v=zduSFxRajkE — companion repo `minbpe`: https://github.com/karpathy/minbpe
- Jay Alammar's illustrated blog (great diagrams; more on embeddings/transformers, some tokenization): https://jalammar.github.io/

**Blog posts with clear diagrams:**
- Cathal Horan, *Tokenizers: How machines read* (FloydHub) — clean visual comparison of word/char/subword: https://floydhub.ghost.io/tokenization-nlp/
- "SentencePiece Tokenizer Demystified" (Towards Data Science): https://towardsdatascience.com/sentencepiece-tokenizer-demystified-d0a3aac19b15/
- Google `sentencepiece` README (has the `▁` examples): https://github.com/google/sentencepiece

---

## 8. One-page cheat-sheet

| Method | Year / paper | Direction | Selection rule | Boundary marker | Inference | Vocab | OOV? |
|---|---|---|---|---|---|---|---|
| Word | ~2013–15 | — | top-V frequency | space | dict lookup | 30k–500k | **yes → `<UNK>`** |
| Char / Byte | — | — | all chars / 256 bytes | none | direct map | tiny / 256 | **none** |
| BPE | Gage 1994; Sennrich 2016 | bottom-up merge | most frequent pair | `</w>` (or `▁`) | replay ordered merges | tunable | none (byte-level) |
| WordPiece | Schuster & Nakajima 2012; BERT 2019 | bottom-up merge | max `freq(ab)/(freq(a)·freq(b))` | `##` (continuation) | greedy longest-match; else `[UNK]` | tunable | word → `[UNK]` |
| Unigram LM | Kudo 2018 | top-down prune (EM) | remove tokens with least likelihood loss | `▁` (via SP) | Viterbi (or sample) | tunable | none (chars kept) |
| SentencePiece | Kudo & Richardson 2018 | *framework* (BPE or Unigram) | (inherits) | **`▁` (U+2581)**, lossless | (inherits) | tunable | none |

**The single throughline:** every method is a different point on the *vocab-size ↔ sequence-length ↔ coverage ↔ semantics* trade-off surface. Word-level and char-level are the two extremes; BPE, WordPiece, and Unigram are three different algorithms for finding a good middle, and SentencePiece is the framework that made the middle language-independent and reversible for production LLMs.

---

### Uncertainties flagged (per your "state best answer + flag" instruction)
1. **Gage 1994 venue.** Primary venue is *The C Users Journal* (Feb 1994); it is *extremely* commonly cited as "Dr. Dobb's Journal." Both attributions appear throughout the literature; the C Users Journal is the correct original. Page numbers (23–38) are as commonly cited.
2. **WordPiece exact training objective.** Google never released the original WordPiece training code. The `score = freq(ab)/(freq(a)·freq(b))` formulation is the standard community reconstruction (matching the paper's stated "maximize training-data likelihood" objective and the Hugging Face reference implementation); the precise heuristics in Google's internal version may differ slightly.
3. **Unigram seed-vocab construction.** The paper leaves the seed-building somewhat open (frequent substrings / suffix-automaton enumeration); SentencePiece's implementation makes specific choices. The EM-prune loop and Viterbi decoding described are accurate and reimplementable.
