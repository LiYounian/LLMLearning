/* 置换等变演示：打乱 token 顺序，看"无位置编码"时模型眼中的集合不变 */
function initPermDemo(id){
  const root = document.getElementById(id);
  if(!root) return;
  const base = ["我","昨天","在","公园","看到","一只","狗"];
  let toks = base.slice();
  let showPos = true;

  root.innerHTML = `
    <div class="controls">
      <button class="btn" data-a="shuffle">🔀 打乱顺序</button>
      <button class="btn ghost" data-a="reset">复位</button>
      <button class="btn ghost" data-a="toggle">位置编码：<b class="pe-state">开</b></button>
    </div>
    <div class="seqrow" id="${id}-row"></div>
    <div class="readout" id="${id}-out"></div>
  `;

  const row = root.querySelector('#'+id+'-row');
  const out = root.querySelector('#'+id+'-out');
  const peState = root.querySelector('.pe-state');

  function render(){
    row.innerHTML = '';
    toks.forEach((t,i)=>{
      const el = document.createElement('span');
      el.className = 'seqtok';
      el.innerHTML = showPos
        ? `<span class="pos">pos ${i}</span>${t}`
        : t;
      row.appendChild(el);
    });
    peState.textContent = showPos ? '开' : '关';
    if(showPos){
      out.innerHTML = `模型读到的是<b>有序序列</b>：「${toks.join(' ')}」——位置标签让它能区分词序。`;
    }else{
      const bag = base.slice().sort().join('、');
      out.innerHTML = `无位置编码时，注意力只把它当成一个<b>集合</b>：{ ${bag} }。<br>不管你怎么打乱，这个集合都一样 → 模型分不清"狗看到我"还是"我看到狗"。`;
    }
  }

  function shuffle(){
    // Fisher-Yates 洗牌
    for(let i=toks.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [toks[i],toks[j]]=[toks[j],toks[i]];
    }
    render();
  }

  root.querySelector('[data-a=shuffle]').onclick = shuffle;
  root.querySelector('[data-a=reset]').onclick = ()=>{toks=base.slice();render();};
  root.querySelector('[data-a=toggle]').onclick = ()=>{showPos=!showPos;render();};
  render();
}
