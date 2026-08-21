/* 正弦位置编码热力图：行=位置，列=维度，颜色=编码值 */
function initSinDemo(id){
  const root = document.getElementById(id);
  if(!root) return;
  let seqLen = 32, dim = 64, sel = -1;

  root.innerHTML = `
    <div class="controls">
      <div class="ctrl">
        <label>序列长度 (位置数) <span class="val" id="${id}-vL">32</span></label>
        <input type="range" id="${id}-L" min="8" max="64" step="1" value="32">
      </div>
      <div class="ctrl">
        <label>编码维度 d <span class="val" id="${id}-vD">64</span></label>
        <input type="range" id="${id}-D" min="16" max="128" step="8" value="64">
      </div>
    </div>
    <div class="canvas-wrap"><canvas id="${id}-cv"></canvas></div>
    <div class="legend">
      <span><span class="sw" style="background:#3b6db5"></span>负值 −1</span>
      <span><span class="sw" style="background:#0b0f16"></span>0</span>
      <span><span class="sw" style="background:#ffa657"></span>正值 +1</span>
      <span style="color:var(--fg-faint)">← 左侧高频（细条纹） · 右侧低频（宽色带） →</span>
    </div>
    <div class="readout" id="${id}-out">👆 点热力图任意一行，查看该位置的编码向量</div>
  `;

  const cv = root.querySelector('#'+id+'-cv');
  const ctx = cv.getContext('2d');
  const out = root.querySelector('#'+id+'-out');

  function pe(pos,i){ // 第 i 维（0..d-1）
    const k = Math.floor(i/2);
    const denom = Math.pow(10000, (2*k)/dim);
    const ang = pos/denom;
    return (i%2===0) ? Math.sin(ang) : Math.cos(ang);
  }
  function color(v){ // v in [-1,1] -> 蓝-黑-橙
    if(v>=0){ const t=v; return `rgb(${Math.round(11+t*(255-11))},${Math.round(15+t*(166-15))},${Math.round(22+t*(87-22))})`; }
    const t=-v; return `rgb(${Math.round(11+t*(59-11))},${Math.round(15+t*(109-15))},${Math.round(22+t*(181-22))})`;
  }

  function draw(){
    const maxW = Math.min(root.clientWidth-4, 720);
    const cellW = Math.max(4, Math.floor(maxW/dim));
    const cellH = Math.max(6, Math.floor(360/seqLen));
    const W = cellW*dim, H = cellH*seqLen;
    cv.width = W; cv.height = H;
    cv.style.width = W+'px'; cv.style.height = H+'px';
    for(let p=0;p<seqLen;p++){
      for(let i=0;i<dim;i++){
        ctx.fillStyle = color(pe(p,i));
        ctx.fillRect(i*cellW, p*cellH, cellW, cellH);
      }
    }
    if(sel>=0 && sel<seqLen){
      ctx.strokeStyle='#7ee787'; ctx.lineWidth=2;
      ctx.strokeRect(0, sel*cellH, W, cellH);
    }
  }

  function showRow(p){
    // 用小色条展示该位置的完整编码向量
    let bars='';
    const w = Math.max(3, Math.floor(Math.min(root.clientWidth-40,700)/dim));
    for(let i=0;i<dim;i++){
      const v=pe(p,i);
      bars+=`<span style="display:inline-block;width:${w}px;height:16px;background:${color(v)};border-right:1px solid #0d1117"></span>`;
    }
    out.innerHTML = `位置 <b>pos = ${p}</b> 的编码向量（${dim} 维）：<br>
      <div style="margin-top:8px;line-height:0">${bars}</div>
      <span style="font-size:12px;color:var(--fg-faint)">左侧维度变化快（高频），右侧几乎不变（低频）——每个位置的这条"指纹"都独一无二。</span>`;
  }

  cv.addEventListener('click',(e)=>{
    const rect=cv.getBoundingClientRect();
    const y=e.clientY-rect.top;
    const cellH=cv.height/seqLen;
    sel=Math.floor(y/cellH);
    draw(); showRow(sel);
  });

  const L=root.querySelector('#'+id+'-L'), D=root.querySelector('#'+id+'-D');
  const vL=root.querySelector('#'+id+'-vL'), vD=root.querySelector('#'+id+'-vD');
  L.oninput=()=>{seqLen=+L.value;vL.textContent=seqLen;if(sel>=seqLen)sel=-1;draw();};
  D.oninput=()=>{dim=+D.value;vD.textContent=dim;draw();if(sel>=0)showRow(sel);};
  window.addEventListener('resize',draw);
  draw();
}
