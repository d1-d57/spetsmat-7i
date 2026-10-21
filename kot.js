// The cat comes alive (owner 11.10: «выглядит примитивно… хочется крутую анимацию»): the same
// painted picture (kot.webp), bent in a WebGL shader around a few bones -- shoulder, wrist, neck,
// the ears, the tail, the eyelids -- the way Live2D or Spine move a drawing.  Nothing is cut out,
// so no hole or seam can show; the price is that parts never slide over one another, so the paw
// waves outwards and the head tilts away from it.
// A tap: a wave of the raised paw with the wrist lagging, a head tilt that springs back, an ear
// twitch, the tail tip lifted, then a smile with the eyes shut in joy (owner 11.10: «может как-то
// улыбнуться»).  Idle: breathing, a tail flick every few seconds, a rare
// blink, an ear now and then.  Reduced motion: no idle, a tap is a blink and a small nod.
// One canvas, laid over whichever <img class="kot"> is on screen (the image stays under it and
// takes the taps); no WebGL -- the plain image and the old CSS hop (app.js).
(function () {
  "use strict";
  var W = 424, H = 640, P = 40;   // the picture in px, and the margin the moving parts may reach
  var TIHO = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");

  // every coordinate below is a pixel of kot.webp.  The picture is a fine mesh; the vertex shader
  // moves each vertex by the bones (weights taken at its place in the picture, a child bone
  // before its parent), the fragment shader closes the eyes and paints
  var VS = [
    "uniform float uPl, uKi, uGo, uUl, uUp, uHv, uDy, uRa;",
    "attribute vec2 a;",
    "varying vec2 vR;",
    "vec2 rot(vec2 p, vec2 c, float a) { vec2 d = p - c; float s = sin(a), k = cos(a);",
    "  return c + vec2(k * d.x - s * d.y, s * d.x + k * d.y); }",
    "float seg(vec2 p, vec2 a, vec2 b, out float t) { vec2 ab = b - a;",
    "  t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }",
    // the raised forearm and the palm: nothing right of the gap between the paw and the cheek
    // (owner 11.10: the cheek fur must not follow the paw), nothing above the toes (the whiskers)
    // the gap between the paw and the cheek, measured on the picture: its middle x for each y
    "float shchel(float y) {",
    "  if (y < 250.0) return mix(70.0, 82.0, clamp((y - 236.0) / 14.0, 0.0, 1.0));",
    "  if (y < 260.0) return mix(82.0, 91.0, (y - 250.0) / 10.0);",
    "  if (y < 270.0) return mix(91.0, 102.0, (y - 260.0) / 10.0);",
    "  if (y < 290.0) return mix(102.0, 107.0, (y - 270.0) / 20.0);",
    "  if (y < 321.0) return mix(107.0, 105.0, (y - 290.0) / 31.0);",
    "  if (y < 342.0) return mix(105.0, 122.0, (y - 321.0) / 21.0);",
    "  return mix(122.0, 136.0, clamp((y - 342.0) / 18.0, 0.0, 1.0)); }",
    "float otdel(vec2 p) { return (1.0 - smoothstep(-5.0, 5.0, p.x - shchel(p.y))) * smoothstep(231.0, 243.0, p.y); }",
    "float wRuka(vec2 p) { float t; float d = seg(p, vec2(118.0, 345.0), vec2(42.0, 280.0), t);",
    "  return smoothstep(0.0, 0.8, t) * (1.0 - smoothstep(46.0, 74.0, d)) * otdel(p); }",
    "float wKist(vec2 p) { return (1.0 - smoothstep(44.0, 72.0, length(p - vec2(42.0, 278.0)))) * otdel(p); }",
    "float wGolova(vec2 p) { return (1.0 - smoothstep(272.0, 314.0, p.y)) * (1.0 - wRuka(p)); }",
    "float wUho(vec2 p, vec2 a, vec2 b) { float t; float d = seg(p, a, b, t);",
    "  return smoothstep(0.05, 0.55, t) * (1.0 - smoothstep(36.0, 60.0, d)); }",
    // the tail's free end, left of its middle; the front paw beside it stays put
    "float wHvost(vec2 p) { return smoothstep(335.0, 235.0, p.x) * smoothstep(176.0, 194.0, p.x)",
    "  * smoothstep(515.0, 545.0, p.y); }",
    "vec2 kost(vec2 q, float w, vec2 c, float a) { return q + w * (rot(q, c, a) - q); }",
    "void main() {",
    "  vec2 p = a, q = a;",
    // a smile: the mouth's corners up and out
    "  q += uRa * (exp(-dot(p - vec2(172.0, 230.0), p - vec2(172.0, 230.0)) / 200.0) * vec2(-3.5, -7.0)",
    "    + exp(-dot(p - vec2(233.0, 241.0), p - vec2(233.0, 241.0)) / 200.0) * vec2(3.5, -7.0));",
    "  q = kost(q, wUho(p, vec2(150.0, 100.0), vec2(124.0, 10.0)), vec2(150.0, 100.0), uUl);",
    "  q = kost(q, wUho(p, vec2(334.0, 136.0), vec2(378.0, 58.0)), vec2(334.0, 136.0), uUp);",
    "  q = kost(q, wGolova(p), vec2(215.0, 305.0), uGo);",
    "  q = kost(q, wKist(p), vec2(74.0, 318.0), uKi);",
    "  q = kost(q, wRuka(p), vec2(118.0, 345.0), uPl);",   // the elbow, where the forearm leaves the chest
    "  q = kost(q, wHvost(p), vec2(335.0, 600.0), uHv);",
    "  vec2 c = vec2(212.0, 637.0);",
    "  q = c + (q - c) * (1.0 + vec2(0.004, 0.009) * uDy);",   // breathing
    "  vR = p;",
    "  vec2 k = (q + " + P + ".0) / vec2(" + (W + 2 * P) + ".0, " + (H + 2 * P) + ".0);",
    "  gl_Position = vec4(k.x * 2.0 - 1.0, 1.0 - k.y * 2.0, 0.0, 1.0);",
    "}"].join("\n");
  var FS = [
    "precision highp float;",
    "varying vec2 vR;",
    "uniform sampler2D uT;",
    "uniform float uMo, uRa;",
    // a blink: an upper and a lower lid of fur (taken from beside the eye) meet on a soft arc low
    // in the eye; the upper lid's edge is a dark lash line.  Joy (uRa) closes them into ∩ arcs
    // (a happy squint)
    "vec4 glaz(vec4 col, vec2 p, vec2 c, float rx, float ry, float shir, vec2 mekh) {",
    "  float u = (p.x - c.x) / (shir * rx);",
    "  float m = max(uMo, uRa);",
    "  if (m <= 0.0 || abs(u) >= 1.0) return col;",
    "  float h = sqrt(1.0 - u * u), vrh = c.y - 1.3 * ry * h, niz = c.y + 1.15 * ry * h;",
    "  float zakr = c.y + ry * mix(0.3 + 0.2 * h, 0.45 - 0.6 * h, uRa / m);",
    "  float yU = mix(vrh, zakr, m), yL = mix(niz, zakr, m);",
    "  float oval = smoothstep(vrh - 3.0, vrh, p.y) * (1.0 - smoothstep(niz, niz + 3.0, p.y)) * (1.0 - smoothstep(0.85, 1.0, abs(u)));",
    "  float veki = max(1.0 - smoothstep(yU - 0.7, yU + 0.7, p.y), smoothstep(yL - 0.7, yL + 0.7, p.y));",
    "  col = mix(col, texture2D(uT, (p + mekh) / vec2(" + W + ".0, " + H + ".0)), oval * veki * smoothstep(0.0, 0.08, m));",
    "  float t = (0.9 + 0.9 * m) * (1.0 - smoothstep(0.7, 1.0, abs(u)));",
    "  float liniya = (1.0 - smoothstep(t - 0.6, t + 0.6, abs(p.y - yU))) * smoothstep(0.0, 0.2, m);",
    "  return mix(col, vec4(0.17, 0.09, 0.06, 1.0), liniya); }",
    "void main() {",
    "  vec4 col = texture2D(uT, vR / vec2(" + W + ".0, " + H + ".0));",
    "  col = glaz(col, vR, vec2(155.5, 180.0), 16.0, 20.0, 1.3, vec2(56.0, -6.0));",
    "  col = glaz(col, vR, vec2(269.0, 200.0), 16.5, 20.0, 1.4, vec2(46.0, -8.0));",
    "  gl_FragColor = col;",
    "}"].join("\n");
  var SETKA = 4;   // the mesh step, px of the picture
  var IMENA = ["uPl", "uKi", "uGo", "uUl", "uUp", "uHv", "uMo", "uDy", "uRa"];

  var holst = document.createElement("canvas"), gl, u = {}, treug = 0, gotov = false, img = null, prozr = "1";
  holst.className = "kot-holst";
  holst.setAttribute("aria-hidden", "true");

  function zapusk(kartinka) {
    gl = holst.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    function shejder(tip, src) {
      var s = gl.createShader(tip); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var pr = gl.createProgram();
    gl.attachShader(pr, shejder(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, shejder(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    // the mesh over the picture: (nx + 1) x (ny + 1) vertices, two triangles a cell
    var nx = W / SETKA, ny = H / SETKA, v = [], t = [];
    for (var j = 0; j <= ny; j++) for (var i = 0; i <= nx; i++) v.push(i * SETKA, j * SETKA);
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var o = j * (nx + 1) + i;
      t.push(o, o + 1, o + nx + 1, o + 1, o + nx + 2, o + nx + 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(t), gl.STATIC_DRAW);
    treug = t.length;
    var a = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    IMENA.forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
    // a power-of-two copy, so the picture can have mipmaps (a small cat on a large picture)
    var c = document.createElement("canvas"); c.width = 512; c.height = 1024;
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(kartinka, 0, 0, 512, 1024);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // where the mesh folds a little (a joint bent hard), a transparent cell must not erase the fur
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    holst.addEventListener("webglcontextlost", ubrat);
    if (window.ResizeObserver) nabl = new ResizeObserver(skoro);
    gotov = true;
    postavit();
    new MutationObserver(function () { if (!img || !img.isConnected || !holst.isConnected) skoro(); })
      .observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", skoro);
    if (TIHO && TIHO.addEventListener) TIHO.addEventListener("change", function () { pusk(); });
    pusk();
  }
  // the context lost for good (a rare GPU reset): back to the plain picture
  function ubrat() {
    gotov = false;
    if (img) img.classList.remove("ozhil");
    if (holst.parentNode) holst.parentNode.removeChild(holst);
  }

  // ---- where the canvas sits: over the cat on screen now (the page redraws its cats freely)
  // every cat's size is watched: one may have no height for a moment while the page is drawn,
  // or appear when the screen turns
  var zhdu = 0, nabl = null;
  function skoro() { if (!zhdu) zhdu = requestAnimationFrame(function () { zhdu = 0; postavit(); }); }
  function vidimyj() {
    var vse = document.querySelectorAll("img.kot");
    for (var i = 0; i < vse.length; i++) if (nabl && !vse[i].nablyudayu) { vse[i].nablyudayu = true; nabl.observe(vse[i]); }
    for (i = 0; i < vse.length; i++) if (vse[i].getClientRects().length && vse[i].offsetWidth) return vse[i];
    return null;
  }
  function postavit() {
    if (!gotov) return;
    var k = vidimyj();
    if (k !== img) {
      if (img) img.classList.remove("ozhil");
      img = k;
      if (img) prozr = getComputedStyle(img).opacity;
    }
    if (!img) { if (holst.parentNode) holst.parentNode.removeChild(holst); return; }
    if (holst.previousSibling !== img) img.parentNode.insertBefore(holst, img.nextSibling);
    razmer();
    pusk();
  }
  function razmer() {
    if (!img || !holst.isConnected) return;
    var w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    var m = P * w / W, s = holst.style;
    s.opacity = prozr;
    s.width = w + 2 * m + "px"; s.height = h + 2 * m + "px";
    s.left = img.offsetLeft - m + "px"; s.top = img.offsetTop - m + "px";
    // offsetLeft is rounded: move the canvas by what is left so the cat does not shift
    var a = img.getBoundingClientRect(), b = holst.getBoundingClientRect();
    s.left = parseFloat(s.left) + (a.left - m - b.left) + "px";
    s.top = parseFloat(s.top) + (a.top - m - b.top) + "px";
    var d = Math.min(window.devicePixelRatio || 1, 2.5);
    var bw = Math.round((w + 2 * m) * d), bh = Math.round((h + 2 * m) * d);
    if (holst.width !== bw || holst.height !== bh) { holst.width = bw; holst.height = bh; }
    img.classList.add("ozhil");
    risovat(performance.now());
  }

  // ---- the motion: every value is an angle in radians (+ turns clockwise on screen), or 0..1
  function sm(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  // a spring set off at x = 0: rises to 1, overshoots a little, settles
  function pruzh(x) { return x <= 0 ? 0 : 1 - Math.exp(-7 * x) * (Math.cos(11 * x) + 7 / 11 * Math.sin(11 * x)); }
  // a quick shake that dies away (an ear, a tail flick)
  function drozh(x, k, f) { return x <= 0 ? 0 : Math.exp(-k * x) * Math.sin(f * x); }
  // a blink, 0.25 s: the lid comes down fast and goes up slower
  function morg(x) { return x <= 0 || x >= 0.25 ? 0 : x < 0.07 ? sm(0, 0.07, x) : x < 0.1 ? 1 : 1 - sm(0.1, 0.25, x); }
  function sluch(a, b) { return a + Math.random() * (b - a); }

  var TAP = 1.9;   // the tap gesture, s
  var tuk = -1e9, nachalo = performance.now() / 1000;
  var sled = { morg: nachalo + sluch(2, 5), hvost: nachalo + sluch(3, 6), uho: nachalo + sluch(7, 12) };
  var bylo = { morg: -1e9, hvost: -1e9, uho: -1e9 }, zamer = null;

  function poza(t) {
    if (zamer) return zamer;
    var tiho = TIHO && TIHO.matches, x = t - tuk;
    var z = { uPl: 0, uKi: 0, uGo: 0, uUl: 0, uUp: 0, uHv: 0, uMo: 0, uDy: 0, uRa: 0 };
    if (!tiho) {
      for (var k in sled) if (t >= sled[k]) {
        bylo[k] = sled[k];
        sled[k] = t + (k === "morg" ? sluch(3.5, 7) : k === "hvost" ? sluch(5, 9) : sluch(9, 16));
      }
      z.uDy = Math.sin((t - nachalo) * 2 * Math.PI / 3.8);
      z.uMo = morg(t - bylo.morg);
      z.uHv = 0.06 * drozh(t - bylo.hvost, 3.2, 8);
      z.uUp = 0.12 * drozh(t - bylo.uho, 10, 30);
    }
    if (x >= 0 && x < TAP) {
      if (tiho) {
        z.uGo = 0.03 * sm(0, 0.2, x) * (1 - sm(0.5, 0.8, x));
        z.uMo = Math.max(z.uMo, morg(x - 0.1));
      } else {
        var env = sm(0, 0.14, x) * (1 - sm(1.05, 1.45, x)), f = 2 * Math.PI * 2.1;
        // the forearm swings out a little from the elbow, the palm does most of the waving and
        // follows a moment later (owner 11.10: no hump between shoulder and elbow)
        z.uPl = -env * (0.065 - 0.065 * Math.cos(f * x));
        z.uKi = env * (0.17 * Math.sin(f * x - 0.7) - 0.06);
        z.uGo = 0.075 * (pruzh(x) - pruzh(x - 0.95));        // the head tilts and springs back
        z.uUp += 0.16 * drozh(x - 0.02, 9, 26);
        z.uUl = 0.1 * drozh(x - 0.12, 9, 26);
        z.uHv += 0.08 * (pruzh(x - 0.08) - pruzh(x - 0.9));
        z.uDy += 0.8 * sm(0, 0.3, x) * (1 - sm(0.6, 1.2, x));
        z.uRa = sm(0.85, 1.05, x) * (1 - sm(1.55, 1.85, x));  // and smiles, eyes shut with joy
      }
    }
    return z;
  }

  function risovat(ms) {
    if (!gotov || !holst.isConnected) return;
    var z = poza(ms / 1000);
    for (var n in z) gl.uniform1f(u[n], z[n]);
    gl.viewport(0, 0, holst.width, holst.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, treug, gl.UNSIGNED_SHORT, 0);
  }
  // one frame loop, only while the cat is on screen; idle runs at ~30 fps, a tap at full rate
  var idyot = false, posl = 0;
  function pusk() { if (!idyot && gotov && holst.isConnected) { idyot = true; requestAnimationFrame(kadr); } }
  function kadr(ms) {
    if (!gotov || !holst.isConnected) { idyot = false; return; }
    var tap = ms / 1000 - tuk < TAP, tiho = TIHO && TIHO.matches;
    if (tiho && !tap && !zamer) { risovat(ms); idyot = false; return; }
    if (tap || ms - posl > 30) { posl = ms; risovat(ms); }
    requestAnimationFrame(kadr);
  }

  // app.js calls this on a tap; false -- the cat is not alive here, use the CSS hop
  window.kotZhivoj = {
    mahnut: function (k) {
      if (!gotov || k !== img) return false;
      tuk = performance.now() / 1000;
      pusk();
      return true;
    },
    // a frozen pose, for checking the extremes (screenshots); null lets him go
    zamer: function (z) { zamer = z; if (z) risovat(performance.now()); pusk(); }
  };

  var k0 = document.querySelector("img.kot");
  var kartinka = new Image();
  kartinka.onload = function () { try { zapusk(kartinka); } catch (x) { console.warn("kot.js:", x); ubrat(); } };
  kartinka.src = (k0 && k0.getAttribute("src")) || "kot.webp";
})();
