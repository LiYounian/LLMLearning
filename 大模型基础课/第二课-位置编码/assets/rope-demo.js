/* RoPE 旋转可视化：q(蓝)、k(绿) 各按位置旋转，夹角只依赖 n-m */
function initRopeDemo(id){
  const root = document.getElementById(id);
  if(!root) return;
  let m=1, n=3, theta=0.45;
  const aq=0.25, ak=-0.35; // 基础向量角度（弧度），固定
  const R=1.15;            // 向量长度（画布单位）

  root.innerHTML = `
    <div class="controls">
      <div class="ctrl"><label>Query 位置 m = <span class="val" id="${id}-vm">1</span></label>
        <input type="range" id="${id}-m" min="0" max="16" step="1" value="1"></div>
      <div class="ctrl"><label>Key 位置 n = <span class="val" id="${id}-vn">3</span></label>
        <input type="range" id="${id}-n" min="0" max="16" step="1" value="3"></div>
      <div class="ctrl"><label>旋转频率 θ = <span class="val" id="${id}-vt">0.45</span></label>
        <input type="range" id="${id}-t" min="0.1" max="1.0" step="0.05" value="0.45"></div>
    </div>
    <div class="canvas-wrap"><canvas id="${id}-cv" width="400" height="400"></canvas></div>
    <div class="legend">
      <span><span class="sw" style="background:#58a6ff"></span>旋转后 Query (转 m·θ)</span>
      <span><span class="sw" style="background:#7ee787"></span>旋转后 Key (转 n·θ)</span>
      <span style="color:var(--fg-faint)">虚线=未旋转的原始向量</span>
    </div>
    <div class="readout" id="${id}-out"></div>
  `;

  const cv=root.querySelector('#'+id+'-cv'), ctx=cv.getContext('2d');
  const out=root.querySelector('#'+id+'-out');
  const cx=200, cy=200, scale=110;

  function vec(angle){ return [Math.cos(angle)*R, Math.sin(angle)*R]; }
  function toPx(v){ return [cx+v[0]*scale, cy-v[1]*scale]; }

  function arrow(v,col,dash){
    const p=toPx(v);
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=dash?1.5:3;
    ctx.setLineDash(dash?[5,4]:[]);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p[0],p[1]); ctx.stroke();
    ctx.setLineDash([]);
    if(!dash){ // 箭头
      const a=Math.atan2(p[1]-cy,p[0]-cx);
      ctx.beginPath(); ctx.moveTo(p[0],p[1]);
      ctx.lineTo(p[0]-10*Math.cos(a-0.4),p[1]-10*Math.sin(a-0.4));
      ctx.lineTo(p[0]-10*Math.cos(a+0.4),p[1]-10*Math.sin(a+0.4));
      ctx.closePath(); ctx.fill();
    }
  }

  function draw(){
    ctx.clearRect(0,0,400,400);
    // 网格圆 + 坐标轴
    ctx.strokeStyle='#2a3140'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx,cy,scale*R,0,7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20,cy); ctx.lineTo(380,cy); ctx.moveTo(cx,20); ctx.lineTo(cx,380); ctx.stroke();

    const qa=aq+m*theta, ka=ak+n*theta;
    // 夹角弧
    ctx.strokeStyle='rgba(210,168,255,.6)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,42,-qa,-ka, qa<ka); ctx.stroke();

    arrow(vec(aq),'#58a6ff',true);
    arrow(vec(ak),'#7ee787',true);
    arrow(vec(qa),'#58a6ff',false);
    arrow(vec(ka),'#7ee787',false);

    // 读数
    let diff=(ka-qa);
    let deg=Math.abs(diff)*180/Math.PI; deg=deg%360; if(deg>180)deg=360-deg;
    const cosv=Math.cos(ka-qa);
    out.innerHTML =
      `相对位置 <b>n − m = ${n-m}</b> ｜ 两向量夹角 ≈ <b>${deg.toFixed(1)}°</b> ｜ 内积∝cos(夹角) = <b>${cosv.toFixed(3)}</b><br>`+
      `夹角 = (基础角差) + (n−m)·θ = 常数 + ${(n-m)}×${theta.toFixed(2)} → <b>只随 n−m 变</b>。`+
      `<span style="color:var(--fg-faint)"> 试试让 m、n 同时 +1：夹角与内积不变，这正是"注意力只看相对位置"。</span>`;
  }

  const M=root.querySelector('#'+id+'-m'), N=root.querySelector('#'+id+'-n'), T=root.querySelector('#'+id+'-t');
  const vm=root.querySelector('#'+id+'-vm'), vn=root.querySelector('#'+id+'-vn'), vt=root.querySelector('#'+id+'-vt');
  M.oninput=()=>{m=+M.value;vm.textContent=m;draw();};
  N.oninput=()=>{n=+N.value;vn.textContent=n;draw();};
  T.oninput=()=>{theta=+T.value;vt.textContent=theta.toFixed(2);draw();};
  draw();
}
