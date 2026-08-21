# 第二课 · 位置编码 —— 课内笔记（NOTES）

> 本文件放本课目录下，记录事实核对结果、踩坑、待办。不写中央开发日志。

## 一手来源核对结果（已用 WebSearch/WebFetch 核对）

| 方法 | 论文 / 出处 | 作者 · 年 | arXiv |
|------|-------------|-----------|-------|
| Sinusoidal 绝对编码 | Attention Is All You Need | Vaswani et al. 2017 | 1706.03762 |
| Learned absolute | BERT | Devlin et al. 2018/2019 | 1810.04805 |
| Learned absolute | GPT-2（learned pos emb） | Radford et al. 2019 | OpenAI PDF |
| Learned absolute | ViT | Dosovitskiy et al. 2020 | 2010.11929 |
| Relative（相对位置表示） | Self-Attention with Relative Position Representations | Shaw et al. 2018 | 1803.02155 |
| Relative（相对+段递归） | Transformer-XL | Dai et al. 2019 | 1901.02860 |
| Relative（解耦注意力） | DeBERTa | He et al. 2020 | 2006.03654 |
| T5 相对位置偏置 | Exploring the Limits of Transfer Learning (T5) | Raffel et al. 2019/2020 | 1910.10683 |
| RoPE 旋转位置编码 | RoFormer | Su et al. 2021 | 2104.09864 |
| ALiBi | Train Short, Test Long (ALiBi) | Press et al. 2021 | 2108.12409 |
| NoPE | The Impact of Positional Encoding on Length Generalization | Kazemnejad et al. 2023 | 2305.19466 |
| 位置插值 PI | Extending Context Window of LLMs via Positional Interpolation | Chen et al. 2023 | 2306.15595 |
| NTK-aware / Dynamic-NTK | 社区起源（reddit u/bloc97；Dynamic 版 u/emozilla；PI 早期社区 kaiokendev）**非正式论文**，后被 transformers v4.31 收录 | 2023 | 无正式论文 |
| YaRN | YaRN: Efficient Context Window Extension | Peng, Quesnelle, Fan, Shippole 2023 | 2309.00071 |
| LongRoPE | LongRoPE: Extending LLM Context Window Beyond 2M Tokens | Ding, L.L.Zhang et al.（Microsoft）ICML 2024，用于 Phi-3 | 2402.13753 |

## 模型采用（已核对，存疑标注）

- **RoPE**：LLaMA 全系、Qwen 全系、DeepSeek（V2/V3 用 MLA + **decoupled RoPE** 解耦旋转，arXiv:2405.04434）、ChatGLM/GLM（2D RoPE）、Mistral/Mixtral、Gemma、Falcon（RoFalcon 团队实测 RoPE 优于 ALiBi，故选 RoPE）、GPT-NeoX、PaLM。→ **今天开源大模型绝对主流**。
- **ALiBi**：BLOOM(176B)、MPT(MosaicML)、Replit、部分 Cerebras-GPT、MosaicBERT。**Falcon 不是 ALiBi，是 RoPE**（早期文档常误传，已纠正）。
- **Learned absolute**：BERT / RoBERTa / GPT-1 / GPT-2 / GPT-3 / 原始 ViT。
- **Sinusoidal**：原始 Transformer；后被 learned / RoPE 取代。
- **T5 bias**：T5 / mT5。
- **Relative（Shaw 式 / XL 式 / DeBERTa 解耦）**：Transformer-XL、XLNet、DeBERTa、Music Transformer。

## 待办 / 踩坑
- （建设中）demo JS 需本地静态服务验证：`python3 -m http.server` 后浏览器打开。
