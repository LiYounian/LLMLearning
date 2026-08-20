# 主流大模型 Tokenizer 调研

> 面向「大模型基础课 · 第一课 Tokenizer」的支撑资料。
> 每个条目尽量给出：(a) 分词算法 (b) 字节级还是字符级 (c) 词表大小 (d) 特殊处理 (e) 实现库 (f) 来源。
> 数字以官方技术报告 / HF tokenizer 配置 / tiktoken 仓库 / 官方博客为准。存疑处已用 ⚠️ 标注。

---

## 0. 预备概念：byte-level BPE 的「字节技巧」（以 GPT-2 为例）

朴素 BPE 在字符（Unicode code point）上做合并，会遇到两个问题：Unicode 有 ~14 万个码位，全放进基础词表太大；而且总会遇到训练时没见过的字符 → 只能吐 `<unk>`（未知词）。

GPT-2 的解法（Radford et al. 2019, *Language Models are Unsupervised Multitask Learners*）是 **byte-level BPE (BBPE)**：

1. 任何文本先 UTF-8 编码成字节流。字节只有 **256** 种取值，所以基础词表固定为 256 个「字节 token」。
2. 因为任何 Unicode 字符都能由 UTF-8 字节序列表示，而 256 个字节全部在基础词表里，**永远不会出现 unknown token**（无损、无 `<unk>`）。
3. BPE 的合并（merge）在**字节序列**上进行，把高频相邻字节对反复合并成更长的 token。
4. 实现细节：GPT-2 用一个 `bytes_to_unicode` 映射，把 256 个字节可逆地映射到「可打印的 Unicode 字符」上（避开空格 / 控制字符，方便正则切分和调试），BPE 实际是在这层映射后的符号上跑的——本质仍是字节级。
5. 预切分（pre-tokenization）用一段正则先把文本切成粗块（单词、数字、标点、空白各成一段），再在块内做 BPE，避免跨词合并。
6. 词表大小 **50,257** = 256 个字节基础 token + 50,000 次 BPE 合并产生的 token + 1 个特殊 token `<|endoftext|>`。

这个「字节兜底 + 无 unk」的设计成为后续几乎所有主流模型（GPT-3/4、Qwen、DeepSeek、Llama 3、Kimi）的共同范式。

来源：GPT-2 论文 <https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf> ；OpenAI tiktoken 仓库 <https://github.com/openai/tiktoken>

---

## 1. GPT 家族（OpenAI）

OpenAI 全系用自研的 **tiktoken** 库（Rust 内核 + Python 绑定），全部是 **byte-level BPE**。各代对应不同的 encoding：

### GPT-2
- **算法**：byte-level BPE
- **字节级**：是（256 字节基础词表，无 unk）
- **词表**：**50,257**（256 字节 + 50,000 merges + 1 个 `<|endoftext|>`）
- **特殊处理**：正则预切分（`'s/'t/'re/…` 缩写、字母段、数字段、标点段、空白段分开）；**不做数字逐位拆分**；空白（前导空格）并入后一个词一起编码。
- **实现**：tiktoken encoding 名 `gpt2` / `r50k_base`
- **来源**：GPT-2 论文（见上）；tiktoken `tiktoken_ext/openai_public.py` <https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py>

### GPT-3
- 与 GPT-2 **同款** tokenizer，encoding 为 `r50k_base`（部分 GPT-3 系列如 Codex/编辑模型用 `p50k_base`，词表 50,281，多了给代码/FIM 的合并与特殊 token）。
- **词表**：r50k_base = 50,257；p50k_base = 50,281。
- **来源**：tiktoken `openai_public.py`（同上）；`r50k_base`/`p50k_base` 定义于其中。

### GPT-3.5 / GPT-4
- **encoding**：`cl100k_base`
- **算法**：byte-level BPE
- **词表**：约 **100k**。tiktoken 中基础 mergeable ranks 到 100,256，加上特殊 token（`<|endoftext|>`=100257、FIM 三件套、`<|endofprompt|>`=100276）后 `n_vocab` ≈ **100,277**。常被简记为「~100k / 100,256」。
- **特殊处理**：正则相比 GPT-2 升级——**数字按 1~3 位分组**（`\p{N}{1,3}`，抑制超长数字 token）；缩写匹配大小写不敏感；对连续空白/换行处理更细。
- **实现**：tiktoken，encoding `cl100k_base`
- **来源**：tiktoken `openai_public.py`（同上）。

