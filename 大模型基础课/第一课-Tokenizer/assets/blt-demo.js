/* ===== BLT 熵动态分块（示意动画）=====
   真实 BLT 用一个小型字节级“熵模型”预测下一字节分布的熵；这里用【手工示意熵值】演示机制：
   高熵(难预测,如新词开头) → 开新块；低熵(可预测,如常见词中段) → 延长当前块。
   拖动阈值滑块看“块”如何随阈值合并/裂开。挂载 <div id="blt"></div>，调用 initBLT("blt")。 */
function initBLT(mountId){
  const root=document.getElementById(mountId);
  if(!root) return;
  // 每个样本：字符 + 每个字符位置的示意熵(0-1，越高越“难预测=更该开新块”)
  const SAMPLES=[
    { id:"en", label:"英文句子",
      text:"the quick brown fox",
      ent:[.9,.3,.2, .6,.85,.4,.35,.3,.3, .6,.9,.35,.4,.3, .6,.9,.4,.4] },
    { id:"rep", label:"高度可预测(重复)",
      text:"aaaaaaaathe result",
      ent:[.8,.1,.1,.1,.1,.1,.1,.1, .55,.85,.3, .6,.9,.3,.4,.3,.3] },
    { id:"zh", label:"中文句子",
      text:"深度学习模型很强大",
      ent:[.9,.45,.85,.4,.8,.5,.75,.85,.6] },
  ];
  let cur=SAMPLES[0].id, thr=0.55;
  const PAL=["#58a6ff","#7ee787","#ffa657","#d2a8ff","#ff9edb","#56d4bc","#f2cc60","#79c0ff"];

  function patchesOf(s){
    const chars=Array.from(s.text), patches=[]; let start=0;
    for(let i=0;i<chars.length;i++){
      if(i>0 && s.ent[i]>=thr){ patches.push([start,i]); start=i; }
    }
    patches.push([start,chars.length]);
    return {chars,patches};
  }

  function render(){
    const s=SAMPLES.find(x=>x.id===cur);
    const {chars,patches}=patchesOf(s);
    const picker=SAMPLES.map(x=>`<button class="btn ${x.id===cur?'':'ghost'}" data-b="${x.id}" style="margin:3px">${x.label}</button>`).join("");

    // 熵柱 + 阈值线
    let bars="";
    chars.forEach((c,i)=>{
      const h=Math.round(s.ent[i]*46)+4;
      const over=s.ent[i]>=thr;
      bars+=`<span style="display:inline-flex;flex-direction:column;align-items:center;width:26px">
        <span style="height:52px;display:flex;align-items:flex-end"><span style="width:12px;height:${h}px;border-radius:3px 3px 0 0;background:${over?'var(--accent3)':'#30435f'}"></span></span>
        <span style="font-family:var(--mono);font-size:15px;color:${over?'var(--accent3)':'var(--fg-dim)'}">${c===' '?'␣':c}</span>
      </span>`;
    });

    // 块（变长，着色）
    let pat="";
    patches.forEach((p,pi)=>{
      const col=PAL[pi%PAL.length];
      const seg=chars.slice(p[0],p[1]).join("").replace(/ /g,"␣");
      pat+=`<span class="tok" style="border-color:${col};color:${col};background:${col}1a;font-size:15px">${seg}<span style="font-family:var(--mono);font-size:10px;color:var(--fg-faint)"> ${p[1]-p[0]}</span></span>`;
    });

    root.innerHTML=`
      <div style="margin-bottom:10px">${picker}</div>
      <div class="note o" style="margin:0 0 14px"><b>示意</b>：熵值为手工标注用于演示机制；真实 BLT 由小型字节熵模型给出。红柱=超过阈值→在此开新块。</div>
      <div style="color:var(--fg-dim);font-size:13px;margin-bottom:4px">① 每个位置的“下一字节熵”（越高越难预测）：</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;flex-wrap:wrap;gap:2px">${bars}</div>
      <div style="display:flex;align-items:center;gap:12px;margin:14px 0">
        <span style="color:var(--fg-dim);font-size:13px">熵阈值</span>
        <input type="range" id="blt-thr" min="0.2" max="0.95" step="0.05" value="${thr}" style="flex:1;max-width:320px">
        <span style="font-family:var(--mono);color:var(--accent3)">${thr.toFixed(2)}</span>
      </div>
      <div style="color:var(--fg-dim);font-size:13px;margin-bottom:4px">② 动态块（阈值越高 → 块越少越长；数字=块含几个字符）：切成 <b>${patches.length}</b> 块</div>
      <div style="background:#0b0f16;border:1px solid var(--border);border-radius:10px;padding:12px;line-height:2.1">${pat}</div>
      <div class="note g" style="margin:14px 0 0">可预测的文本（如重复串、常见词中段）被并进<b>长块</b>，难啃的地方切成<b>短块</b>——算力按“内容复杂度”分配，这就是 BLT 比定长分块(MegaByte)更省的原因。</div>
    `;
    root.querySelectorAll("[data-b]").forEach(b=>b.onclick=()=>{cur=b.dataset.b;render();});
    const sl=document.getElementById("blt-thr");
    sl.oninput=()=>{thr=parseFloat(sl.value);render();};
  }
  render();
}
