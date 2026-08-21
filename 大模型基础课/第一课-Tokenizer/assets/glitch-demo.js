/* ===== Glitch token 画廊 =====
   读 window.GLITCH_DATA（scripts/gen_glitch.py 用真实 tiktoken 核对）。
   点卡片展开：它在 GPT-2/3 里是单个 token(真实 ID)，在 GPT-4(cl100k) 里被拆回多个——欠训练 token 的由来。
   挂载 <div id="glitch"></div>，调用 initGlitch("glitch")。 */
function initGlitch(mountId){
  const root=document.getElementById(mountId);
  if(!root) return;
  const D=window.GLITCH_DATA;
  if(!D){ root.innerHTML='<div class="note o">未加载 glitch_data.js</div>'; return; }
  const esc=(s)=>(s+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/ /g,"␣");

  const cards=D.tokens.map((t,i)=>{
    const single=t.gpt2_single;
    const fixed = single && t.cl_ntok>1;
    return `<div class="glitch-card" data-i="${i}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <code style="color:var(--danger);font-size:14px">${esc(t.s)}</code>
        <span class="mbadge ${single?'gpt':'dim'}">${single?'GPT-2 单 token':'非单 token'}</span>
      </div>
      <div class="glitch-body" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
        <div style="color:var(--fg-dim);font-size:13.5px;margin-bottom:8px">${t.note}</div>
        <div class="kv" style="margin:0">
          <dt>GPT-2/3 词表</dt><dd>${single?`<b style="color:var(--accent2)">单个 token</b> · ID <code>${t.gpt2_id}</code>`:`${t.gpt2_ntok} 个 token`}</dd>
          <dt>GPT-4 (cl100k)</dt><dd>${t.cl_ntok===1?'仍是单个 token':`已拆回 <b style="color:var(--accent)">${t.cl_ntok}</b> 个 token ${fixed?'<span style="color:var(--fg-faint)">（相当于“修复”了）</span>':''}`}</dd>
        </div>
      </div>
    </div>`;
  }).join("");

  root.innerHTML=`
    <div class="note" style="margin:0 0 14px"><b>点任一 token 展开</b>。这些字符串在 GPT-2/GPT-3 的 5 万词表里是<b>单个 token</b>（分词器训练语料里高频，多为 Reddit 用户名/代码标识符），却几乎没出现在<b>模型</b>训练语料里 → embedding 停留在随机初始化附近 → 一喂就“抽风”。</div>
    <div class="glitch-grid">${cards}</div>
    <div style="color:var(--fg-faint);font-size:12px;margin-top:10px">ID 由真实 tiktoken 现跑核对（gpt2 / cl100k_base）。GPT-4 换了更大词表后，大多数被拆回多个普通 token，问题随之缓解。</div>
  `;
  root.querySelectorAll(".glitch-card").forEach(c=>{
    c.onclick=()=>{ const b=c.querySelector(".glitch-body"); b.style.display=b.style.display==="none"?"block":"none"; };
  });
}
