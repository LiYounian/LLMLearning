# LLMLearning

用一系列**可交互 HTML 网页**系统学习大模型的基础理论。每一课独立成一个中文命名的文件夹，配索引目录 + 分节详解 + 可交互 demo + 参考文献（一手来源可点击溯源）。

## 课程列表

| 课 | 主题 | 目录 | 状态 |
|---|---|---|---|
| 第一课 | **Tokenizer 的工作原理** | [`大模型基础课/第一课-Tokenizer/`](大模型基础课/第一课-Tokenizer/) | v1 |

## 快速开始

纯静态网页，无需起服务，直接用浏览器打开首页即可：

```bash
open 大模型基础课/第一课-Tokenizer/index.html
```

带交互动画的页面（03 BPE、05 字节级）建议用本地静态服务打开以确保 JS 正常：

```bash
cd 大模型基础课/第一课-Tokenizer && python3 -m http.server 8791
# 浏览器访问 http://localhost:8791/index.html
```

## 第一课主线

> 词（word）→ 字符（char）→ 词片（subword：BPE/WordPiece/Unigram）→ 字节（byte-level BPE）→ 动态字节块（frontier）

核心结论：主流生成式大模型（GPT / Qwen / DeepSeek / Kimi K2）今天基本都用同一套 **字节级 BPE**，差异只在词表大小与预切分规则。详见 [第一课 README](大模型基础课/README.md)。
