/* ===== 主页散点图：发布时间 × 模型量级 =====
   x = 发布时间；y = 总参数量(对数轴)；颜色 = 公司。
   MoE 用"棒棒糖"连接 激活参数↕总参数，直观显示稀疏解耦。
   实心 = 开放权重；空心 = 权重闭源但参数已公开。
   闭源旗舰(参数官方未公开)单列"仅示发布时间"刻度带——诚实不编数字。 */
const MFAM = {
  openai:{n:"OpenAI",c:"#10a37f",href:"01-openai-gpt.html"},
  claude:{n:"Anthropic",c:"#d97757",href:"02-anthropic-claude.html"},
  gemini:{n:"Google",c:"#4285f4",href:"03-google-gemini.html"},
  meta:{n:"Meta",c:"#7b6ef6",href:"04-meta-llama.html"},
  qwen:{n:"阿里 Qwen",c:"#a855f7",href:"05-alibaba-qwen.html"},
  deepseek:{n:"DeepSeek",c:"#4d6bfe",href:"06-deepseek.html"},
  kimi:{n:"Kimi",c:"#f0518b",href:"07-moonshot-kimi.html"},
  doubao:{n:"字节 豆包",c:"#3ec6f0",href:"08-bytedance-doubao.html"},
};
/* 参数已公开的模型（total/act 单位 B=十亿参数）。open=权重是否开放。 */
const MODELS = [
  {c:"openai",  name:"GPT-1",        date:2018.5,  total:0.117, open:false},
  {c:"openai",  name:"GPT-2",        date:2019.1,  total:1.5,   open:true},
  {c:"openai",  name:"GPT-3",        date:2020.5,  total:175,   open:false},
  {c:"gemini",  name:"PaLM 540B",    date:2022.3,  total:540,   open:false},
  {c:"meta",    name:"LLaMA 65B",    date:2023.15, total:65,    open:true},
  {c:"meta",    name:"Llama 2 70B",  date:2023.55, total:70,    open:true},
  {c:"qwen",    name:"Qwen 72B",     date:2023.7,  total:72,    open:true},
  {c:"deepseek",name:"DeepSeek V2",  date:2024.4,  total:236, act:21, open:true},
  {c:"meta",    name:"Llama 3.1 405B",date:2024.6, total:405,   open:true},
  {c:"qwen",    name:"Qwen2.5 72B",  date:2024.78, total:72,    open:true},
  {c:"deepseek",name:"DeepSeek V3",  date:2024.98, total:671, act:37, open:true},
  {c:"deepseek",name:"DeepSeek R1",  date:2025.05, total:671, act:37, open:true},
  {c:"meta",    name:"Llama 4 Maverick",date:2025.27,total:400,act:17,open:true},
  {c:"qwen",    name:"Qwen3 235B",   date:2025.35, total:235, act:22, open:true},
  {c:"kimi",    name:"Kimi K2",      date:2025.55, total:1040,act:32, open:true},
  {c:"qwen",    name:"Qwen3.8-Max",  date:2026.3,  total:2400,act:95, open:true},
  {c:"kimi",    name:"Kimi K3",      date:2026.45, total:2800,act:104,open:true},
];
/* 参数官方未公开的闭源旗舰——只放发布时间刻度 */
const CLOSED = [
  {c:"openai", name:"GPT-4",       date:2023.2},
  {c:"gemini", name:"Gemini 1.0",  date:2023.95},
  {c:"claude", name:"Claude 3",    date:2024.2},
  {c:"openai", name:"GPT-4o",      date:2024.4},
  {c:"claude", name:"Claude 3.5",  date:2024.5},
  {c:"openai", name:"o1",          date:2024.78},
  {c:"claude", name:"Claude 3.7",  date:2025.15},
  {c:"gemini", name:"Gemini 2.5",  date:2025.3},
  {c:"claude", name:"Claude 4",    date:2025.4},
  {c:"doubao", name:"豆包 1.6",     date:2025.5},
  {c:"openai", name:"GPT-5",       date:2025.65},
  {c:"claude", name:"Claude Opus 4.5",date:2025.92},
  {c:"gemini", name:"Gemini 3",    date:2026.1},
  {c:"openai", name:"GPT-5.6 Sol", date:2026.25},
];

