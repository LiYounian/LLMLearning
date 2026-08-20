/* ===== 交互式 BPE 训练可视化器 ===== */
/* 挂载点：<div id="bpe-demo"></div>  调用 initBPEDemo("bpe-demo") */

function initBPEDemo(mountId){
  const root = document.getElementById(mountId);
  if(!root) return;

  // 玩具语料：词 -> 出现次数（经典 BPE 教学例子）
  let corpus = {"low":5,"lower":2,"newest":6,"widest":3};
  let merges = [];      // 学到的合并规则 [ [a,b], ... ]
  let words = {};       // 当前每个词的符号序列
  let step = 0;
  const END = "·";      // 词尾标记（可视化用），代替 </w>

  function reset(){
    merges = []; step = 0; words = {};
    for(const w in corpus){
      words[w] = w.split("").concat([END]);
    }
    render();
  }

  // 统计相邻符号对频次
  function pairStats(){
    const stats = {};
    for(const w in corpus){
      const seq = words[w], f = corpus[w];
      for(let i=0;i<seq.length-1;i++){
        const key = seq[i]+" "+seq[i+1];
        stats[key] = (stats[key]||0)+f;
      }
    }
    return stats;
  }

  function bestPair(stats){
    let best=null,bestC=-1;
    for(const k in stats){ if(stats[k]>bestC){bestC=stats[k];best=k;} }
    return best?{pair:best,count:bestC}:null;
  }

  function doMerge(){
    const stats = pairStats();
    const b = bestPair(stats);
    if(!b || b.count<2) return null;      // 频次<2 不再合并
    const [a,c] = b.pair.split(" ");
    const merged = a+c;
    for(const w in words){
      const seq = words[w], out=[];
      for(let i=0;i<seq.length;i++){
        if(i<seq.length-1 && seq[i]===a && seq[i+1]===c){ out.push(merged); i++; }
        else out.push(seq[i]);
      }
      words[w]=out;
    }
    merges.push([a,c,b.count]);
    step++;
    return b;
  }

  function tokColor(t){
    if(t===END) return "border-color:#6b7684;color:#6b7684";
    if(t.length===1) return "border-color:#2a3140;color:#e6edf3";
    if(t.length===2) return "border-color:#274b73;color:#58a6ff;background:rgba(88,166,255,.08)";
    if(t.length===3) return "border-color:#2b5b3a;color:#7ee787;background:rgba(126,231,135,.08)";
    return "border-color:#6b4a24;color:#ffa657;background:rgba(255,166,87,.08)";
  }

  function render(){
    const stats = pairStats();
    const b = bestPair(stats);
    const willMerge = b && b.count>=2;

    // 词的当前切分
    let wordsHtml = "";
    for(const w in corpus){
      const seq = words[w];
      const toks = seq.map(t=>{
        const disp = t===END ? "◻" : t;
        const hi = (willMerge && (t===b.pair.split(" ")[0])) ? "" : "";
        return `<span class="tok" style="${tokColor(t)}">${disp}</span>`;
      }).join("");
      wordsHtml += `<div style="margin:6px 0"><span style="color:var(--fg-faint);font-family:var(--mono);font-size:13px;display:inline-block;width:120px">${w} <span style="color:var(--accent3)">×${corpus[w]}</span></span> ${toks}</div>`;
    }

    // pair 频次表（top 6）
    const sorted = Object.entries(stats).sort((a,c)=>c[1]-a[1]).slice(0,6);
    let statHtml = sorted.map(([k,v])=>{
      const isBest = b && k===b.pair;
      const [x,y]=k.split(" ");
      return `<span class="tok" style="${isBest?'border-color:var(--accent2);color:var(--accent2);background:rgba(126,231,135,.12);font-weight:700':'border-color:var(--border);color:var(--fg-dim)'}">${x===END?'◻':x}+${y===END?'◻':y} : ${v}</span>`;
    }).join(" ");

    // 已学合并规则
    let mergeHtml = merges.length
      ? merges.map((m,i)=>`<span class="tok" style="${tokColor(m[0]+m[1])};font-size:13px">${i+1}. ${m[0]}+${m[1]}→<b>${m[0]+m[1]}</b></span>`).join(" ")
      : `<span style="color:var(--fg-faint)">（还没有学到任何合并规则）</span>`;

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div><b style="font-size:17px">🔧 BPE 训练可视化</b> <span style="color:var(--fg-faint);font-family:var(--mono);font-size:13px">第 ${step} 次合并</span></div>
        <div>
          <button class="btn" id="bpe-step" ${willMerge?'':'disabled'}>▶ 合并最高频的一对</button>
          <button class="btn ghost" id="bpe-reset">↺ 重置</button>
        </div>
      </div>

      <div style="color:var(--fg-dim);font-size:14px;margin-bottom:6px">① 当前每个词的切分（◻ = 词尾标记）</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px">${wordsHtml}</div>

      <div style="color:var(--fg-dim);font-size:14px;margin-bottom:6px">② 统计所有相邻符号对的频次（<span style="color:var(--accent2)">绿色 = 当前最高频，将被合并</span>）</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px">${statHtml||'<span style="color:var(--fg-faint)">无</span>'}</div>

      <div style="color:var(--fg-dim);font-size:14px;margin-bottom:6px">③ 学到的合并规则（有序，推理时按此顺序应用）</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:12px 14px">${mergeHtml}</div>

      ${!willMerge && step>0 ? '<div class="note g" style="margin:14px 0 0">✅ 没有频次 ≥2 的符号对了，训练停止。此时 vocab = 初始字符 + 所有合并产物。</div>':''}
      ${!willMerge && step===0 ? '':''}
    `;
    document.getElementById("bpe-step").onclick = ()=>{ doMerge(); render(); };
    document.getElementById("bpe-reset").onclick = reset;
  }

  reset();
}

/* ===== 实时分词器（演示"合并规则如何切分新词"）===== */
function initApplyDemo(mountId){
  const root = document.getElementById(mountId);
  if(!root) return;
  // 预置一套从上面语料学出来的合并规则（按顺序）
  const MERGES = [["e","s"],["es","t"],["est","·"],["l","o"],["lo","w"],["n","e"],["ne","w"],["new","est·"],["w","i"],["wi","d"],["wid","est·"]];
  function tokenize(word){
    let seq = word.split("").concat(["·"]);
    const trace=[seq.slice()];
    for(const [a,b] of MERGES){
      let changed=false, out=[];
      for(let i=0;i<seq.length;i++){
        if(i<seq.length-1 && seq[i]===a && seq[i+1]===b){out.push(a+b);i++;changed=true;}
        else out.push(seq[i]);
      }
      seq=out;
      if(changed) trace.push(seq.slice());
    }
    return {seq,trace};
  }
  function draw(word){
    const {seq}=tokenize(word);
    const toks = seq.map(t=>`<span class="tok" style="border-color:#274b73;color:#58a6ff;background:rgba(88,166,255,.08)">${t.replace('·','◻')}</span>`).join("");
    document.getElementById(mountId+"-out").innerHTML =
      `<div style="margin-top:10px"><span style="color:var(--fg-dim)">切分结果（${seq.length} 个 token）：</span><br>${toks}</div>`;
  }
  root.innerHTML=`
    <b style="font-size:17px">✂️ 用学到的规则切分新词</b>
    <div style="color:var(--fg-dim);font-size:14px;margin:8px 0">规则来自上面 low/lower/newest/widest 语料。试试 <code>newest</code> / <code>lowest</code> / <code>widest</code>：</div>
    <input id="${mountId}-in" value="lowest" spellcheck="false"
      style="font-family:var(--mono);font-size:15px;background:#0b0f16;border:1px solid var(--border);color:var(--fg);padding:9px 12px;border-radius:9px;width:220px">
    <div id="${mountId}-out"></div>`;
  const inp=document.getElementById(mountId+"-in");
  inp.oninput=()=>draw(inp.value.trim().toLowerCase());
  draw("lowest");
}
