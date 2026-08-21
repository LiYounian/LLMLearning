/* ===== 跨家族可交互时间线（按年份视图 + 公司泳道视图）===== */
const FAM = {
  industry:{n:"行业共性",c:"#7ee787"},
  openai:{n:"OpenAI",c:"#10a37f"},
  claude:{n:"Anthropic",c:"#d97757"},
  gemini:{n:"Google",c:"#4285f4"},
  llama:{n:"Meta",c:"#7b6ef6"},
  qwen:{n:"阿里 Qwen",c:"#a855f7"},
  deepseek:{n:"DeepSeek",c:"#4d6bfe"},
  kimi:{n:"Kimi",c:"#f0518b"},
  doubao:{n:"字节 豆包",c:"#3ec6f0"},
};
const THEMES = {
  all:"全部", arch:"架构/基座", alignment:"对齐·后训练", multimodal:"多模态",
  moe:"MoE 稀疏化", reasoning:"推理模型(RL)", longctx:"长上下文", agentic:"Agentic", efficiency:"效率工程", opensource:"开放权重"
};
const EVENTS = [
  {y:2017,f:"industry",t:"Transformer 问世",d:"《Attention Is All You Need》，所有现代 LLM 的共同基座。",g:["arch"]},
  {y:2018,f:"openai",t:"GPT-1",d:"decoder-only 生成式预训练范式确立（117M）。",g:["arch"]},
  {y:2019,f:"openai",t:"GPT-2",d:"zero-shot 多任务，规模化到 1.5B。",g:["arch"]},
  {y:2020,f:"openai",t:"GPT-3",d:"175B、3000 亿 token，few-shot / in-context learning。",g:["arch"]},
  {y:2022,f:"openai",t:"InstructGPT / ChatGPT",d:"RLHF 首次系统化，把语言模型变成对话助手。",g:["alignment"]},
  {y:2022,f:"gemini",t:"PaLM 540B",d:"540B 参数 / 780B token，Gemini 前身。",g:["arch"]},
  {y:2022,f:"claude",t:"Constitutional AI",d:"RLAIF——用「宪法」让 AI 自我批评、以 AI 反馈替代大量人工标注。",g:["alignment"]},
  {y:2022,f:"industry",t:"Chinchilla 计算最优",d:"DeepMind 提出参数/数据的计算最优缩放律。",g:["efficiency"]},
  {y:2023,f:"openai",t:"GPT-4",d:"图像多模态旗舰；自此 OpenAI 转向全面保密。",g:["multimodal"]},
  {y:2023,f:"claude",t:"Claude 1 / 2",d:"长上下文 100K→200K。",g:["longctx"]},
  {y:2023,f:"llama",t:"LLaMA 1 / 2",d:"开放权重；RMSNorm/RoPE/SwiGLU/GQA 标准配方定型。",g:["arch","opensource"]},
  {y:2023,f:"gemini",t:"Gemini 1.0",d:"原生多模态（预训练即联合多模态），32K。",g:["multimodal"]},
  {y:2023,f:"qwen",t:"Qwen 初代",d:"阿里入场，3T token，开放权重。",g:["opensource"]},
  {y:2023,f:"kimi",t:"Kimi Chat",d:"以 20 万→200 万汉字超长上下文打差异化。",g:["longctx"]},
  {y:2023,f:"doubao",t:"豆包（云雀）",d:"字节品牌化产品首发。",g:[]},
  {y:2024,f:"gemini",t:"Gemini 1.5",d:"MoE + 1M~10M 上下文，把 MoE 推成主流。",g:["moe","longctx"]},
  {y:2024,f:"llama",t:"Llama 3 / 3.1",d:"405B dense，15T token；比肩 GPT-4。",g:["opensource"]},
  {y:2024,f:"qwen",t:"Qwen2 / 2.5",d:"GQA，18T token，全尺寸覆盖。",g:["opensource"]},
  {y:2024,f:"deepseek",t:"DeepSeek V2",d:"首创 MLA（KV cache 降 93%）+ DeepSeekMoE，8.1T。",g:["moe","arch"]},
  {y:2024,f:"deepseek",t:"DeepSeekMath / GRPO",d:"首创 GRPO：去 critic 的组相对优势估计。",g:["alignment","reasoning"]},
  {y:2024,f:"deepseek",t:"DeepSeek V3",d:"FP8 训练，671B/37B，14.8T token，约 550 万美元单次预训练。",g:["moe","efficiency"]},
  {y:2024,f:"openai",t:"GPT-4o",d:"omni 全模态（文/图/音实时）。",g:["multimodal"]},
  {y:2024,f:"openai",t:"o1",d:"首个大规模推理模型——回答前私有 CoT 思考，算力转向推理期。",g:["reasoning"]},
  {y:2024,f:"claude",t:"Claude 3 / 3.5",d:"三档分级 + 视觉；率先公测 computer use。",g:["multimodal","agentic"]},
  {y:2025,f:"deepseek",t:"DeepSeek R1",d:"纯 RL（GRPO）激发推理，R1-Zero 涌现「aha moment」；开源，登 Nature。",g:["reasoning","opensource"]},
  {y:2025,f:"claude",t:"Claude 3.7 → 4",d:"extended thinking 显式可切换思考；agentic + 1M 上下文。",g:["reasoning","agentic"]},
  {y:2025,f:"openai",t:"GPT-5",d:"统一系统 + 实时路由（自动决定用不用推理）。",g:["arch"]},
  {y:2025,f:"gemini",t:"Gemini 2.0 / 2.5",d:"Agentic 时代；thinking / Deep Think 并行思考，IMO 金牌级。",g:["reasoning","agentic"]},
  {y:2025,f:"llama",t:"Llama 4",d:"首次 MoE + 原生多模态（Scout / Maverick）。",g:["moe","multimodal"]},
  {y:2025,f:"qwen",t:"Qwen3",d:"thinking / 非-thinking 统一 + thinking budget，36T token。",g:["reasoning"]},
  {y:2025,f:"kimi",t:"Kimi k1.5 → K2",d:"MuonClip 稳定万亿 MoE 训练；1.04T/32B，开放权重。",g:["reasoning","moe","opensource"]},
  {y:2025,f:"doubao",t:"豆包 1.5 / 1.6",d:"稀疏 MoE + 训推一体；Seed1.5-Thinking、AdaCoT 自适应思维链。",g:["moe","reasoning"]},
  {y:2026,f:"claude",t:"Claude 5 家族",d:"Fable 5 / Opus 5。",g:["agentic"]},
  {y:2026,f:"openai",t:"GPT-5.6 Sol",d:"当前旗舰，主打 token 效率。",g:["efficiency"]},
  {y:2026,f:"gemini",t:"Gemini 3 / 3.1",d:"GPQA/ARC-AGI 大幅刷新。",g:["reasoning"]},
  {y:2026,f:"deepseek",t:"DeepSeek V3.2 → V4",d:"DSA 稀疏注意力 O(L²)→O(L·k)；V4 上下文 1M。",g:["arch","longctx"]},
  {y:2026,f:"qwen",t:"Qwen3.5 / 3.8-Max",d:"2.4T/95B MoE，首个开放权重 Max。",g:["moe","opensource"]},
  {y:2026,f:"kimi",t:"Kimi K3",d:"2.8T/104B，号称最大开源权重模型，1M 上下文。",g:["opensource","longctx"]},
  {y:2026,f:"doubao",t:"豆包 Seed 2.0 / 2.1",d:"生产级 Agent 化。",g:["agentic"]},
];

