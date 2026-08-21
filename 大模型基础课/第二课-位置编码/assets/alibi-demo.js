/* ALiBi 斜率衰减：每个头一条线，bias = -m·distance，m 取几何级数 */
function initAlibiDemo(id){
  const root=document.getElementById(id);
  if(!root) return;
  let heads=4, maxD=40;

  root.innerHTML=`
    <div class="controls">
      <div class="ctrl"><label>注意力头数 = <span class="val" id="${id}-vh">4</span></label>
        <input type="range" id="${id}-h" min="2" max="8" step="1" value="4"></div>
      <div class="ctrl"><label>最大回看距离 = <span class="val" id="${id}-vd">40</span></label>
        <input type="range" id="${id}-d" min="16" max="128" step="8" value="40"></div>
    </div>
    <div class="canvas-wrap"><canvas id="${id}-cv" width="660" height="320"></canvas></div>
    <div class="legend" id="${id}-lg"></div>
    <div class="readout">纵轴越低 = 该距离的注意力被压得越狠。<b>陡线</b>只顾眼前几个词，<b>缓线</b>能望向远处——多头分工，兼顾细节与全局。</div>
  `;

  const cv=root.querySelector('#'+id+'-cv'), ctx=cv.getContext('2d'), lg=root.querySelector('#'+id+'-lg');
  const W=660,H=320,padL=52,padR=16,padT=16,padB=40;
  const cols=['#58a6ff','#7ee787','#ffa657','#d2a8ff','#ff7b72','#ff9edb','#79c0ff','#56d364'];

  function slopes(n){ const s=[]; const ratio=Math.pow(2,-8/n); let cur=ratio; for(let i=0;i<n;i++){s.push(cur);cur*=ratio;} return s; }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const sl=slopes(heads);
    const yMin=-maxD*sl[0]; // 最陡线在最远处的值（最负）
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const X=d=> padL + (d/maxD)*plotW;
    const Y=v=> padT + (v-0)/(yMin-0)*plotH; // 0 在顶, yMin 在底
    // 坐标轴
    ctx.strokeStyle='#2a3140'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL,H-padB); ctx.lineTo(W-padR,H-padB); ctx.stroke();
    ctx.fillStyle='#6b7684'; ctx.font='12px monospace';
    ctx.fillText('偏置 bias',6,padT+6);
    ctx.fillText('回看距离 (i−j) →', W-160, H-14);
    // 网格 y 刻度
    ctx.fillText('0', padL-26, padT+4);
    ctx.fillText(yMin.toFixed(1), padL-40, H-padB+4);
    // 线
    lg.innerHTML='';
    sl.forEach((m,idx)=>{
      const c=cols[idx%cols.length];
      ctx.strokeStyle=c; ctx.lineWidth=2.2; ctx.beginPath();
      for(let d=0;d<=maxD;d++){ const x=X(d), y=Y(-m*d); d===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.stroke();
      const sp=document.createElement('span');
      sp.innerHTML=`<span class="sw" style="background:${c}"></span>头${idx+1} · m=${m.toFixed(3)}`;
      lg.appendChild(sp);
    });
  }

  const Hs=root.querySelector('#'+id+'-h'), Ds=root.querySelector('#'+id+'-d');
  const vh=root.querySelector('#'+id+'-vh'), vd=root.querySelector('#'+id+'-vd');
  Hs.oninput=()=>{heads=+Hs.value;vh.textContent=heads;draw();};
  Ds.oninput=()=>{maxD=+Ds.value;vd.textContent=maxD;draw();};
  draw();
}
