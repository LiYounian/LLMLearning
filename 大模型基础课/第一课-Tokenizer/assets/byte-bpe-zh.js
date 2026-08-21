/* ===== 中文字节级 BPE 训练器（教学玩具）=====
   在 UTF-8【字节】上跑 BPE，直观展示：一个汉字=3 字节，BPE 要先把字节合成整字、
   再把整字合成词——所以中文要“成词成句”需要很多合并 → 需要更大的词表。
   挂载：<div id="zhbpe"></div>  调用 initZhBpe("zhbpe") */
function initZhBpe(mountId){
  const root = document.getElementById(mountId);
  if(!root) return;
  const ENC = new TextEncoder();
  const tryDecode = (codes)=>{           // codes: 数组(每个 0-255) → 文本 或 null(非完整UTF-8)
    try{ return new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(codes)); }
    catch(e){ return null; }
  };

  // 玩具语料（词:频次）——刻意让“学习/深度/模型”高频，便于看到字节→整字→词
  const CORPUS = {"深度学习":6,"深度":4,"学习":5,"模型":5,"学习模型":3,"深度模型":2};
  const TARGET = "深度学习";             // 追踪这个短语当前被切成几个 token

  let words = [];   // [{sym:[codeStr,...], f}]  codeStr 用 String.fromCharCode 存字节
  let merges = [];  // [[a,b]]
  let step = 0;

  const b2s = (bytes)=>Array.from(bytes).map(b=>String.fromCharCode(b));
  const s2codes = (s)=>Array.from(s).map(c=>c.charCodeAt(0));

  function reset(){
    step=0; merges=[];
    words = Object.entries(CORPUS).map(([w,f])=>({sym:b2s(ENC.encode(w)), f}));
    render();
  }

  function pairStats(){
    const st={};
    for(const {sym,f} of words)
      for(let i=0;i<sym.length-1;i++){ const k=sym[i]+""+sym[i+1]; st[k]=(st[k]||0)+f; }
    return st;
  }
  function best(st){ let b=null,c=-1; for(const k in st) if(st[k]>c){c=st[k];b=k;} return b?{k:b,c}:null; }

  function applyMerge(seq,a,b){
    const out=[]; for(let i=0;i<seq.length;i++){
      if(i<seq.length-1 && seq[i]===a && seq[i+1]===b){ out.push(a+b); i++; } else out.push(seq[i]);
    } return out;
  }
  function doStep(){
    const st=pairStats(), bp=best(st);
    if(!bp || bp.c<2) return false;
    const [a,b]=bp.k.split("");
    for(const w of words) w.sym=applyMerge(w.sym,a,b);
    merges.push([a,b]); step++; return true;
  }

  // 用当前 merges 切 TARGET，返回 symbol 数组
  function segTarget(){
    let seq=b2s(ENC.encode(TARGET));
    for(const [a,b] of merges) seq=applyMerge(seq,a,b);
    return seq;
  }

  function chip(codeStr){
    const codes=s2codes(codeStr), txt=tryDecode(codes);
    if(txt!==null){
      const c = txt.length===1 ? "var(--accent2)" : "var(--accent)";
      return `<span class="tok" style="border-color:${c};color:${c};background:${c}14">${txt}</span>`;
    }
    // 字节碎片
    const hex=codes.map(b=>b.toString(16).padStart(2,"0").toUpperCase()).join(" ");
    return `<span class="tok" style="border-style:dashed;border-color:var(--danger);color:var(--danger)" title="字节碎片 ${hex}">▪${codes.length>1?"×"+codes.length:""}</span>`;
  }

  function render(){
    const st=pairStats(), bp=best(st), can=bp&&bp.c>=2;
    const tgt=segTarget();
    // 目标短语进度
    const tgtChips=tgt.map(chip).join("");
    // 语料展示
    let corpusHtml="";
    for(const {sym,f} of words){
      corpusHtml+=`<div style="margin:4px 0"><span style="color:var(--fg-faint);font-family:var(--mono);font-size:12px">×${f}</span> ${sym.map(chip).join("")}</div>`;
    }
    // 当前最高频对
    let bpHtml="—";
    if(bp){ const [a,b]=bp.k.split(""); bpHtml=`${chip(a)}+${chip(b)} <span style="color:var(--fg-faint)">(频次 ${bp.c})</span>`; }
    // merges
    const mHtml = merges.length? merges.slice(-8).map(([a,b],i)=>chip(a+b)).join(" ") : '<span style="color:var(--fg-faint)">（暂无）</span>';

    root.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div><b>🀄 中文字节级 BPE 训练器</b> <span style="color:var(--fg-faint);font-family:var(--mono);font-size:12px">第 ${step} 次合并 · 词表 = 256 字节 + ${merges.length} 合并</span></div>
        <div><button class="btn" id="zh-step" ${can?'':'disabled'}>▶ 合并最高频字节对</button>
             <button class="btn ghost" id="zh-10" ${can?'':'disabled'}>⏩ 连合并 10 次</button>
             <button class="btn ghost" id="zh-reset">↺ 重置</button></div>
      </div>

      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:14px">
        <div style="color:var(--fg-dim);font-size:13px;margin-bottom:6px">🎯 目标短语「${TARGET}」当前切成 <b style="color:var(--accent3)">${tgt.length}</b> 个 token
          <span style="color:var(--fg-faint)">（起始 12 个字节 token；<span style="color:var(--accent2)">绿=完整单字</span>，<span style="color:var(--accent)">蓝=成词</span>，<span style="color:var(--danger)">红=字节碎片</span>）</span></div>
        <div style="line-height:2">${tgtChips}</div>
      </div>

      <div style="color:var(--fg-dim);font-size:13px;margin-bottom:4px">当前最高频字节对：${bpHtml}</div>
      <div style="color:var(--fg-dim);font-size:13px;margin:10px 0 4px">语料里的词（随合并逐步“长”出整字与整词）：</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:10px 14px">${corpusHtml}</div>
      <div style="color:var(--fg-dim);font-size:13px;margin:10px 0 4px">最近学到的合并（产物）：</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:10px 14px">${mHtml}</div>

      ${!can?'<div class="note g" style="margin:12px 0 0">✅ 没有频次≥2 的字节对了。注意：要让「'+TARGET+'」压到 1–2 个 token，需要相当多的合并——这正是<b>中文/CJK 需要更大词表</b>的直观原因。</div>':''}
    `;
    document.getElementById("zh-step").onclick=()=>{doStep();render();};
    document.getElementById("zh-10").onclick=()=>{for(let i=0;i<10;i++)if(!doStep())break;render();};
    document.getElementById("zh-reset").onclick=reset;
  }
  reset();
}
