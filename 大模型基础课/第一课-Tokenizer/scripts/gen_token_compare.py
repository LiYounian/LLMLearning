#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用真实分词器对一组代表性文本切词, 统计 token 数并导出实际切分, 生成 token_data.json 供网页读取。
- GPT 系 (gpt2 / cl100k / o200k) 走 tiktoken (自带, 联网下载编码文件)
- Qwen / DeepSeek / LLaMA / BERT / T5 走 HuggingFace tokenizers (下载 tokenizer 文件, 非模型权重)
失败的分词器会被跳过并记录, 不中断。
"""
import json, sys, traceback

# ---- 代表性样本 (刻意覆盖: 英文 / 中文 / 代码 / 长数字 / emoji 混合) ----
SAMPLES = [
    {"id": "en",    "label": "英文句子",   "text": "The quick brown fox jumps over the lazy dog."},
    {"id": "zh",    "label": "中文句子",   "text": "深度学习模型把文字切成一个个词元，再查表变成向量。"},
    {"id": "code",  "label": "Python 代码","text": "def add(a, b):\n    return a + b  # sum two ints"},
    {"id": "num",   "label": "长数字",     "text": "The year 2025 has 31536000 seconds and pi is 3.14159265."},
    {"id": "emoji", "label": "emoji 混合", "text": "Hi 你好 🚀 GPT-4o costs $5/1M tokens!"},
]

# ---- tiktoken 编码 (GPT 系) ----
TIKTOKEN = [
    {"key": "gpt2",   "name": "GPT-2 / GPT-3", "enc": "gpt2",         "family": "gpt"},
    {"key": "cl100k", "name": "GPT-3.5 / GPT-4","enc": "cl100k_base", "family": "gpt"},
    {"key": "o200k",  "name": "GPT-4o / o 系列","enc": "o200k_base",  "family": "gpt"},
]

# ---- HuggingFace tokenizers (非 GPT, 用非门禁公共仓库) ----
HF = [
    {"key": "qwen25",  "name": "Qwen2.5",      "repo": "Qwen/Qwen2.5-7B",              "family": "qwen"},
    {"key": "deepseek","name": "DeepSeek-V3",  "repo": "deepseek-ai/DeepSeek-V3",      "family": "deepseek"},
    {"key": "llama3",  "name": "LLaMA-3",      "repo": "NousResearch/Meta-Llama-3-8B", "family": "llama"},
    {"key": "bert",    "name": "BERT (WordPiece)", "repo": "bert-base-uncased",        "family": "other"},
    {"key": "t5",      "name": "T5 (Unigram/SP)",  "repo": "t5-base",                  "family": "other"},
]

results = {"samples": SAMPLES, "tokenizers": [], "counts": {}, "segments": {}, "errors": []}


# gpt2 byte<->unicode 映射的逆表 (byte-level BPE 都用这套), 把伪字符还原成原始字节
def _bytes_to_unicode():
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(ord("¡"), ord("¬") + 1)) + list(range(ord("®"), ord("ÿ") + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}

BYTE_DECODER = _bytes_to_unicode()


def piece_from_bytes(raw: bytes):
    """字节 -> (可读文本, 是否是字符碎片)。半个多字节字符会解码失败 -> 标记 frag。"""
    txt = raw.decode("utf-8", "strict") if _ok(raw) else raw.decode("utf-8", "replace")
    frag = "\ufffd" in txt or not _ok(raw)
    return _show_ws(txt), frag

def _ok(raw: bytes) -> bool:
    try:
        raw.decode("utf-8", "strict"); return True
    except Exception:
        return False

def _show_ws(t: str) -> str:
    return t.replace("\n", "\\n").replace("\t", "\\t")


def seg_byte_level_hf(token: str):
    """HF 字节级 BPE 的 token 伪字符 -> 原始字节 -> 可读。"""
    try:
        raw = bytes(BYTE_DECODER[c] for c in token)
        return piece_from_bytes(raw)
    except KeyError:
        return _show_ws(token), False

def seg_tiktoken(enc, tid: int):
    return piece_from_bytes(enc.decode_single_token_bytes(tid))

def seg_sp_or_wp(token: str):
    """SentencePiece(▁) / WordPiece(##) 的可读化。"""
    return _show_ws(token.replace("▁", " ").replace("##", "")), False


def add_tokenizer(meta, n_vocab):
    results["tokenizers"].append({"key": meta["key"], "name": meta["name"],
                                  "family": meta["family"], "vocab": n_vocab})


# ===== tiktoken =====
import tiktoken
for m in TIKTOKEN:
    try:
        enc = tiktoken.get_encoding(m["enc"])
        add_tokenizer(m, enc.n_vocab)
        for s in SAMPLES:
            ids = enc.encode(s["text"])
            results["counts"].setdefault(s["id"], {})[m["key"]] = len(ids)
            segs = [seg_tiktoken(enc, i) for i in ids]
            results["segments"].setdefault(s["id"], {})[m["key"]] = [{"t": t, "f": f} for t, f in segs]
        print(f"[ok ] tiktoken {m['key']:8s} vocab={enc.n_vocab}")
    except Exception as e:
        results["errors"].append(f"tiktoken {m['key']}: {e}")
        print(f"[FAIL] tiktoken {m['key']}: {e}", file=sys.stderr)

# ===== HuggingFace =====
try:
    from transformers import AutoTokenizer
    for m in HF:
        try:
            tok = AutoTokenizer.from_pretrained(m["repo"], trust_remote_code=True)
            add_tokenizer(m, tok.vocab_size)
            byte_level = m["family"] in ("qwen", "deepseek", "llama")
            for s in SAMPLES:
                ids = tok.encode(s["text"], add_special_tokens=False)
                results["counts"].setdefault(s["id"], {})[m["key"]] = len(ids)
                pieces = tok.convert_ids_to_tokens(ids)
                segs = [seg_byte_level_hf(p) if byte_level else seg_sp_or_wp(p) for p in pieces]
                results["segments"].setdefault(s["id"], {})[m["key"]] = [{"t": t, "f": f} for t, f in segs]
            print(f"[ok ] hf {m['key']:8s} vocab={tok.vocab_size}")
        except Exception as e:
            results["errors"].append(f"hf {m['key']}: {type(e).__name__}: {e}")
            print(f"[FAIL] hf {m['key']}: {type(e).__name__}: {e}", file=sys.stderr)
except Exception as e:
    results["errors"].append(f"transformers import: {e}")
    print(f"[FAIL] transformers import: {e}", file=sys.stderr)

base = __file__.rsplit("/", 1)[0] + "/../assets/token_data"
with open(base + ".json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=1)
# 同时导出 JS 变量文件, 让页面用 file:// 双击打开也能读到数据 (绕开 fetch 的 CORS 限制)
with open(base + ".js", "w", encoding="utf-8") as f:
    f.write("window.TOKEN_DATA = " + json.dumps(results, ensure_ascii=False) + ";\n")
print(f"\nwrote {base}.json + {base}.js")
print("tokenizers loaded:", [t["key"] for t in results["tokenizers"]])
print("errors:", len(results["errors"]))
