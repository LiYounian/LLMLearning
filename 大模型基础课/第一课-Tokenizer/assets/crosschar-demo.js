/* ===== “token 跨字符边界”实证可视化 =====
   读 window.QWEN_PIPE 里的样本(默认韩语 토크나이저), 用真实 Qwen 分词器数据，
   把“前一个字的尾字节 + 后一个字的头字节被合成同一个 token”的现象直接画出来并高亮。
   挂载 <div id="crosschar"></div>，调用 initCrossChar("crosschar","kr") */
function initCrossChar(mountId, sampleIds){
  const root=document.getElementById(mountId);
  if(!root) return;
  const D=window.QWEN_PIPE;
  if(!D){ root.innerHTML='<div class="note o">未加载 qwen_pipeline.js</div>'; return; }
  const ids = (sampleIds && sampleIds.length) ? sampleIds : ["zh","kr"];
  let curId = ids[0];
  const PAL=["#58a6ff","#7ee787","#ffa657","#d2a8ff","#ff9edb","#56d4bc","#f2cc60","#79c0ff","#e3b341","#bc8cff"];
  const col=i=>PAL[i%PAL.length];

  function draw(){
  const s=D.samples.find(x=>x.id===curId) || D.samples[0];

  // 字符边界字节位置
  const bset=new Set(); s.chars.forEach(c=>{bset.add(c.bs);bset.add(c.be);});
  const charAtStart=p=>s.chars.find(c=>c.bs<=p&&p<c.be);
  const charAtEnd  =p=>s.chars.find(c=>c.bs<p&&p<=c.be);

  // 标出跨界 token（起点在某字内部、终点在另一字内部）
  const cross={};   // token index -> {a,b}
  s.tokens.forEach((t,i)=>{
    const sm=!bset.has(t.bs), em=!bset.has(t.be);
    if(sm&&em){ const a=charAtStart(t.bs), b=charAtEnd(t.be); if(a&&b&&a.c!==b.c) cross[i]={a:a.c,b:b.c}; }
  });

  // 每个字节属于第几个 token
  const owner=new Array(s.n_bytes).fill(-1);
  s.tokens.forEach((t,i)=>{ for(let k=t.bs;k<t.be;k++) owner[k]=i; });

  // 行1：字符（按字节宽度排布，标字节范围）
  const charRow=s.chars.map(c=>`
    <div style="display:inline-flex;flex-direction:column;align-items:center;border:1px dashed var(--border);border-radius:8px;padding:6px 10px;margin:2px">
      <span style="font-size:20px">${c.c}</span>
      <span style="font-family:var(--mono);font-size:10px;color:var(--fg-faint)">字节 ${c.bs}–${c.be}</span>
    </div>`).join("");

  // 行2：字节（着色=所属token；跨界token的字节加红色粗框）
  let byteRow="";
  s.bytes.forEach((b,k)=>{
    const ti=owner[k], c=col(ti), isCross=cross[ti];
    const boundary = bset.has(k) && k!==0 ? "margin-left:12px;" : "";
    const box = isCross ? "border:2px solid var(--danger);box-shadow:0 0 0 2px rgba(255,123,114,.25);" : `border:1px solid ${c}66;`;
    byteRow+=`<span style="${boundary}display:inline-flex;flex-direction:column;align-items:center;border-radius:6px;padding:4px 6px;background:${c}1a;${box}">
      <span style="font-family:var(--mono);font-size:12px;color:${isCross?'var(--danger)':c}">${b.hex}</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--fg-faint)">#${ti}</span>
    </span>`;
  });

  // 行3：token（跨界的红框 + 说明）
  const tokRow=s.tokens.map((t,i)=>{
    const c=col(i), isCross=cross[i];
    const label = t.frag ? '<span style="color:var(--danger)">▪碎片</span>' : `<b>${t.text}</b>`;
    const cap = isCross ? `<span style="font-family:var(--mono);font-size:10px;color:var(--danger)">${cross[i].a}尾+${cross[i].b}头</span>` : `<span style="font-family:var(--mono);font-size:10px;color:var(--fg-faint)">字节${t.bs}–${t.be}</span>`;
    const box = isCross ? "border:2px solid var(--danger);background:rgba(255,123,114,.12);" : `border:1.5px solid ${c};background:${c}1a;`;
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;border-radius:9px;padding:6px 10px;${box}">
      <span style="font-family:var(--mono);font-size:14px;color:${isCross?'var(--danger)':c}">${label}</span>${cap}</span>`;
  }).join('<span style="color:var(--fg-faint);align-self:center">·</span>');

  const crossList=Object.values(cross);
  const isZh = /[一-鿿]/.test(s.text);
  const verdict = crossList.length
    ? `<div class="note o" style="margin:14px 0 0"><div class="t">✅ 实证命中：确实出现了跨字符边界的 token</div>
        用真实 Qwen 分词器，「${s.text}」里有 <b>${crossList.length}</b> 个 token 恰好是「前一个字的尾字节 + 后一个字的头字节」——例如红框那个 token = <b style="color:var(--danger)">${crossList[0].a} 的尾字节 + ${crossList[0].b} 的头字节</b>，不含任何一个完整字符。这正是你问的现象。</div>`
    : `<div class="note g" style="margin:14px 0 0"><div class="t">✅ 全部边界对齐，${isZh?'中文里没有跨界 token':'此样本没有跨界 token'}</div>
        ${isZh?'每个 token 要么是一个完整汉字、要么是几个完整汉字合成的词——<b>没有任何 token 卡在两个字中间</b>。因为中文语料多，分词器先把每个汉字的 3 字节合成"整字 token"，字节被整字吃掉了，轮不到跨界合并。（6 分词器×7 中文样本实测全 0，脚本 <code>probe_zh_crosschar.py</code>）':'所有 token 都在字符边界上。'}
        想看它<b>真的发生</b>？点上面切到「韩语」。</div>`;

  const picker = ids.map(id=>{
    const ss=D.samples.find(x=>x.id===id); if(!ss) return "";
    const lab = /[一-鿿]/.test(ss.text) ? "中文" : (/[가-힣]/.test(ss.text)?"韩语":ss.label);
    return `<button class="btn ${id===curId?'':'ghost'}" data-cc="${id}" style="margin:3px">${lab}：${ss.text}</button>`;
  }).join("");

  root.innerHTML=`
    <div style="margin-bottom:10px">${picker}</div>
    <div class="pc-meta">真实 Qwen2.5 分词器 · 输入「<b>${s.text}</b>」· ${s.n_chars} 字符 → ${s.n_bytes} 字节 → <b>${s.n_tokens}</b> token（<span style="color:var(--danger)">红框 = 跨字符边界的 token</span>）</div>
    <div class="pc-step"><span class="pc-n">1</span> 字符（虚线框=一个字，标出它占的字节范围）</div>
    <div class="pc-row">${charRow}</div>
    <div class="pc-step"><span class="pc-n">2</span> UTF-8 字节（#=所属 token 序号；<b style="color:var(--danger)">红粗框</b>的字节属于跨界 token）</div>
    <div class="pc-row">${byteRow}</div>
    <div class="pc-step"><span class="pc-n">3</span> token（${crossList.length?'<b style="color:var(--danger)">红框那个</b>就是"前字尾+后字头"':'全部落在字符边界上'}）</div>
    <div class="pc-row">${tokRow}</div>
    ${verdict}
  `;
  root.querySelectorAll("[data-cc]").forEach(b=>b.onclick=()=>{curId=b.dataset.cc;draw();});
  }
  draw();
}
