/* ===== Qwen 真实分词流水线可视化 =====
   读取 window.QWEN_PIPE（scripts/gen_qwen_pipeline.py 用真实 Qwen2.5 分词器生成）。
   展示：文字 → UTF-8 字节 → 字节级 BPE 合并成 token → token ID。
   同一个 token 覆盖的字节块与它的 token chip 用【同一种颜色】高亮，直观看到切割在字节层发生。 */
(function () {
  const D = window.QWEN_PIPE;
  if (!D) return;
  const root = document.getElementById("qwen-pipe");
  if (!root) return;

  // 一组在深色背景上区分度高的颜色，按 token 序号循环
  const PAL = [
    "#58a6ff", "#7ee787", "#ffa657", "#d2a8ff", "#ff9edb",
    "#79c0ff", "#f2cc60", "#56d4bc", "#ff7b72", "#a5d6ff",
    "#e3b341", "#bc8cff",
  ];
  const col = (i) => PAL[((i % PAL.length) + PAL.length) % PAL.length];
  const esc = (s) => (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const showc = (c) => c === " " ? "␣" : c === "\n" ? "\\n" : esc(c);

  let cur = D.samples[0].id;

  function render() {
    const s = D.samples.find(x => x.id === cur);

    // 样本选择器
    const picker = D.samples.map(x =>
      `<button class="btn ${x.id === cur ? "" : "ghost"}" data-s="${x.id}" style="margin:3px">${x.label}</button>`
    ).join("");

    // 第1步：文字（每个字符一格；标出它占几个字节）
    const charCells = s.chars.map(ch =>
      `<span class="pc-cell" style="border-color:var(--border)">
         <span class="pc-main">${showc(ch.c)}</span>
         <span class="pc-sub">${ch.be - ch.bs}B</span>
       </span>`).join("");

    // 第2步：UTF-8 字节（按所属 token 着色；每个字符边界用小间隔区分）
    let byteCells = "";
    s.bytes.forEach((b, k) => {
      const c = col(b.tok);
      const charStart = s.chars.some(ch => ch.bs === k);
      const gap = charStart && k !== 0 ? "margin-left:10px;" : "";
      byteCells +=
        `<span class="pc-cell" title="第 ${k} 字节，属于 token #${b.tok}"
               style="${gap}border-color:${c}66;background:${c}1a">
           <span class="pc-main" style="color:${c};font-size:12px">${b.hex}</span>
           <span class="pc-sub" style="color:${c}">${b.v}</span>
         </span>`;
    });

    // 第3步：字节级 BPE 合并成 token（chip 用同色；碎片标虚线）
    const tokChips = s.tokens.map((t, i) => {
      const c = col(i);
      const label = t.frag
        ? `<span style="color:var(--danger)">▪ 字节碎片</span>`
        : `<b>${showc(t.text)}</b>`;
      return `<span class="pc-tok" style="border-color:${c};background:${c}1f">
                ${label}
                <span class="pc-sub" style="color:${c}">字节 ${t.bs}–${t.be}</span>
              </span>`;
    }).join('<span class="pc-arrow">·</span>');

    // 第4步：token ID
    const idCells = s.tokens.map((t, i) =>
      `<span class="pc-id" style="border-color:${col(i)}66;color:${col(i)}">${t.id}</span>`
    ).join(" ");

    root.innerHTML = `
      <div style="margin-bottom:14px">${picker}</div>
      <div class="pc-meta">Qwen2.5 分词器（真实运行）· 输入 “<b>${esc(s.text)}</b>” · ${s.n_chars} 字符 → ${s.n_bytes} 字节 → <b>${s.n_tokens}</b> 个 token</div>

      <div class="pc-step"><span class="pc-n">1</span> 文字（人看的字符）</div>
      <div class="pc-row">${charCells}</div>

      <div class="pc-step"><span class="pc-n">2</span> UTF-8 编码：每个字符转成 1–4 个字节（十六进制 / 十进制）— <b>颜色 = 它最终归属的 token</b>，间隔=字符边界</div>
      <div class="pc-row">${byteCells}</div>

      <div class="pc-step"><span class="pc-n">3</span> 字节级 BPE：在<b>字节流</b>上按合并规则切成 token（同色块=同一 token 覆盖的字节）</div>
      <div class="pc-row" style="align-items:stretch">${tokChips}</div>

      <div class="pc-step"><span class="pc-n">4</span> 查词表 → token ID（真正喂给模型的数字）</div>
      <div class="pc-row">${idCells}</div>
    `;
    root.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { cur = b.dataset.s; render(); });
  }

  render();
})();