### GPT-4o / o 系列（o1、o3 等）
- **encoding**：`o200k_base`
- **算法**：byte-level BPE
- **词表**：约 **200k**。tiktoken 中基础 ranks 到 199,997，特殊 token（`<|endoftext|>`=199999、`<|endofprompt|>`=200018）后 `n_vocab` ≈ **200,019**。常简记「~200k / o200k」。
- **特殊处理**：正则进一步针对多语言与 CJK 优化；数字分组沿用；对非英文压缩率显著提升。
- **实现**：tiktoken，encoding `o200k_base`
- **来源**：tiktoken `openai_public.py` <https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py>（源码内可见 `o200k_base` 的 pat_str 与 special tokens）。

> ⚠️ 关于精确数字：网上常见「cl100k = 100,256」「o200k = 199,998/200,000」等说法，差异来自「是否含特殊 token」。以 tiktoken 源码为准：cl100k_base 基础 ranks 100,256、含特殊约 100,277；o200k_base 基础 ranks 199,998、含特殊约 200,019。课件里写「约 100k / 约 200k」最稳妥。

---

## 2. Qwen（阿里巴巴，Qwen1 / 2 / 2.5 / 3）

- **算法**：byte-level BPE（BBPE），**tiktoken 风格**（Qwen 官方明确说在 UTF-8 字节上跑 BPE，用 tiktoken 高性能包）。
- **字节级**：是（UTF-8 字节起步，逐位合并，无 unk）。
- **词表**：BPE 得到 **151,643** 个常规 token；加上少量特殊/控制 token（`<|endoftext|>`、`<|im_start|>`、`<|im_end|>` 等）后，实际可用约 151,646~151,665；**模型 embedding 矩阵通常 padding 到 151,936 或 152,064**（Qwen2/2.5 的 `config.json` 里 `vocab_size` 常见 **151,936**）。
- **特殊处理**：为多语言（尤其中文/代码）优化的大词表；中文平均 1 个 token ≈ 1.5~1.8 个汉字，英文 1 token ≈ 3~4 字符；ChatML 风格特殊 token（`<|im_start|>`/`<|im_end|>`）。
- **实现**：tiktoken（早期 Qwen 仓库直接用 tiktoken 的 `.tiktoken` bpe 文件；HF 上以 `Qwen2Tokenizer` / `tokenizer.json` 提供，等价 byte-level BPE）。
- **来源**：
  - Qwen 技术报告 arXiv:2309.16609 <https://arxiv.org/pdf/2309.16609>
  - Qwen 官方 tokenization 说明 <https://github.com/QwenLM/Qwen/blob/main/tokenization_note.md>
  - 概念文档（151,643 / 压缩率）<https://qwen.readthedocs.io/en/latest/getting_started/concepts.html>

> ⚠️ 「词表大小」在 Qwen 语境下有三个易混数字：**151,643**（BPE 常规 token 数）、**151,936 / 152,064**（embedding padding 后、config 里的 `vocab_size`）、**151,851/151,936**（含特殊 token 的不同口径）。讲课建议说「约 15.2 万，BPE 常规 token 151,643，embedding 补齐到 151,936」。

---

## 3. DeepSeek（V2 / V3）

- **算法**：byte-level BPE
- **字节级**：是
- **词表**：
  - **DeepSeek-V2**：BPE 词表 **100,000（100K）**；`config.json` 中 `vocab_size` 补齐到 **102,400**。
  - **DeepSeek-V3**：扩展到 **128,000（128K）**；`config.json` 中 `vocab_size` 为 **129,280**（含填充/预留特殊 token）。
