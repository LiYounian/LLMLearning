#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""跨多个分词器找【中文】的跨字符边界 token（前字尾字节 + 后字头字节 合成一个 token）。"""
import tiktoken
from transformers import AutoTokenizer

def bd():
    bs=list(range(ord("!"),ord("~")+1))+list(range(ord("¡"),ord("¬")+1))+list(range(ord("®"),ord("ÿ")+1))
    cs=bs[:]; n=0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256+n); n+=1
    return {chr(c):b for b,c in zip(bs,cs)}
BD=bd()

ZH = [
 "深度学习模型把文字切成一个个词元",
 "人工智能大语言模型的训练与推理",
 "北京上海广州深圳杭州成都武汉",
 "鲑鳟鳜鳣鳢鲇鲡鳗鲟鲨",          # 生僻鱼字
 "囍囧兲氼玍恏㙓䶮龘靐齉",          # 生僻/网络字
 "沆瀣一气魑魅魍魉饕餮",
 "他说：“今天天气真好，我们去公园吧！”",
]

def spans_tiktoken(enc, text):
    ids=enc.encode(text)
    toks=[]; c=0
    for i in ids:
        raw=enc.decode_single_token_bytes(i); toks.append((raw,c,c+len(raw))); c+=len(raw)
    return toks

def spans_hf(tok, text):
    ids=tok.encode(text, add_special_tokens=False)
    pcs=tok.convert_ids_to_tokens(ids)
    toks=[]; c=0
    for pc in pcs:
        raw=bytes(BD[x] for x in pc); toks.append((raw,c,c+len(raw))); c+=len(raw)
    return toks

def check(name, spans_fn, text):
    full=text.encode("utf-8")
    chars=[]; p=0
    for ch in text:
        L=len(ch.encode("utf-8")); chars.append((ch,p,p+L)); p+=L
    bset={cb for _,cb,_ in chars}|{ce for _,_,ce in chars}
    toks=spans_fn(text)
    hits=[]
    for raw,bs,be in toks:
        sm=bs not in bset; em=be not in bset
        if sm and em:
            a=[ch for ch,cb,ce in chars if cb<=bs<ce]
            b=[ch for ch,cb,ce in chars if cb<be<=ce]
            if a and b and a[0]!=b[0]:
                hits.append((bs,be,a[0],b[0]))
    return hits

TT={n:tiktoken.get_encoding(n) for n in ["gpt2","cl100k_base","o200k_base"]}
HF={}
for key,repo in [("Qwen2.5","Qwen/Qwen2.5-7B"),("DeepSeek-V3","deepseek-ai/DeepSeek-V3"),("LLaMA-3","NousResearch/Meta-Llama-3-8B")]:
    try: HF[key]=AutoTokenizer.from_pretrained(repo, trust_remote_code=True)
    except Exception as e: print("skip",key,e)

for text in ZH:
    print(f"\n=== {text} ===")
    for n,enc in TT.items():
        h=check(n, lambda t: spans_tiktoken(enc,t), text)
        if h: print(f"  [{n}] 跨界: "+", ".join(f"{a}尾+{b}头(bytes{bs}:{be})" for bs,be,a,b in h))
    for n,tok in HF.items():
        h=check(n, lambda t: spans_hf(tok,t), text)
        if h: print(f"  [{n}] 跨界: "+", ".join(f"{a}尾+{b}头(bytes{bs}:{be})" for bs,be,a,b in h))
    # 若整行都无命中
    print("  (若上面无输出=该行所有分词器均无中文跨字符 token)")
