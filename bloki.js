// Blocks of text -- the ONE place that turns them into HTML (owner 12.10; the closed list is veb/BLOKI.md).
// Used by the journal (app.js) and by the showcase (vitrina.html).  Plain ES5, no network, no globals but Bloki.
(function () {
  "use strict";
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // Russian typesetting: no line break before a dash; a one-letter word does not hang at a line's end
  function tipografika(s) {
    var odna = /(^|[\s(«„])([аАвВиИкКоОсСуУяЯ]) /g;     // twice: «и в книге» -- the two overlap
    return s.replace(/ ([—–]) /g, "\u00a0$1 ").replace(odna, "$1$2\u00a0").replace(odna, "$1$2\u00a0");
  }
  // a plain piece of text: escaped, *…* -- a term (emphasis)
  function prostoj(s) { return tipografika(e(s)).replace(/\*([^*\n]+)\*/g, '<em class="termin">$1</em>'); }

  // a text with formulas (owner 12.10): $…$ inline -- never breaks across lines; $$…$$ display -- its own
  // line, centred.  Drawn by KaTeX (veb/katex, our own copy, loaded without holding the page); until it
  // arrives, or if a formula does not parse, the TeX is shown as is -- unbroken all the same
  function ef(s) {
    s = String(s == null ? "" : s);
    var re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g, kuski = [], i = 0, m;
    while ((m = re.exec(s)) !== null) {
      kuski.push({ t: s.slice(i, m.index) }, { disp: m[1] != null, tex: m[1] != null ? m[1] : m[2] });
      i = re.lastIndex;
    }
    kuski.push({ t: s.slice(i) });
    // an opening bracket or quote before an inline formula and the closing one or a punctuation mark after
    // it stay on the formula's line («(» is never left at a line's end, «)» never starts one)
    for (var k = 1; k < kuski.length; k += 2) {
      var f = kuski[k]; f.pre = ""; f.post = "";
      if (f.disp) continue;
      var a = /[(«„\[]+$/.exec(kuski[k - 1].t), b = /^[)»”\].,;:!?]+/.exec(kuski[k + 1].t);
      if (a) { f.pre = a[0]; kuski[k - 1].t = kuski[k - 1].t.slice(0, -a[0].length); }
      if (b) { f.post = b[0]; kuski[k + 1].t = kuski[k + 1].t.slice(b[0].length); }
    }
    return kuski.map(function (x) {
      if (x.t != null) return prostoj(x.t);
      var r = e(x.tex);
      if (window.katex) {
        try { r = katex.renderToString(x.tex, { displayMode: x.disp, throwOnError: true, output: "htmlAndMathml" }); } catch (z) {}
      }
      return x.disp ? '<span class="fm-v" data-tex="' + e(x.tex) + '">' + r + "</span>"
        : '<span class="fm" data-tex="' + e(x.tex) + '" data-pre="' + e(x.pre) + '" data-post="' + e(x.post) + '">' +
          e(x.pre) + r + e(x.post) + "</span>";
    }).join("");
  }

  // a table's lines (| a | b |; a line |---| makes the row above the header) → the table block
  function tablicaIzStrok(stroki) {
    var shapka = null, ryady = [];
    stroki.forEach(function (s) {
      if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(s)) { if (ryady.length && !shapka) shapka = ryady.pop(); return; }
      var t = s.trim().replace(/^\|/, "").replace(/\|$/, "");
      ryady.push(t.split("|").map(function (c) { return c.trim(); }));
    });
    return { vid: "tablica", shapka: shapka, stroki: ryady };
  }
  // a problem's text: its table lines drawn as the table block, the rest as text with formulas
  function tekst(s) {
    s = String(s == null ? "" : s);
    if (s.indexOf("|") < 0) return ef(s);
    var out = "", tab = [];
    s.split("\n").forEach(function (str) {
      if (/^\s*\|/.test(str)) { tab.push(str.trim()); return; }
      if (tab.length) { out += blok(tablicaIzStrok(tab)); tab = []; }
      out += (out ? " " : "") + ef(str);
    });
    if (tab.length) out += blok(tablicaIzStrok(tab));
    return out;
  }

  // one block of the list (veb/BLOKI.md); an unknown kind is a paragraph
  function blok(b) {
    switch (b && b.vid) {
      case "opredelenie":
        return '<div class="b-opr"><div class="b-metka">Определение</div><div class="tx">' + ef(b.tekst) + "</div></div>";
      case "primer":
        return '<div class="b-prim"><div class="b-metka">Пример</div><div class="tx">' + ef(b.tekst) + "</div></div>";
      case "tablica":
        // wider than the screen it scrolls sideways, never squeezed
        return '<div class="b-tab"><table>' +
          (b.shapka ? "<thead><tr>" + b.shapka.map(function (c) { return "<th>" + ef(c) + "</th>"; }).join("") + "</tr></thead>" : "") +
          "<tbody>" + (b.stroki || []).map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + ef(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>";
      case "formula":
        return '<div class="b-fm tx">' + ef("$$" + b.tex + "$$") + "</div>";
      default:
        return '<div class="b-abz tx">' + ef(b ? b.tekst : "") + "</div>";
    }
  }
  // the sheet's theory above its problems: a quiet heading «Теория», then its blocks (an export without
  // blocks: its plain text); bezZag -- no heading (a homework's text before its first problem is its
  // sample answer, Р349, and says so itself)
  function teoriya(t, bezZag) {
    if (!t || !(t.tekst || (t.bloki && t.bloki.length))) return "";
    var telo = t.bloki && t.bloki.length ? t.bloki.map(blok).join("") : '<div class="b-abz tx">' + ef(t.tekst) + "</div>";
    return '<div class="teor">' + (bezZag ? "" : '<div class="teor-zag">Теория</div>') + telo + "</div>";
  }

  // a display formula wider than its line (a phone): first smaller, down to 80 %; if that is not enough, it is
  // broken where print breaks a long display -- after a top-level sign (KaTeX's inline layout), the lines
  // centred.  An inline formula never breaks.
  // the parts between the break points grouped, so KaTeX breaks a long display only there: after a binary
  // +, −, = and after a list's comma -- outside every bracket ({ }, ( ), [ ]).  A minus or plus after a comma,
  // a bracket, «=» or at the start is a number's sign, not a break point (−17, −16)
  function poZnakam(t) {
    var out = "", cur = "", d = 0;
    function operand() { var c = cur.replace(/(\\[ ,;:!]|\s)+$/, ""); return /[0-9A-Za-z)}\]]$/.test(c) || /\\ldots$|\\dots$|\\cdots$/.test(c); }
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (c === "{" || c === "(" || c === "[") d++; else if (c === "}" || c === ")" || c === "]") d--;
      if (d === 0 && (c === "+" || c === "-" || c === "=") && cur.trim() && operand()) { out += "{" + cur + "}" + c; cur = ""; }
      else if (d === 0 && c === "," && cur.trim()) { out += "{" + cur + "},\\allowbreak "; cur = ""; }
      else cur += c;
    }
    // the space after a list's comma stays on its line, not at the start of the next
    return (out + "{" + cur + "}").replace(/,\\allowbreak \{(\\ |\s)+/g, ",\\ \\allowbreak {");
  }
  // how far the visible formula reaches, from the left of its line (KaTeX's pieces, not its hidden MathML copy)
  function shirina(f) {
    var x0 = f.getBoundingClientRect().left, r = 0;
    f.querySelectorAll(".katex-html .base").forEach(function (b) { r = Math.max(r, b.getBoundingClientRect().right - x0); });
    return r;
  }
  function vmestit(koren) {
    if (!koren || !window.katex) return;
    // an inline formula wider than its line goes to a line of its own, as a display -- the standard way
    // (owner 12.10: «формула выносится на отдельную строку»); it is not broken inside the text
    koren.querySelectorAll(".fm").forEach(function (f) {
      var tx = f.closest(".tx, td, th") || f.parentNode;
      if (!tx || !tx.clientWidth || f.closest("td, th")) return;   // a table cell scrolls with its table
      if (f.getBoundingClientRect().width <= tx.clientWidth + 1) return;
      var t = f.getAttribute("data-tex"), pre = f.getAttribute("data-pre") || "", post = f.getAttribute("data-post") || "";
      // the opening bracket stays on the text's line; a punctuation mark goes into the display, as in print
      // (not left alone on a line); a closing bracket follows the display
      var znak = /^[.,;:!?]+/.exec(post), hvost = post.slice(znak ? znak[0].length : 0);
      if (znak) t += znak[0];
      var r;
      try { r = katex.renderToString(t, { displayMode: true, throwOnError: true, output: "htmlAndMathml" }); } catch (x) { return; }
      if (pre) f.parentNode.insertBefore(document.createTextNode(pre), f);
      if (hvost) f.parentNode.insertBefore(document.createTextNode(hvost), f.nextSibling);
      f.innerHTML = r; f.setAttribute("data-tex", t); f.removeAttribute("data-pre"); f.removeAttribute("data-post");
      f.className = "fm-v iz-stroki";
    });
    koren.querySelectorAll(".fm-v").forEach(function (f) {
      if (!f.clientWidth || !window.katex) return;
      var t = f.getAttribute("data-tex");
      if (f.classList.contains("perenos")) {
        f.classList.remove("perenos");
        try { f.innerHTML = katex.renderToString(t, { displayMode: true, throwOnError: true, output: "htmlAndMathml" }); } catch (x) {}
      }
      f.style.fontSize = "";
      var w = shirina(f);
      if (!w || w <= f.clientWidth + 1) return;
      if (w * 0.8 <= f.clientWidth) { f.style.fontSize = (f.clientWidth / w * 0.98) + "em"; return; }
      try {
        f.innerHTML = katex.renderToString(poZnakam(t), { displayMode: false, throwOnError: true, output: "htmlAndMathml" });
        f.classList.add("perenos");
        var w2 = shirina(f);                        // a piece still wider than the line: a little smaller
        if (w2 > f.clientWidth + 1) f.style.fontSize = Math.max(0.8, f.clientWidth / w2 * 0.98) + "em";
      } catch (x) {}
    });
  }

  // a ready HTML (a solution from the bank): the $…$ in its text drawn as formulas; pictures (svg) and
  // formulas already drawn are not touched
  function formulyVHtml(koren) {
    if (!koren) return;
    var uzly = [], w = document.createTreeWalker(koren, NodeFilter.SHOW_TEXT, null, false), u;
    while ((u = w.nextNode())) {
      if (u.nodeValue.indexOf("$") >= 0 && !(u.parentNode.closest && u.parentNode.closest("svg, .katex, .fm, .fm-v, script, style")))
        uzly.push(u);
    }
    uzly.forEach(function (n) {
      var t = document.createElement("span");
      t.innerHTML = ef(n.nodeValue);
      while (t.firstChild) n.parentNode.insertBefore(t.firstChild, n);
      n.parentNode.removeChild(n);
    });
  }

  window.Bloki = { e: e, ef: ef, tekst: tekst, blok: blok, teoriya: teoriya, vmestit: vmestit, formulyVHtml: formulyVHtml };
})();