- **特殊处理**：V3 的 pretokenizer 相比 V2 做了改动以优化多语言压缩，**引入了把标点与换行合并的 token**；这会在「多行 prompt 且结尾无换行」时带来 token 边界偏置，官方在训练时**随机拆分一定比例这类组合 token**来缓解。
- **实现**：HF `tokenizers`（byte-level BPE，随模型附 `tokenizer.json`）。
- **来源**：
  - DeepSeek-V3 技术报告 arXiv:2412.19437 <https://arxiv.org/pdf/2412.19437>（明确「Byte-level BPE，扩展词表 128K」及边界偏置处理）
  - DeepSeek-V2 技术报告 arXiv:2405.04434 <https://arxiv.org/abs/2405.04434>（100K BPE）

> ⚠️ V2 的「100K」是 BPE 词表口径，config 里 `vocab_size=102400`；V3「128K」对应 config `vocab_size=129280`。两组数分别是「BPE token 数」与「embedding 行数」。

---

## 4. LLaMA（Meta）

### LLaMA 1 / 2
- **算法**：**SentencePiece 的 BPE 模式**（不是 byte-level BPE）
- **字节级**：以 Unicode 字符/子词为主，但开启 **byte-fallback**——遇到词表外字符时回退成 UTF-8 字节 token，因此也不会真的产生 unk。
- **词表**：**32,000**
- **特殊处理**：**数字逐位拆分**（每个数字单独成 token，利于算术泛化）；SentencePiece 用 `▁`（U+2581）显式表示空格；byte-fallback 兜底未知字符。
- **实现**：SentencePiece（`tokenizer.model`）
- **来源**：LLaMA 论文 arXiv:2302.13971 <https://arxiv.org/abs/2302.13971>（§Tokenizer：BPE via SentencePiece，split digits，bytes fallback，32K）；Llama 2 论文 arXiv:2307.09288 <https://arxiv.org/abs/2307.09288>（沿用同款 32K SentencePiece）。

### LLaMA 3 / 3.1
- **算法**：改用 **tiktoken 风格的 byte-level BPE**（与 GPT-4 同款 tiktoken 内核）
- **字节级**：是
- **词表**：**128,256**（在 100k 基础 encoding 上扩了 28,672 个多语言/代码 token，官方说法「128K 词表，基于 tiktoken」）
- **特殊处理**：更大词表带来更好的压缩率，尤其提升代码与非英文效率；沿用数字分组等 tiktoken 正则风格。
- **实现**：tiktoken（`tokenizer.model` 以 tiktoken bpe 格式存储）
- **来源**：Llama 3 论文 *The Llama 3 Herd of Models* arXiv:2407.21783 <https://arxiv.org/abs/2407.21783>（§Tokenizer：128K vocab，100K from tiktoken + 28K 额外 token）。

> 关键叙事：Llama 是「SentencePiece → tiktoken」迁移的典型案例，32K→128K 词表 4× 放大，压缩率与多语言能力显著改善。

---

## 5. Kimi / Moonshot AI（k1 / k1.5 / K2）

- **算法**：byte-level BPE，带 **regex 预切分 + BPE** 的流水线（与 tiktoken/GPT-4 风格一致）。
- **字节级**：是（字节级 BPE）。
- **词表**：**Kimi K2 = 160,000（160K）**。
- **特殊处理**：大词表覆盖多语言文本与代码 token；K2 面向 agentic / 长上下文与百万级 token 工作负载，社区有专门优化其 tokenization 吞吐的工作。
- **实现**：随开源权重发布，HF `tokenizers`（`tokenizer.json`，byte-level BPE）。
- **来源**：
  - Kimi K2 技术报告 *Kimi K2: Open Agentic Intelligence* arXiv:2507.20534 <https://arxiv.org/abs/2507.20534>
  - HF 模型卡 <https://huggingface.co/moonshotai/Kimi-K2-Instruct>
  - GitHub <https://github.com/MoonshotAI/Kimi-K2>

