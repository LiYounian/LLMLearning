# 大模型演进路线（8 家调研）

把飞书文档《主流大模型发展脉络（8 家）》转制成可交叉导航的 HTML 知识图谱站。纯静态，浏览器直接打开 `index.html` 即可。

## 目录结构

```
大模型演进路线/
├── index.html                 索引首页（按公司 / 按主题 双入口 + 四条主线）
├── timeline.html              跨家族可交互时间线（按主题筛选：MoE/推理/长上下文…）
├── tech.html                  技术脉络 T1–T8（架构/MoE/对齐/推理/长上下文/多模态/Agentic/效率）
├── metrics.html               指标脉络（评测三次迁移 + MMLU/GPQA/SWE-bench 爬升图）
├── data.html                  数据规模脉络（预训练 token 量 log 增长图 + 明细表）
├── references.html            关键一手来源汇总 + 空白与不确定
├── 01-openai-gpt.html         OpenAI GPT
├── 02-anthropic-claude.html   Anthropic Claude
├── 03-google-gemini.html      Google Gemini
├── 04-meta-llama.html         Meta Llama
├── 05-alibaba-qwen.html       阿里 Qwen
├── 06-deepseek.html           DeepSeek
├── 07-moonshot-kimi.html      月之暗面 Kimi
├── 08-bytedance-doubao.html   字节 豆包 (Seed)
└── assets/
    ├── style.css              暗色主题 + 8 家品牌色
    └── timeline.js            交互时间线数据与渲染
```

## 打开方式

```bash
open 大模型演进路线/index.html
```

含交互/图表的页面（timeline / metrics / data）建议用本地静态服务打开以确保 JS 正常：

```bash
cd 大模型演进路线 && python3 -m http.server 8792
# 浏览器访问 http://localhost:8792/index.html
```

## 核心叙事（四条主线）

- **架构**：Dense → MoE 稀疏化 → 稀疏注意力
- **能力**：答题 → 对齐对话 → 多模态 → 推理(RL) → Agentic 自主
- **规模**：拼参数/数据 → 拼推理算力(test-time) → 拼真实任务交付
- **开放度**：早期开源 → GPT-4 起闭源潮 → 2025–26 开放权重强势回归

## 制作方式与准确性

8 家详情页由 8 个并行 agent 分别读取对应飞书子文档 + 核对/补齐一手来源（arXiv、官方博客、HF 模型卡、GitHub）产出；专题页由主文档汇总。闭源旗舰的参数/数据一律标"官方未公开"，传闻数字不采信，跑分标注口径与自评。调研日期 2026-08。

## 待迭代（v2）

- 时间线支持"按公司泳道"视图切换
- 各技术点（MLA/GRPO/MoE 负载均衡/thinking 三形态）单独深挖页
- 能力爬升图接入更多带来源的锚点数据
