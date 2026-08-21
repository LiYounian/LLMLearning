#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""实证：BBPE 里一个 token 是否会跨越两个不同字符（含前字尾字节 + 后字头字节）。
精确判据：token 起点落在某字符内部(非边界) 且 终点落在【另一个】字符内部(非边界)。"""
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B", trust_remote_code=True)

def bd():
    bs = list(range(ord("!"), ord("~")+1)) + list(range(ord("¡"), ord("¬")+1)) + list(range(ord("®"), ord("ÿ")+1))
    cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256+n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}
BD = bd()

tests = [
    "深度学习模型把文字切成词元再查表变成向量注意力机制让模型关注重要部分",
    "안녕하세요 반갑습니다 오늘 날씨가 좋네요 한국어 토크나이저 테스트",
    "こんにちは世界機械学習ありがとうございます形態素解析",
    "การเรียนรู้เชิงลึกโมเดลภาษาขนาดใหญ่",  # 泰文
    "मशीन लर्निंग बहुत रोचक है",             # 印地文
    "𠮷野家𩸽鲑鳟鳜鳣鳢",                       # 生僻汉字
]

def analyze(t):
    ids = tok.encode(t, add_special_tokens=False)
    pcs = tok.convert_ids_to_tokens(ids)
    full = t.encode("utf-8")
    chars, p = [], 0
    for ch in t:
        L = len(ch.encode("utf-8")); chars.append((ch, p, p+L)); p += L
    def char_at(bytepos, which):  # which='start' 用左闭, 'end' 用右开
        for ch, cb, ce in chars:
            if which == "start" and cb <= bytepos < ce: return (ch, cb, ce)
            if which == "end" and cb < bytepos <= ce: return (ch, cb, ce)
        return None
    boundaries = {cb for _, cb, _ in chars} | {ce for _, _, ce in chars}
    toks, c = [], 0
    for pc in pcs:
        raw = bytes(BD[x] for x in pc); toks.append((pc, c, c+len(raw))); c += len(raw)
    cross = []
    for pc, bs, be in toks:
        if bs in boundaries and be in boundaries:
            continue  # 边界对齐（含"整字/多整字"token），跳过
        cs_ = char_at(bs, "start"); ce_ = char_at(be, "end")
        if cs_ and ce_ and cs_[0] != ce_[0]:      # 起点在A内部、终点在B内部、A≠B
            spanned = [ch for ch, cb, cce in chars if cb < be and cce > bs]
            cross.append((pc, bs, be, ''.join(spanned)))
    return len(chars), len(full), len(ids), cross

for t in tests:
    nc, nb, nt, cross = analyze(t)
    print(f"\n输入({nc}字/{nb}字节/{nt}token): {t[:20]}...")
    if cross:
        for pc, bs, be, sp in cross:
            print(f"   ★真·跨界 token piece={pc!r} bytes[{bs}:{be}] 跨字符={sp!r}（=前字尾字节+后字头字节）")
    else:
        print("   （无：所有 token 要么边界对齐，要么只切在单个字符内部）")
