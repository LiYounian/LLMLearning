/* ===== tiktoken 切词对比图 =====
   读取 window.TOKEN_DATA (由 scripts/gen_token_compare.py 用真实分词器生成),
   渲染: 样本选择器 + token 数条形图 + 实际切分 chips + 全量对比表。 */
(function () {
  const D = window.TOKEN_DATA;
  if (!D) return;

  const FAMILY_COLOR = {
    gpt: "#58a6ff", qwen: "#7ee787", deepseek: "#ffa657",
    llama: "#d2a8ff", other: "#9aa7b4",
  };
  // BERT / T5 是英文导向, 对中文会退化成 [UNK]/<unk>, token 数看着少其实是"丢了信息"
  const ENGLISH_ONLY = { bert: 1, t5: 1 };

  let cur = D.samples[0].id;

  function tkById(k) { return D.tokenizers.find(t => t.key === k); }

  function render() {
    const sample = D.samples.find(s => s.id === cur);
    const counts = D.counts[cur];
    const order = D.tokenizers.map(t => t.key);       // 固定顺序, 便于横向比较
    const maxC = Math.max(...order.map(k => counts[k] || 0));

    // --- 样本选择器 ---
    const picker = D.samples.map(s =>
      `<button class="btn ${s.id === cur ? "" : "ghost"}" data-s="${s.id}" style="margin:3px">${s.label}</button>`
    ).join("");

    // --- 被切的原文 ---
    const textBox =
      `<div style="margin:12px 0;color:var(--fg-dim);font-size:13px">被切分的文本：</div>
       <pre style="margin:0 0 18px"><code>${esc(sample.text)}</code></pre>`;

    // --- 条形图 ---
    let bars = "";
    order.forEach(k => {
      const t = tkById(k), c = counts[k] || 0;
      const pct = maxC ? (c / maxC * 100) : 0;
      const col = FAMILY_COLOR[t.family] || "#9aa7b4";
      const warn = ENGLISH_ONLY[k] && cur === "zh"
        ? ` <span style="color:var(--danger);font-size:11px">⚠ 中文→UNK, 数字虚低</span>` : "";
      bars +=
        `<div style="display:flex;align-items:center;gap:10px;margin:7px 0">
           <div style="width:150px;text-align:right;font-size:13px;color:var(--fg-dim);flex:none">
             ${t.name}<br><span style="font-family:var(--mono);font-size:10px;color:var(--fg-faint)">vocab ${fmt(t.vocab)}</span>
           </div>
           <div style="flex:1;background:#0b0f16;border-radius:6px;overflow:hidden">
             <div style="width:${Math.max(pct,4)}%;background:${col};height:26px;border-radius:6px;
                         display:flex;align-items:center;justify-content:flex-end;padding-right:8px;
                         color:#08131f;font-weight:700;font-family:var(--mono);font-size:13px;
                         transition:width .4s ease">${c}</div>
           </div>${warn}
         </div>`;
    });

    // --- 实际切分 chips ---
    let segs = "";
    order.forEach(k => {
      const t = tkById(k), arr = (D.segments[cur] || {})[k] || [];
      const chips = arr.map(x => {
        if (x.f) // 字节碎片 (半个多字节字符)
          return `<span class="tok" style="border-style:dashed;border-color:var(--danger);color:var(--danger);background:rgba(255,123,114,.08)" title="字节碎片：不足一个完整字符">▪</span>`;
        const disp = x.t === "" ? "␣" : x.t.replace(/ /g, "␣");
        return `<span class="tok" style="border-color:${FAMILY_COLOR[t.family]}55;color:var(--fg)">${esc(disp)}</span>`;
      }).join("");
      segs +=
        `<div style="margin:12px 0">
           <div style="font-size:13px;color:var(--fg-dim);margin-bottom:3px">
             ${t.name} <span style="color:${FAMILY_COLOR[t.family]};font-family:var(--mono)">· ${arr.length} tokens</span>
           </div>
           <div style="line-height:2.1">${chips}</div>
         </div>`;
    });

    document.getElementById("tc-picker").innerHTML = picker;
    document.getElementById("tc-text").innerHTML = textBox;
    document.getElementById("tc-bars").innerHTML = bars;
    document.getElementById("tc-segs").innerHTML = segs;

    document.querySelectorAll("#tc-picker [data-s]").forEach(b =>
      b.onclick = () => { cur = b.dataset.s; render(); });
  }

  // --- 全量对比表 (所有样本 × 所有分词器) ---
  function renderTable() {
    const order = D.tokenizers;
    let head = "<tr><th>样本 ＼ 分词器</th>" +
      order.map(t => `<th class="mono" style="text-align:center">${t.name}</th>`).join("") + "</tr>";
    let body = "";
    D.samples.forEach(s => {
      const row = D.counts[s.id];
      const vals = order.map(t => row[t.key] || 0);
      const min = Math.min(...vals), max = Math.max(...vals);
      body += `<tr><td>${s.label}</td>` + order.map((t, i) => {
        const v = vals[i];
        let style = "text-align:center;font-family:var(--mono)";
        if (v === min) style += ";color:var(--accent2);font-weight:700";
        if (v === max) style += ";color:var(--danger)";
        return `<td style="${style}">${v}</td>`;
      }).join("") + "</tr>";
    });
    const vocabRow = "<tr><td style='color:var(--fg-faint)'>词表大小</td>" +
      order.map(t => `<td class="mono" style="text-align:center;color:var(--fg-faint);font-size:12px">${fmt(t.vocab)}</td>`).join("") + "</tr>";
    document.getElementById("tc-table").innerHTML =
      `<table>${head}${body}${vocabRow}</table>`;
  }

  function esc(s) { return (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fmt(n) { return (n + "").replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  render();
  renderTable();
})();