> ⚠️ **信息透明度提示**：
> - **k1 / k1.5**：这两代是闭源 API 模型，Moonshot **未公开发布 tokenizer 细节 / 词表大小**，k1.5 技术报告（arXiv:2501.12599）主题是 RL 训练与长思维链，未披露分词器规格。故 k1/k1.5 的 tokenizer 具体参数**无法从官方来源确证**，只能推断沿用 byte-level BPE 家族做法。
> - **K2 = 160,000** 这个数字来自技术报告与第三方分析口径一致，可信度较高；但「精确到个位」的官方一句话我未逐字核到，建议课件写「约 16 万」。

---

## 6. 附：Mistral / Gemma（一行对比）

- **Mistral（7B / Mixtral 等早期）**：SentencePiece BPE，词表 **32,000**（与 Llama 2 同量级）；较新的 Mistral（如 Mistral NeMo / v3 tokenizer「Tekken」）改用 tiktoken 风格 byte-level BPE，词表扩到 **~128,000/131,072**。来源：Mistral 官方文档/模型卡。
- **Gemma / Gemini**：SentencePiece，词表 **256,000**（超大词表，含 split digits + byte-level 编码兜底，对多语言友好）；Gemma 3 与 Gemini 2.0 共用同一 SentencePiece。来源：Gemma 官方 tokenizer 文档 <https://gemma-llm.readthedocs.io/en/latest/colab_tokenizer.html>。

---

## 7. 对比总表

