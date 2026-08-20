/* ===== UTF-8 字节编码可视化器 =====
   展示：字符 → Unicode 码点 → UTF-8 字节 → 字节级 BPE 的输入
   回答"字符怎么变成数字再统计"的核心问题 */
function initByteDemo(mountId){
  const root = document.getElementById(mountId);
  if(!root) return;
  const enc = new TextEncoder();

  function analyze(text){
    const chars = Array.from(text); // 按码点切分（正确处理 emoji / CJK）
    let rows = "";
    let totalBytes = 0;
    for(const ch of chars){
      const cp = ch.codePointAt(0);
      const bytes = Array.from(enc.encode(ch));
      totalBytes += bytes.length;
      const byteStr = bytes.map(b=>b.toString(10)).join(" ");
      const hexStr  = bytes.map(b=>b.toString(16).padStart(2,"0").toUpperCase()).join(" ");
      const kind = bytes.length===1 ? "ASCII (1 字节)" : bytes.length+" 字节";
      const color = bytes.length===1 ? "var(--accent2)" : bytes.length===3 ? "var(--accent3)" : "var(--accent4)";
      rows += `<tr>
        <td class="mono" style="font-size:18px">${ch===" "?"␣":ch}</td>
        <td class="mono">U+${cp.toString(16).toUpperCase().padStart(4,"0")}</td>
        <td class="mono" style="color:${color}">${byteStr}</td>
        <td class="mono" style="color:var(--fg-dim)">${hexStr}</td>
        <td style="color:${color};font-size:13px">${kind}</td>
      </tr>`;
    }
    document.getElementById(mountId+"-out").innerHTML = `
      <div style="margin:12px 0;color:var(--fg-dim);font-size:14px">
        共 <b style="color:var(--fg)">${chars.length}</b> 个字符 →
        <b style="color:var(--accent)">${totalBytes}</b> 个字节。
        字节级 BPE 就是在这一串 0–255 的整数上做合并统计——所以<b>永远不会有未知字符</b>。
      </div>
      <div class="tablewrap"><table>
        <thead><tr><th>字符</th><th>Unicode 码点</th><th>UTF-8 字节 (十进制)</th><th>十六进制</th><th>说明</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  root.innerHTML = `
    <b style="font-size:17px">🔡 UTF-8 字节编码：字符是怎么变成数字的</b>
    <div style="color:var(--fg-dim);font-size:14px;margin:8px 0">输入任意文本（试试中文、emoji）：</div>
    <input id="${mountId}-in" value="Hi 你好 🚀" spellcheck="false"
      style="font-family:var(--mono);font-size:16px;background:#0b0f16;border:1px solid var(--border);color:var(--fg);padding:10px 14px;border-radius:9px;width:min(100%,360px)">
    <div id="${mountId}-out"></div>`;
  const inp = document.getElementById(mountId+"-in");
  inp.oninput = ()=>analyze(inp.value);
  analyze("Hi 你好 🚀");
}