function fmtB(v){ return v>=1000 ? (v/1000).toFixed(v%1000?1:0)+"T" : (v<1?(v*1000)+"M":v+"B"); }

function renderScatter(mountId){
  const root=document.getElementById(mountId); if(!root) return;
  const W=1000,H=560, px0=64,px1=980, py0=78,py1=486;
  const d0=2018,d1=2026.9;
  const yGrid=[0.1,1,10,100,1000];           // 100M,1B,10B,100B,1T
  const ylo=Math.log10(0.08), yhi=Math.log10(4000);
  const xS=d=>px0+(d-d0)/(d1-d0)*(px1-px0);
  const yS=v=>py1-(Math.log10(v)-ylo)/(yhi-ylo)*(py1-py0);
  const stripY=54;                            // 闭源旗舰刻度带

  let s="";
  // 背景网格
  for(const yr of [2018,2019,2020,2021,2022,2023,2024,2025,2026]){
    const x=xS(yr);
    s+=`<line x1="${x}" y1="${py0-8}" x2="${x}" y2="${py1}" stroke="var(--border-s)" stroke-width="1" opacity=".5"/>`;
    s+=`<text x="${x}" y="${py1+20}" fill="var(--fg-faint)" font-size="12" text-anchor="middle" font-family="var(--mono)">${yr}</text>`;
  }
  for(const v of yGrid){
    const y=yS(v);
    s+=`<line x1="${px0}" y1="${y}" x2="${px1}" y2="${y}" stroke="var(--border-s)" stroke-width="1" opacity=".5" stroke-dasharray="2 4"/>`;
    s+=`<text x="${px0-9}" y="${y+4}" fill="var(--fg-faint)" font-size="11.5" text-anchor="end" font-family="var(--mono)">${fmtB(v)}</text>`;
  }
  s+=`<text transform="translate(16,${(py0+py1)/2}) rotate(-90)" fill="var(--fg-dim)" font-size="12.5" text-anchor="middle">总参数量（对数轴）</text>`;

  // 闭源旗舰刻度带
  s+=`<line x1="${px0}" y1="${stripY}" x2="${px1}" y2="${stripY}" stroke="var(--accent3)" stroke-width="1" opacity=".4" stroke-dasharray="3 3"/>`;
  s+=`<text x="${px0}" y="${stripY-9}" fill="var(--accent3)" font-size="11.5" opacity=".9">闭源旗舰 · 参数官方未公开（仅示发布时间）</text>`;
  for(const m of CLOSED){
    const f=MFAM[m.c], x=xS(m.date);
    s+=`<g class="pt" data-name="${m.name}" data-fam="${f.n}" data-date="${m.date}" data-closed="1" data-href="${f.href}" style="cursor:pointer">
      <line x1="${x}" y1="${stripY-6}" x2="${x}" y2="${stripY+6}" stroke="${f.c}" stroke-width="2.5"/>
      <rect x="${x-6}" y="${stripY-8}" width="12" height="16" fill="transparent"/></g>`;
  }

  // 参数已公开的模型
  for(const m of MODELS){
    const f=MFAM[m.c], x=xS(m.date), yT=yS(m.total);
    let g=`<g class="pt" data-name="${m.name}" data-fam="${f.n}" data-date="${m.date}" data-total="${fmtB(m.total)}" data-act="${m.act?fmtB(m.act):''}" data-open="${m.open?1:0}" data-href="${f.href}" style="cursor:pointer">`;
    if(m.act){                                // MoE 棒棒糖：激活↕总参
      const yA=yS(m.act);
      g+=`<line x1="${x}" y1="${yA}" x2="${x}" y2="${yT}" stroke="${f.c}" stroke-width="2.5" opacity=".55"/>`;
      g+=`<circle cx="${x}" cy="${yA}" r="3" fill="var(--bg)" stroke="${f.c}" stroke-width="1.6"/>`;
    }
    g+=`<circle cx="${x}" cy="${yT}" r="6" fill="${m.open?f.c:'var(--bg)'}" stroke="${f.c}" stroke-width="2"/>`;
    g+=`<text x="${x+9}" y="${yT+3.5}" fill="var(--fg-dim)" font-size="10">${m.name}</text>`;
    g+=`</g>`;
    s+=g;
  }

  root.innerHTML=`
    <div class="scatter-wrap" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${s}</svg>
      <div id="${mountId}-tip" class="scatter-tip"></div>
    </div>
    <div class="scatter-legend"></div>
    <style>
      .scatter-tip{position:absolute;pointer-events:none;opacity:0;transition:opacity .12s;background:var(--bg-card);
        border:1px solid var(--border-s);border-radius:9px;padding:9px 11px;font-size:12.5px;line-height:1.5;
        box-shadow:var(--shadow);max-width:230px;z-index:5}
      .scatter-tip b{color:var(--fg)}
      .scatter-legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin:10px 2px 0;font-size:12.5px;color:var(--fg-dim)}
      .scatter-legend .li{display:inline-flex;align-items:center;gap:6px}
      .pt:hover circle{filter:brightness(1.25)}
    </style>`;

  // 图例：公司 + 形状说明
  const famLeg=Object.values(MFAM).map(f=>
    `<span class="li"><span style="width:11px;height:11px;border-radius:50%;background:${f.c};display:inline-block"></span>${f.n}</span>`).join("");
  const shapeLeg=`
    <span class="li" style="margin-left:6px"><svg width="16" height="12"><circle cx="8" cy="6" r="5" fill="#9aa7b8"/></svg>开放权重</span>
    <span class="li"><svg width="16" height="12"><circle cx="8" cy="6" r="5" fill="none" stroke="#9aa7b8" stroke-width="2"/></svg>权重闭源(参数已公开)</span>
    <span class="li"><svg width="16" height="16"><line x1="8" y1="2" x2="8" y2="14" stroke="#9aa7b8" stroke-width="2"/><circle cx="8" cy="14" r="2" fill="none" stroke="#9aa7b8"/><circle cx="8" cy="2" r="3.5" fill="#9aa7b8"/></svg>MoE(总参↕激活)</span>`;
  root.querySelector(".scatter-legend").innerHTML=famLeg+shapeLeg;

  // 交互
  const tip=root.querySelector(`#${mountId}-tip`);
  const wrap=root.querySelector(".scatter-wrap");
  root.querySelectorAll(".pt").forEach(g=>{
    g.addEventListener("mousemove",e=>{
      const d=g.dataset;
      let html=`<b>${d.name}</b><br><span style="color:var(--fg-faint)">${d.fam} · ${Math.floor(+d.date)} 年</span>`;
      if(d.closed){ html+=`<br>参数：<span style="color:var(--accent3)">官方未公开</span>`; }
      else{
        html+=`<br>总参数：<b>${d.total}</b>`;
        if(d.act) html+=`<br>激活参数：${d.act}　<span style="color:var(--fg-faint)">(MoE 稀疏)</span>`;
        html+=`<br>${d.open==='1'?'<span style="color:var(--accent2)">开放权重</span>':'<span style="color:var(--accent3)">权重闭源</span>'}`;
      }
      html+=`<br><span style="color:var(--fg-faint)">点击进入该家详情页 →</span>`;
      tip.innerHTML=html;
      const r=wrap.getBoundingClientRect();
      let tx=e.clientX-r.left+14, ty=e.clientY-r.top+14;
      if(tx>r.width-240) tx=e.clientX-r.left-240;
      tip.style.left=tx+"px"; tip.style.top=ty+"px"; tip.style.opacity=1;
    });
    g.addEventListener("mouseleave",()=>tip.style.opacity=0);
    g.addEventListener("click",()=>{ location.href=g.dataset.href; });
  });
}
