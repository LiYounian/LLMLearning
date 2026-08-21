# 大模型基础课

用一系列**可交互 HTML 网页**讲清楚大模型的基础理论。每一课独立成一个文件夹，配索引目录 + 分节详解 + 可交互 demo + 参考文献。

## 课程列表

| 课 | 主题 | 目录 | 状态 |
|---|---|---|---|
| 第一课 | **Tokenizer 的工作原理** | `第一课-Tokenizer/` | v3（时间线重构版） |

## 第一课 · Tokenizer

打开 `第一课-Tokenizer/index.html` 即可（纯静态，双击浏览器打开，无需起服务）。首页是**按发布时间线排序的方法目录**，点任一方法进入详解页；每个方法页都标注了"被哪些主流大模型使用"。

### 目录结构（以"方法"为中心，文件名即时间线顺序）

```
第一课-Tokenizer/
├── index.html                    索引首页 —— 方法时间线（9 个方法节点，可点击）+ 三入口
├── why.html                      为什么需要分词（动机 + 权衡曲面）
│  —— 方法详解（按发布时间线，每页含：出身/算法/例子/权衡/被哪些模型使用）——
├── m1-word.html                  词级分词 word-level（2013）
├── m2-char.html                  字符级分词 character-level（2015）
├── m3-bpe.html                   BPE 字节对编码（1994/2016）—— 含【训练动画 + 切词 demo + Qwen 真实流水线着色可视化】
├── m4-wordpiece.html             WordPiece（2012/2018，似然增益合并）
├── m5-unigram.html               Unigram 语言模型分词（2018，EM 剪枝）
├── m6-sentencepiece.html         SentencePiece 框架（2018，▁ 语言无关可逆）
├── m7-bbpe.html                  字节级 BPE / BBPE（2019 GPT-2）—— 含【UTF-8 字节可视化】
├── m8-tiktoken.html              tiktoken 与大词表时代（2022–2024）
├── m9-frontier.html              前沿：tokenizer-free / 动态分块（BLT/H-Net/ByT5…）
│  —— 速查与实测 ——
├── models.html                   模型×方法矩阵：方法→模型 交叉索引 + 模型→方法 总表 + 词表趋势
├── compare.html                  切词对比 —— 含【真实分词器 token 数条形图 + 实际切分】
├── references.html               参考文献与来源（35 条，可点击溯源）
├── scripts/
│   ├── gen_token_compare.py      用真实分词器(tiktoken+HF)跑 token 数, 生成 token_data.{json,js}
│   └── gen_qwen_pipeline.py      用真实 Qwen2.5 分词器跑"文字→字节→token"对齐数据, 生成 qwen_pipeline.{json,js}
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

### 复现 compare 页的对比数据

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

- [x] 用真实 tiktoken/HF tokenizer 跑"同一句话在各模型下切成几个 token"的对比条形图 → **已完成，见 compare 页**
- [x] 以方法为中心、按发布时间线重构目录，每个方法可点进详解并标注使用模型 → **v3 完成**
- [x] m3-bpe 加真实 Qwen 分词流水线着色可视化（文字→字节→切割）
- [x] 中文语料的字节级 BPE 训练 demo（m7-bbpe，展示为什么中文需要大词表）
- [x] BLT 熵分块的交互动画示意（m9-frontier，阈值滑块）
- [x] glitch token 的可点击案例画廊（m9-frontier，真实 tiktoken ID）
- [x] 实测并讲解"token 跨字符边界"现象（m7-bbpe，Qwen 韩/印地语实例，脚本 probe_crosschar.py）
