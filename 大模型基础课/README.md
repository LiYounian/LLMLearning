# 大模型基础课

用一系列**可交互 HTML 网页**讲清楚大模型的基础理论。每一课独立成一个文件夹，配索引目录 + 分节详解 + 可交互 demo + 参考文献。

## 课程列表

| 课 | 主题 | 目录 | 状态 |
|---|---|---|---|
| 第一课 | **Tokenizer 的工作原理** | `第一课-Tokenizer/` | v1 草稿 |

## 第一课 · Tokenizer

打开 `第一课-Tokenizer/index.html` 即可（纯静态，双击浏览器打开，无需起服务）。

### 目录结构

```
第一课-Tokenizer/
├── index.html                    索引首页（章节卡片 + 演化时间线）
├── 01-why.html                   为什么需要分词（动机 + 权衡曲面）
├── 02-history.html               历代方法总览（词级/字符级/subword 三路线 + 速查表）
├── 03-bpe.html                   BPE 详解 —— 含【可交互训练动画】+【切分新词 demo】
├── 04-wordpiece-unigram.html     WordPiece（似然合并）与 Unigram（EM 剪枝）+ SentencePiece
├── 05-byte-level.html            字节级 BPE —— 含【UTF-8 字节编码可视化器】
├── 06-models.html                主流模型对比：GPT/Qwen/DeepSeek/LLaMA/Kimi + 词表趋势
├── 07-frontier.html              前沿：glitch token、ByT5、MegaByte、BLT、H-Net、SuperBPE
├── 08-token-compare.html         tiktoken 切词对比 —— 含【真实分词器 token 数条形图 + 实际切分】
├── references.html               参考文献与来源（35 条，可点击溯源）
├── scripts/
│   └── gen_token_compare.py      用真实分词器(tiktoken+HF)跑 token 数, 生成 token_data.{json,js}
└── assets/
    ├── style.css                 统一暗色主题样式
    ├── bpe-demo.js               BPE 训练可视化器 + 切分器
    ├── byte-demo.js              UTF-8 字节编码可视化器
    ├── token-compare.js          切词对比图渲染逻辑(读 token_data.js)
    ├── token_data.json / .js     真实分词器跑出的对比数据(8 个分词器 × 5 个样本)
    ├── research_history.md       调研原始材料（历史/算法）—— 溯源留档
    ├── research_models.md        调研原始材料（主流模型）
    └── research_frontier.md      调研原始材料（前沿）
```

### 复现 08 页的对比数据

```bash
cd 第一课-Tokenizer/scripts
python3 gen_token_compare.py   # 需要 tiktoken + transformers/tokenizers, 联网下载分词器文件
```
产出 `assets/token_data.{json,js}`。GPT 系走 tiktoken（gpt2/cl100k/o200k），Qwen/DeepSeek/LLaMA 走 HuggingFace 公共非门禁仓库，BERT/T5 作为 WordPiece/Unigram 对照。

### 内容主线

> 词（word）→ 字符（char）→ 词片（subword：BPE/WordPiece/Unigram）→ 字节（byte-level BPE）→ 动态字节块（frontier）

每一步都在解决上一步的痛点。核心回答：**主流生成式大模型（GPT/Qwen/DeepSeek）今天基本都用同一套「字节级 BPE」**，差异只在词表大小与预切分规则；Kimi K2 亦然（k1/k1.5 闭源未公开）。

### 调研与准确性

三个方向（历史算法 / 主流模型实测 / 前沿趋势）分别由独立 agent 调研核对，一手来源（arXiv/ACL/IEEE/官方技术报告/代码仓库）汇总在 `references.html`。存疑处已在正文与参考页显式标注，不臆造。

### 待办 / 可迭代方向

- [x] 用真实 tiktoken/HF tokenizer 跑"同一句话在各模型下切成几个 token"的对比条形图 → **已完成，见 08 页**
- [ ] 加中文语料的 BPE 训练 demo（展示为什么中文需要大词表）
- [ ] BLT 熵分块的动画示意
- [ ] glitch token 的可点击案例展示
