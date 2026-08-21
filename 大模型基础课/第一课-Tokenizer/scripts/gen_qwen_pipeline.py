#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用【真实 Qwen 分词器】把一组示例文本走完整流水线，导出对齐数据供网页做分步可视化：
  文字 → UTF-8 字节 → 字节级 BPE 合并成 token（每个 token 覆盖哪些字节）→ token ID
关键：切割发生在【字节编码层】，不是字符层。一个汉字(3字节)可能和相邻字并进一个 token，
也可能被拆成多个字节碎片 token。导出的数据让网页把"同一 token 覆盖的字节块"上同色。

产出：assets/qwen_pipeline.json 和 assets/qwen_pipeline.js (window.QWEN_PIPE=...)
依赖：transformers + tokenizers，联网下载 Qwen/Qwen2.5-7B 的 tokenizer 文件(非权重)。
"""
import json

REPO = "Qwen/Qwen2.5-7B"

SAMPLES = [
    {"id": "zh",    "label": "中文（深度学习）", "text": "深度学习模型"},
    {"id": "en",    "label": "英文子词",         "text": "tokenization"},
    {"id": "mix",   "label": "中英数字混合",     "text": "GPT-4o 有 128k 上下文"},
    {"id": "zhp",   "label": "中文带标点",       "text": "你好，世界！"},
    {"id": "emoji", "label": "重音字母 + emoji", "text": "café 🚀"},
]


# gpt2/Qwen 通用的 byte<->unicode 逆映射：把 token 里的“伪字符”还原成原始字节
def _byte_decoder():
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(ord("¡"), ord("¬") + 1)) + list(range(ord("®"), ord("ÿ") + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}

BD = _byte_decoder()


def decode_bytes(raw: bytes):
    try:
        return raw.decode("utf-8"), False           # 完整可读
    except UnicodeDecodeError:
        return raw.decode("utf-8", "replace"), True  # 字节碎片


def build(tok, text):
    ids = tok.encode(text, add_special_tokens=False)
    pieces = tok.convert_ids_to_tokens(ids)

    # 全量 UTF-8 字节流
    full = text.encode("utf-8")

    # 每个字符占哪些字节（用于最上面一行"字符"对齐显示）
    chars, pos = [], 0
    for ch in text:
        blen = len(ch.encode("utf-8"))
        chars.append({"c": ch, "bs": pos, "be": pos + blen})
        pos += blen

    # 每个 token 还原成字节 → 计算它覆盖的字节区间 [bs, be)
    tokens, cur = [], 0
    byte_owner = [None] * len(full)   # 每个字节属于第几个 token
    for i, (tid, pc) in enumerate(zip(ids, pieces)):
        raw = bytes(BD[c] for c in pc)
        disp, frag = decode_bytes(raw)
        bs, be = cur, cur + len(raw)
        for j in range(bs, be):
            if j < len(full):
                byte_owner[j] = i
        tokens.append({
            "id": tid, "piece": pc, "text": disp, "frag": frag,
            "bs": bs, "be": be, "n": len(raw),
        })
        cur = be

    # 一致性校验：所有 token 的字节拼起来应当 == 原文 UTF-8
    rebuilt = b"".join(bytes(BD[c] for c in pc) for pc in pieces)
    assert rebuilt == full, f"字节重建不一致: {text!r}"

    bytes_arr = [{"v": b, "hex": f"{b:02X}", "tok": byte_owner[k]} for k, b in enumerate(full)]
    return {"chars": chars, "bytes": bytes_arr, "tokens": tokens,
            "n_chars": len(chars), "n_bytes": len(full), "n_tokens": len(tokens)}


def main():
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(REPO, trust_remote_code=True)
    out = {"model": "Qwen2.5", "repo": REPO, "vocab": tok.vocab_size, "samples": []}
    for s in SAMPLES:
        data = build(tok, s["text"])
        data.update({"id": s["id"], "label": s["label"], "text": s["text"]})
        out["samples"].append(data)
        print(f"[ok] {s['id']:6s} {s['text']!r} -> {data['n_chars']}字符 / {data['n_bytes']}字节 / {data['n_tokens']}token")

    base = __file__.rsplit("/", 1)[0] + "/../assets/qwen_pipeline"
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(base + ".js", "w", encoding="utf-8") as f:
        f.write("window.QWEN_PIPE = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print("wrote", base + ".{json,js}")


if __name__ == "__main__":
    main()
