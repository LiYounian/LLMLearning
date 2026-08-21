#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 glitch token 画廊的真实数据：这些字符串在 GPT-2/GPT-3 的 5 万词表(gpt2/r50k)里
是【单个 token】，但在模型训练语料里几乎没出现，embedding 欠训练 → 触发异常行为。
用真实 tiktoken 核对它们的 token ID，并对比在 cl100k(GPT-4) 里是否还是单 token。"""
import json
import tiktoken

gpt2 = tiktoken.get_encoding("gpt2")
cl = tiktoken.get_encoding("cl100k_base")

# 经典 glitch token（源自 Rumbelow & Watkins 2023 "SolidGoldMagikarp" 及后续研究）
CANDIDATES = [
    ("SolidGoldMagikarp", "Reddit 用户名 /u/SolidGoldMagikarp，因常被 mention 而进入分词器词表"),
    (" petertodd",        "比特币开发者用户名；被报告会诱发大量诡异/敌意续写"),
    (" davidjl",          "Reddit 用户 davidjl123（爱数格子的账号），高频出现在计数类帖子"),
    (" guiActiveUn",      "游戏 RuneScape 源码里的 UI 变量名，被爬进语料"),
    (" externalToEVA",    "同上，代码标识符类 glitch token"),
    ("rawdownloadcloneembedreportprint", "论坛按钮文本被反复拼接，成了一个超长单 token"),
    (" TheNitrome",       "网站 Nitrome 相关高频串"),
    (" RandomRedditor",   "Reddit 相关用户名片段"),
    ("EStreamFrame",      "代码/日志里的高频标识符"),
    (" SolidGoldMagikarp","带前导空格的版本，与不带空格是不同 token"),
]

rows = []
for s, note in CANDIDATES:
    g = gpt2.encode(s)
    c = cl.encode(s)
    rows.append({
        "s": s,
        "note": note,
        "gpt2_single": len(g) == 1,
        "gpt2_id": g[0] if len(g) == 1 else None,
        "gpt2_ntok": len(g),
        "cl_ntok": len(c),  # 在 GPT-4 词表里通常被拆回多个 token（已“修复”）
    })
    print(f"{s!r:38s} gpt2:{len(g)}tok{'(单)' if len(g)==1 else ''} id={g[0] if len(g)==1 else '-'}  cl100k:{len(c)}tok")

out = {
    "note": "gpt2/r50k = GPT-2/GPT-3 的 5 万词表；cl100k = GPT-4 的约 10 万词表",
    "tokens": rows,
}
base = __file__.rsplit("/", 1)[0] + "/../assets/glitch_data"
with open(base + ".json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
with open(base + ".js", "w", encoding="utf-8") as f:
    f.write("window.GLITCH_DATA = " + json.dumps(out, ensure_ascii=False) + ";\n")
print("wrote", base + ".{json,js}")