| 模型 | 分词算法 | 字节级? | 词表大小 | 实现库 | 来源 |
|---|---|---|---|---|---|
| GPT-2 | byte-level BPE | 是 | 50,257 | tiktoken (`gpt2`/`r50k_base`) | [GPT-2 论文](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) / [tiktoken](https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py) |
| GPT-3 | byte-level BPE | 是 | 50,257 (r50k) / 50,281 (p50k) | tiktoken | [tiktoken](https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py) |
| GPT-3.5 / GPT-4 | byte-level BPE | 是 | ~100k（cl100k：基础 100,256，含特殊 ~100,277） | tiktoken (`cl100k_base`) | [tiktoken](https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py) |
| GPT-4o / o 系列 | byte-level BPE | 是 | ~200k（o200k：基础 199,998，含特殊 ~200,019） | tiktoken (`o200k_base`) | [tiktoken](https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py) |
| Qwen 1/2/2.5/3 | byte-level BPE (tiktoken 风格) | 是 | 151,643 BPE token（embedding 补到 151,936/152,064） | tiktoken / HF `Qwen2Tokenizer` | [arXiv:2309.16609](https://arxiv.org/pdf/2309.16609) / [tokenization_note](https://github.com/QwenLM/Qwen/blob/main/tokenization_note.md) |
| DeepSeek-V2 | byte-level BPE | 是 | 100,000（config 102,400） | HF `tokenizers` | [arXiv:2405.04434](https://arxiv.org/abs/2405.04434) |
| DeepSeek-V3 | byte-level BPE | 是 | 128,000（config 129,280） | HF `tokenizers` | [arXiv:2412.19437](https://arxiv.org/pdf/2412.19437) |
| LLaMA 1 / 2 | SentencePiece-BPE + byte-fallback | 否（字符级，字节兜底） | 32,000 | SentencePiece | [arXiv:2302.13971](https://arxiv.org/abs/2302.13971) / [arXiv:2307.09288](https://arxiv.org/abs/2307.09288) |
| LLaMA 3 / 3.1 | byte-level BPE (tiktoken 风格) | 是 | 128,256 | tiktoken | [arXiv:2407.21783](https://arxiv.org/abs/2407.21783) |
| Kimi K2 | byte-level BPE (regex + BPE) | 是 | 160,000 | HF `tokenizers` | [arXiv:2507.20534](https://arxiv.org/abs/2507.20534) |
| Kimi k1 / k1.5 | 未公开（推测 byte-level BPE） | ⚠️ 未确证 | ⚠️ 未公开 | 未公开 | [arXiv:2501.12599](https://arxiv.org/abs/2501.12599) |
| Mistral 7B/Mixtral | SentencePiece-BPE | 否（字节兜底） | 32,000（新版 Tekken 转 tiktoken ~131k） | SentencePiece / tiktoken | Mistral 官方文档 |
| Gemma / Gemini | SentencePiece | 字节兜底 | 256,000 | SentencePiece | [Gemma tokenizer 文档](https://gemma-llm.readthedocs.io/en/latest/colab_tokenizer.html) |

---

## 8. 词表大小的历史趋势与权衡

**趋势：词表一路变大。** 50k (GPT-2/3, 2019–2020) → 100k (cl100k, GPT-3.5/4, 2022–2023) → 128k (Llama 3 / DeepSeek-V3) → 152k (Qwen) → 160k (Kimi K2) → 200k (GPT-4o) → 256k (Gemma/Gemini)。约 5 年放大了 4–5 倍。

**为什么要更大的词表？**

1. **更好的压缩率 = 每段文本更少 token**：词表越大，高频子词/词/短语能被并成一个 token，同样一段文本 token 数更少。直接收益：
   - 训练/推理更省算力（序列更短，注意力是 O(n²)）；
   - 有效上下文变长（同样的 context window 装下更多真实内容）；
   - API 按 token 计费时更便宜。
2. **多语言 / 中文·CJK / 代码尤其受益**：早期 50k 词表主要按英文语料学出来，一个汉字常被切成 2–3 个字节 token，非英文「税」很重。扩大词表并纳入多语言语料后，中文可做到 ~1 token/1.5–1.8 字（Qwen），代码里的常见缩进、关键字、符号组合也能整体成 token。这正是 Llama 3、DeepSeek-V3、Qwen、Kimi 把词表推到 128k–160k 的主因。

**代价与权衡（为什么不无限大）：**

1. **Embedding / LM Head 矩阵线性膨胀**：embedding 参数量 = 词表大小 × hidden_dim，输出层（LM head）同样一份。词表从 32k 涨到 256k 是 8×，对中小模型这块参数占比可能高得离谱（Gemma-2B 的 embedding 就占了模型相当比例），显存和参数预算被吃掉。
2. **稀有 token 训练不足（under-trained / "glitch tokens"）**：词表越大，长尾 token 出现频率越低，训练中见得少、embedding 学不透。这些「未充分训练 token」可能触发异常行为（著名的 `SolidGoldMagikarp` 现象；DeepSeek-V3/r1 也被报告存在异常 token）。
3. **收益递减**：压缩率随词表增长是次线性的——从 32k→128k 提升明显，再往上边际收益变小，而参数成本、稀有 token 风险持续上升。所以实践中在「压缩率」与「embedding 成本 + 稀有 token 可训练性」间取折中，当前主流落在 **128k–256k** 区间。

**一句话总结给学生**：词表大小是一个「压缩率 ↔ 参数量/可训练性」的权衡旋钮；过去几年因为多语言和代码需求、以及算力允许，这个旋钮整体右移到了 10 万–25 万量级，但不会无限右移。

---

### 参考来源汇总
- OpenAI GPT-2 论文：<https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf>
- tiktoken 仓库（各 encoding 的 pat_str 与 vocab）：<https://github.com/openai/tiktoken/blob/main/tiktoken_ext/openai_public.py>
- Qwen 技术报告 arXiv:2309.16609：<https://arxiv.org/pdf/2309.16609>
- Qwen tokenization 说明：<https://github.com/QwenLM/Qwen/blob/main/tokenization_note.md>
- DeepSeek-V2 arXiv:2405.04434：<https://arxiv.org/abs/2405.04434>
- DeepSeek-V3 arXiv:2412.19437：<https://arxiv.org/pdf/2412.19437>
- LLaMA arXiv:2302.13971：<https://arxiv.org/abs/2302.13971>
- Llama 2 arXiv:2307.09288：<https://arxiv.org/abs/2307.09288>
- Llama 3 arXiv:2407.21783：<https://arxiv.org/abs/2407.21783>
- Kimi K2 arXiv:2507.20534：<https://arxiv.org/abs/2507.20534>
- Kimi k1.5 arXiv:2501.12599：<https://arxiv.org/abs/2501.12599>
- Gemma tokenizer 文档：<https://gemma-llm.readthedocs.io/en/latest/colab_tokenizer.html>