function initTimeline(mountId){
  const root = document.getElementById(mountId);
  if(!root) return;
  let active = "all";   // 当前主题
  let view = "year";    // year | swim

  const isOn = e => active==="all" || e.g.includes(active);
  const years = [...new Set(EVENTS.map(e=>e.y))].sort();

  const chips = Object.entries(THEMES).map(([k,v])=>
    `<button class="chip${k==='all'?' active':''}" data-th="${k}">${v}</button>`).join("");

  const legend = Object.entries(FAM).map(([k,v])=>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;font-size:12.5px;color:var(--fg-dim)">
      <span style="width:11px;height:11px;border-radius:3px;background:${v.c};display:inline-block"></span>${v.n}</span>`).join("");

  /* —— 按年份视图（行=年份）—— */
  function renderYear(){
    let html = "";
    for(const y of years){
      const cells = EVENTS.filter(e=>e.y===y).map(e=>{
        const fam = FAM[e.f];
        return `<div class="tl-ev" style="border-left:3px solid ${fam.c};opacity:${isOn(e)?1:.13};transition:.25s">
          <div style="font-size:11px;font-family:var(--mono);color:${fam.c}">${fam.n}</div>
          <div style="font-weight:700;font-size:14.5px;margin:1px 0 2px">${e.t}</div>
          <div style="font-size:13px;color:var(--fg-dim);line-height:1.55">${e.d}</div>
        </div>`;
      }).join("");
      html += `<div class="tl-year"><div class="tl-y">${y}</div><div class="tl-cells">${cells}</div></div>`;
    }
    return html;
  }

  /* —— 公司泳道视图（行=公司，列=年份）—— */
  function renderSwim(){
    const cols = `132px repeat(${years.length}, minmax(188px,1fr))`;
    let g = `<div class="sw-corner">公司 ＼ 年份</div>`;
    g += years.map(y=>`<div class="sw-yhd">${y}</div>`).join("");
    for(const [fk,fam] of Object.entries(FAM)){
      const hit = EVENTS.some(e=>e.f===fk && isOn(e));   // 该道在当前主题下是否有命中，用于整道淡出
      g += `<div class="sw-lbl" style="opacity:${hit?1:.35}"><span class="sw-dot" style="background:${fam.c}"></span>${fam.n}</div>`;
      g += years.map(y=>{
        const inner = EVENTS.filter(e=>e.f===fk && e.y===y).map(e=>
          `<div class="sw-ev" style="border-left:3px solid ${fam.c};opacity:${isOn(e)?1:.13};transition:.25s">
            <div class="sw-ev-t">${e.t}</div>
            <div class="sw-ev-d">${e.d}</div>
          </div>`).join("");
        return `<div class="sw-cell" style="background:${fam.c}10">${inner}</div>`;
      }).join("");
    }
    return `<div class="swim-wrap"><div class="swim-grid" style="grid-template-columns:${cols}">${g}</div></div>
      <p class="src" style="margin-top:10px">← → 横向滚动查看全部年份；公司名列会吸附在左侧。同一行即可纵向读出<b>某一家的完整演进节奏</b>，同一列可横向对比<b>同年各家在做什么</b>。</p>`;
  }

  function render(){
    root.querySelector("#tl-body").innerHTML = view==="swim" ? renderSwim() : renderYear();
  }

  root.innerHTML = `
    <div class="swim-controls" style="margin-bottom:10px;align-items:center">
      <span style="font-size:12.5px;color:var(--fg-dim);margin-right:2px">视图</span>
      <button class="chip vt active" data-view="year">按年份</button>
      <button class="chip vt" data-view="swim">公司泳道</button>
    </div>
    <div class="swim-controls">${chips}</div>
    <div style="margin:6px 0 18px">${legend}</div>
    <div id="tl-body"></div>
    <style>
      .tl-year{display:grid;grid-template-columns:64px 1fr;gap:14px;padding:14px 0;border-top:1px solid var(--border-s)}
      .tl-y{font-family:var(--mono);font-size:20px;font-weight:800;color:var(--fg);position:sticky;top:60px;height:fit-content}
      .tl-cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px}
      .tl-ev{background:var(--bg-soft);border:1px solid var(--border-s);border-radius:9px;padding:9px 12px}
      /* 泳道 */
      .swim-wrap{overflow-x:auto;border:1px solid var(--border-s);border-radius:11px;background:var(--bg-soft)}
      .swim-grid{display:grid;min-width:max-content}
      .swim-grid>div{border-top:1px solid var(--border-s)}
      .sw-corner{position:sticky;left:0;z-index:3;background:var(--bg);font-family:var(--mono);font-size:11.5px;color:var(--fg-dim);padding:10px;display:flex;align-items:flex-end;border-top:none}
      .sw-yhd{font-family:var(--mono);font-weight:800;font-size:16px;text-align:center;padding:10px 8px;background:var(--bg);color:var(--fg);border-top:none;border-left:1px solid var(--border-s)}
      .sw-lbl{position:sticky;left:0;z-index:2;background:var(--bg);padding:10px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:7px;border-right:2px solid var(--border-s);transition:.25s}
      .sw-dot{width:11px;height:11px;border-radius:3px;flex:none}
      .sw-cell{border-left:1px solid var(--border-s);padding:7px;display:flex;flex-direction:column;gap:6px}
      .sw-ev{background:var(--bg-soft);border:1px solid var(--border-s);border-radius:7px;padding:6px 8px}
      .sw-ev-t{font-weight:700;font-size:12.5px;line-height:1.3;margin-bottom:2px}
      .sw-ev-d{font-size:11.5px;color:var(--fg-dim);line-height:1.45}
    </style>`;

  root.querySelectorAll(".chip.vt").forEach(b=>b.onclick=()=>{
    view=b.dataset.view;
    root.querySelectorAll(".chip.vt").forEach(x=>x.classList.toggle("active",x===b));
    render();
  });
  root.querySelectorAll(".chip[data-th]").forEach(c=>c.onclick=()=>{
    active=c.dataset.th;
    root.querySelectorAll(".chip[data-th]").forEach(x=>x.classList.toggle("active",x===c));
    render();
  });
  render();
}
