/* 长上下文外推示意：真实位置 → 模型有效感知位置，对比四种策略 */
function initExtrapDemo(id){
  const root=document.getElementById(id);
  if(!root) return;
  let L=4, s=8; // L 以 k(千 token) 为单位，s 扩展倍数

  root.innerHTML=`
    <div class="controls">
      <div class="ctrl"><label>训练长度 L = <span class="val" id="${id}-vL">4</span>k</label>
        <input type="range" id="${id}-L" min="1" max="8" step="1" value="4"></div>
      <div class="ctrl"><label>扩展倍数 s = <span class="val" id="${id}-vs">8</span>×</label>
        <input type="range" id="${id}-s" min="2" max="32" step="1" value="8"></div>
    </div>
    <div class="canvas-wrap"><canvas id="${id}-cv" width="660" height="340"></canvas></div>
    <div class="legend">
      <span><span class="sw" style="background:#ff7b72"></span>直接外推（冲出安全区→崩）</span>
      <span><span class="sw" style="background:#58a6ff"></span>PI 均匀压缩</span>
      <span><span class="sw" style="background:#7ee787"></span>NTK / YaRN 非均匀</span>
      <span><span class="sw" style="background:#2a3140"></span>训练安全区 y≤L</span>
    </div>
    <div class="readout" id="${id}-out"></div>
  `;

  const cv=root.querySelector('#'+id+'-cv'), ctx=cv.getContext('2d');
  const out=root.querySelector('#'+id+'-out');
  const W=660,H=340,padL=54,padR=16,padT=16,padB=42;

  function draw(){
    const maxX=s*L;            // 真实位置上限
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const X=x=> padL + (x/maxX)*plotW;
    const Y=y=> (H-padB) - (y/maxX)*plotH;   // y 轴同样 0..maxX
    ctx.clearRect(0,0,W,H);

    // 安全区 y<=L 阴影
    ctx.fillStyle='rgba(88,166,255,.06)';
    ctx.fillRect(padL, Y(L), plotW, (H-padB)-Y(L));
    // 危险区 y>L 顶部淡红
    ctx.fillStyle='rgba(255,123,114,.05)';
    ctx.fillRect(padL, padT, plotW, Y(L)-padT);
    // L 边界线
    ctx.strokeStyle='#3b6db5'; ctx.setLineDash([5,4]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(padL,Y(L)); ctx.lineTo(W-padR,Y(L)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#58a6ff'; ctx.font='12px monospace';
    ctx.fillText('L='+L+'k (安全边界)', padL+6, Y(L)-6);

    // 坐标轴
    ctx.strokeStyle='#2a3140'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL,H-padB); ctx.lineTo(W-padR,H-padB); ctx.stroke();
    ctx.fillStyle='#6b7684';
    ctx.fillText('有效感知位置', 6, padT+6);
    ctx.fillText('真实位置 (k token) →', W-180, H-14);
    ctx.fillText('0',padL-14,H-padB+4);
    ctx.fillText(maxX+'k',W-padR-22,H-padB+18);

    const N=120;
    function curve(fn,col,dash){
      ctx.strokeStyle=col; ctx.lineWidth=2.4; ctx.setLineDash(dash||[]);
      ctx.beginPath();
      for(let i=0;i<=N;i++){ const x=maxX*i/N, y=fn(x); const px=X(x),py=Y(Math.min(y,maxX));
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // 直接外推 y=x
    curve(x=>x,'#ff7b72',[6,4]);
    // PI 均匀 y=x/s
    curve(x=>x/s,'#58a6ff');
    // NTK/YaRN 非均匀：近处贴合 identity，远处压回 L
    curve(x=>L*(1-Math.pow(1-x/maxX, s)),'#7ee787');

    // 探针：真实位置 = maxX 处三法的感知值
    const piEnd=(maxX/s), ntkEnd=L, idEnd=maxX;
    out.innerHTML=`喂入 <b>${maxX}k</b> token 时，末位置的有效感知：`+
      `直接外推 <b style="color:#ff7b72">${idEnd}k</b>（远超 L，未训练过→崩） ｜ `+
      `PI <b style="color:#58a6ff">${piEnd.toFixed(1)}k</b>（全被压扁，近处细节也丢） ｜ `+
      `NTK/YaRN <b style="color:#7ee787">≤${ntkEnd}k</b>（近处几乎不压、只压远处）。`;
  }

  const Ls=root.querySelector('#'+id+'-L'), Ss=root.querySelector('#'+id+'-s');
  const vL=root.querySelector('#'+id+'-vL'), vs=root.querySelector('#'+id+'-vs');
  Ls.oninput=()=>{L=+Ls.value;vL.textContent=L;draw();};
  Ss.oninput=()=>{s=+Ss.value;vs.textContent=s;draw();};
  draw();
}
