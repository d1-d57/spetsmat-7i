(function () {
  "use strict";
  var tg = window.Telegram && window.Telegram.WebApp;
  var app = document.getElementById("app");
  var bok = document.getElementById("bok");
  var spisok = document.getElementById("spisok");
  var detal = document.getElementById("detal");
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (x) {}
    try { tg.setHeaderColor("#121a26"); tg.setBackgroundColor("#121a26"); tg.setBottomBarColor("#121a26"); } catch (x) {}
    if (!/^(ios|android)$/.test(tg.platform || "")) document.documentElement.classList.add("tg-shapka-otdelno");
  }
  var initData = (tg && tg.initData) || "";
  var MOB = !!tg && /^(ios|android)$/.test(tg.platform || "");
  if (tg && typeof tg.requestFullscreen === "function" && tg.isVersionAtLeast && tg.isVersionAtLeast("8.0") &&
      (MOB || /^(tdesktop|macos|web|weba|webk|unigram)$/.test(tg.platform || ""))) {
    try { if (!tg.isFullscreen) tg.requestFullscreen(); } catch (x) {}
  }
  function polnyj() { document.documentElement.classList.toggle("poln", !!(tg && tg.isFullscreen && MOB)); }
  if (tg && tg.onEvent) { try { tg.onEvent("fullscreenChanged", polnyj); } catch (x) {} }
  polnyj();
  var SHIROKIJ = window.matchMedia("(min-width: 960px)");
  var SHIROKIJ_MENU = window.matchMedia("(min-width: 820px)");
  var DVE = window.matchMedia("(min-width: 1200px)");
  try {
    SHIROKIJ_MENU.addEventListener("change", function () { if (rol) risuj(); });
    DVE.addEventListener("change", function () { if (rol) risujKa(); });
  } catch (x) {}
  var NASTR = !!(tg && tg.SettingsButton && tg.isVersionAtLeast && tg.isVersionAtLeast("7.0"));
  if (NASTR) { try { tg.SettingsButton.onClick(function () { otkrytNastrojki(); }); tg.SettingsButton.show(); } catch (x) { NASTR = false; } }

  var MES = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  function dt(s) { var p = s.split("-"); return +p[2] + " " + MES[+p[1] - 1]; }
  function dtk(s) { var p = s.split("-"); return +p[2] + "." + p[1]; }
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var ef = Bloki.ef;
  var PORYADOK = { "Л": 0, "КР": 1, "ДЗ": 2 };
  var KRUG = '<span class="znak krug" aria-label="круг"></span>';
  var TRI = '<svg class="znak" viewBox="0 0 14 14" aria-label="треугольник"><path d="M7 1.6 L12.8 12.2 H1.2 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var KOT = '<img class="kot" src="kot.webp" alt="" width="424" height="640">';
  var kotFon = document.querySelector(".kot-fon");
  var KOT_FRAZA = "";
  function kotSPrivetom() {
    if (!KOT_FRAZA) KOT_FRAZA = fraza();
    return '<div class="oblako">' + e(KOT_FRAZA) + "</div>" + KOT;
  }
  kotFon.innerHTML = KOT;
  var FILTRY = [["vse", "Всё", "Всё"], ["Л", "Л", "Листки"], ["КР", "КР", "Контрольные"], ["ДЗ", "ДЗ", "Домашняя работа"]];

  var rol = null, RAB = [], KRUZHOK = [], rezhim = "sm", filtr = "vse", otkr = null, RABOTA = {}, varPok = {};
  var VEDUSHCHIJ = false;   // the leader -- he settles the disputes (Р399); the server says so in kto-ya and refuses the others
  var SMOTRYU = false;
  var ZOVUT = { zovut: "", prozvishche: null }, pravkaImeni = false, oshibkaImeni = "";
  var SREDNIJ = null;
  function srednij(gde) {
    if (rol !== "rebyonok" || !SREDNIJ) return "";
    return '<span class="srednij ' + gde + '" title="средний балл"><span class="sr-oc">' + e(SREDNIJ.okrugl) +
      '<span class="sr-tochno">' + e(SREDNIJ.tochno.toFixed(2).replace(".", ",")) + "</span></span></span>";
  }

  var KTO_TG = String((tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 0);
  function klyuch(put) { return "7i:" + KTO_TG + ":" + put; }
  function vzyat(put) { try { var s = localStorage.getItem(klyuch(put)); return s ? JSON.parse(s) : null; } catch (x) { return null; } }
  function polozhit(put, d) {
    var s = JSON.stringify({ t: Date.now(), d: d });
    try { localStorage.setItem(klyuch(put), s); } catch (x) {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf("7i:") === 0 && k.indexOf(":meropriyatie/") > 0) localStorage.removeItem(k); });
        localStorage.setItem(klyuch(put), s);
      } catch (y) {}
    }
  }
  function zapros(put, kak) {
    kak = kak || {};
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, kak.zhdat || 10000);
    kak.headers = kak.headers || {}; kak.headers.Authorization = "tma " + initData;
    if (ctl) kak.signal = ctl.signal;
    return fetch("/7i/api/" + put, kak).then(function (r) {
      clearTimeout(t);
      if (!r.ok) return r.text().then(function () { var x = new Error("http " + r.status); x.status = r.status; throw x; });
      return r.status === 204 ? null : r.json();
    }, function (x) { clearTimeout(t); throw x; });
  }
  function api(put, popytok, neKlast) {
    var n = 0, eshcheRaz = popytok == null ? 2 : popytok;
    function raz() {
      return zapros(put).catch(function (x) {
        var eshche = !x.status || x.status >= 500 || x.status === 408 || x.status === 429;
        if (eshche && n++ < eshcheRaz) return new Promise(function (ok) { setTimeout(ok, n === 1 ? 1500 : 4000); }).then(raz);
        throw x;
      });
    }
    return raz().then(function (d) { if (!neKlast) polozhit(put, d); return d; });
  }

  var DOKLADY = "7i:doklady";
  function dolozhit(shag, chto) {
    var r = { shag: shag, ms: Math.round(window.performance && performance.now ? performance.now() : 0),
      set: navigator.onLine ? 1 : 0, pl: (tg && tg.platform) || "", v: (tg && tg.version) || "",
      sw: navigator.serviceWorker && navigator.serviceWorker.controller ? 1 : 0 };
    for (var k in chto || {}) r[k] = chto[k];
    var q = []; try { q = JSON.parse(localStorage.getItem(DOKLADY) || "[]"); } catch (x) {}
    q.push(r);
    try { localStorage.setItem(DOKLADY, JSON.stringify(q.slice(-15))); } catch (x) {}
    otpravit();
  }
  var otpravlyayu = false;
  function otpravit() {
    var q; try { q = JSON.parse(localStorage.getItem(DOKLADY) || "[]"); } catch (x) { return; }
    if (!q.length || !initData || otpravlyayu) return;
    if (SMOTRYU) { try { localStorage.removeItem(DOKLADY); } catch (x) {} return; }   // a parent's openings are not reported
    otpravlyayu = true;
    zapros("doklad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doklady: q }) })
      .then(function () {
        var ost = []; try { ost = JSON.parse(localStorage.getItem(DOKLADY) || "[]").slice(q.length); } catch (x) {}
        try { localStorage.setItem(DOKLADY, JSON.stringify(ost)); } catch (x) {}
      }, function (x) { if (x && x.status === 403) { try { localStorage.removeItem(DOKLADY); } catch (y) {} } })
      .then(function () { otpravlyayu = false; });
  }
  var NACHATO = "7i:nachato";
  try {
    var bylo = localStorage.getItem(NACHATO);
    if (bylo) dolozhit("ne-dorisoval", { davno: Math.round((Date.now() - +bylo) / 1000) });
    localStorage.setItem(NACHATO, String(Date.now()));
  } catch (x) {}
  function dorisoval() { try { localStorage.removeItem(NACHATO); } catch (x) {} }
  try { if (navigator.serviceWorker) navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (x) {}

  function obrabotat(m) {
    var k = /^(\D+)(\d+)$/.exec(m.nomer) || [null, m.nomer, "0"];
    m.vidR = k[1]; m.nomR = +k[2];
    m.zan = m.vydano || m.data;        // the journal shows a work on the day it was handed out
    return m;
  }
  function naz(m) {
    if (m.vidR === "КР" || (m.vidR === "ДЗ" && /^Домашнее задание$/.test(m.nazvanie))) return "";
    return String(m.nazvanie).replace(/^Домашнее задание · /, "").replace(/ (\d+)$/, "\u00a0$1");
  }
  function kod(m) { return m.vidR === "ДЗ" ? "ДЗ " + m.nomR : m.vidR + m.nomR; }
  function pravo(m, glavnyj) {
    if (rol !== "rebyonok") return "";
    if (glavnyj && m.vidR === "ДЗ") return "";
    if (m.sdacha === "ne-sdal") return '<span class="ns">не сдано</span>';
    if (m.ocenka) return '<span class="oc">' + e(m.ocenka) + "</span>";
    var est = (m.punkty || m.zadachi || []).some(function (p) { return p.otmetka === "+"; });
    return m.vidR === "Л" && m.ocenivaetsya && est ? '<span class="oc procherk" title="без оценки">—</span>' : "";
  }
  var SETKA = '<svg class="setka-zn" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1.4"/>' +
    '<rect x="9.5" y="3" width="5" height="5" rx="1.4"/><rect x="16" y="3" width="5" height="5" rx="1.4"/><rect x="3" y="9.5" width="5" height="5" rx="1.4"/>' +
    '<rect x="9.5" y="9.5" width="5" height="5" rx="1.4"/><rect class="da" x="16" y="9.5" width="5" height="5" rx="1.4"/><rect x="3" y="16" width="5" height="5" rx="1.4"/>' +
    '<rect class="da" x="9.5" y="16" width="5" height="5" rx="1.4"/><rect x="16" y="16" width="5" height="5" rx="1.4"/></svg>';
  function knopkaSetki(m, cls) {
    return rol === "prepod" && konduitnaya(m) ? '<span class="' + cls + '" role="button" aria-label="Кондуит" data-kd-otkryt="' + e(m.id) + '">' + SETKA + "</span>" : "";
  }
  function stroka(m, data) {
    var n = naz(m);
    return '<button class="r' + (otkr === m.id ? " otkr" : "") + '" data-id="' + e(m.id) + '"><span class="kd">' + e(kod(m)) + '</span><span class="t">' +
      (data ? '<span class="dl">' + dtk(m.zan) + "</span>" : "") +
      '<span class="naz">' + (m.vidR === "Л" ? e(n) : "") + "</span></span>" + pravo(m, true) + knopkaSetki(m, "r-setka") + "</button>";
  }

  function privet(cls) {
    if (!rol) return "";
    if (SMOTRYU) return '<div class="' + cls + '">7И' + (ZOVUT.zovut ? " · " + e(ZOVUT.zovut) : "") + "</div>";
    return '<button class="' + cls + '" data-imya="1" title="Как тебя называть?">7И' + (ZOVUT.zovut ? " · Привет, " + e(ZOVUT.zovut) : "") +
      '<span class="karandash">✎</span></button>';
  }

  function pereklyuchatel() {
    return '<div class="sw"><button class="' + (rezhim === "sm" ? "akt" : "") + '" data-s="sm">Спецмат</button><button class="' +
      (rezhim === "kr" ? "akt" : "") + '" data-s="kr">Кружок</button></div>';
  }
  function chipy() {
    return '<div class="filtr">' + FILTRY.map(function (f) {
      return '<button class="' + (filtr === f[0] ? "akt" : "") + '" data-f="' + f[0] + '">' + f[1] + "</button>";
    }).join("") + srednij("v-filtre") + "</div>";
  }
  function menyu() {   // the wide screen's left column: the same choices, in words
    function p(atr, akt, t) { return '<button class="bok-p' + (akt ? " akt" : "") + '" ' + atr + ">" + t + "</button>"; }
    return privet("bok-zag") +
      p('data-s="sm" data-f="vse"', rezhim === "sm" && filtr === "vse", "Спецмат") +
      '<div class="bok-pod">' + FILTRY.slice(1).map(function (f) {
        return p('data-s="sm" data-f="' + f[0] + '"', rezhim === "sm" && filtr === f[0], f[2]);
      }).join("") + "</div>" +
      p('data-s="kr"', rezhim === "kr", "Кружок");     // the кондуит is an instrument, not a place (Р397)
  }

  function zhurnal() {
    if (filtr !== "vse") {
      var r = RAB.filter(function (x) { return x.vidR === filtr; }).sort(function (a, b) { return b.nomR - a.nomR; });
      return '<div class="rab rab-filtr">' + r.map(function (m) { return stroka(m, true); }).join("") + "</div>";
    }
    var h = "", dni = [];
    RAB.forEach(function (x) { if (dni.indexOf(x.zan) < 0) dni.push(x.zan); });
    dni.sort().reverse();
    var tek = null;
    dni.forEach(function (d) {
      var r = RAB.filter(function (x) { return x.zan === d; }).sort(function (a, b) {
        return (PORYADOK[a.vidR] || 0) - (PORYADOK[b.vidR] || 0) || a.nomR - b.nomR;
      });
      var urok = RAB.filter(function (x) { return x.data === d; })[0] || r[0];
      if (urok.tema && urok.tema !== tek) { tek = urok.tema; h += '<h2 class="tema">' + e(tek) + "</h2>"; }
      h += '<section class="zan"><div class="zan-d">' + dt(d) + '</div><div class="rab">' + r.map(function (m) { return stroka(m, false); }).join("") + "</div></section>";
    });
    return h;
  }
  function kruzhok() {
    return KRUZHOK.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : b.nomR - a.nomR; }).map(function (m) {
      var est = (m.zadachi || m.punkty || []).length > 0;
      return '<section class="zan"><div class="zan-d">' + dt(m.data) + '</div><div class="rab">' +
        (est ? '<button class="r' + (otkr === m.id ? " otkr" : "") + '" data-id="' + e(m.id) + '">' : '<div class="r">') + '<span class="kd">' + e(m.nomer) +
        '</span><span class="t"><span class="naz">' + e(m.nazvanie) + "</span></span>" + (est ? "</button>" : "</div>") + "</div></section>";
    }).join("");
  }

  function trek(u) { return u === "△" ? "t" : (u === "" || u === "○") ? "o" : "x"; }
  function razbit(tekst) {
    var re = /\(([абвг])\)\s*/g, m, marks = [];
    while ((m = re.exec(tekst)) !== null) marks.push({ l: m[1], start: m.index, end: re.lastIndex });
    if (!marks.length) return { stem: tekst, parts: [] };
    return {
      stem: tekst.slice(0, marks[0].start).trim(),
      parts: marks.map(function (k, i) { return { l: k.l, t: tekst.slice(k.end, i + 1 < marks.length ? marks[i + 1].start : tekst.length).trim() }; })
    };
  }
  function zadachi(m, variant) {
    var probs = [], po = {};
    (m.zadachi || []).forEach(function (z) {
      var u = (z.usloviya || []).filter(function (x) { return x.variant === variant || x.variant === ""; })[0];
      if (!u) return;
      var k = /^(\d+)(.*)$/.exec(z.nomer) || [null, z.nomer, ""];
      var p = po[k[1]];
      if (!p) { p = po[k[1]] = { n: k[1], ur: z.uroven, items: [] }; probs.push(p); }
      p.items.push({ l: k[2], o: z.otmetka, bylo: z.bylo, tekst: u.tekst_zadachi, otv: u.otvet, moj: z.moj_otvet, resh: u.reshenie, ob: z.obyazatelnaya, nom: z.nomer, spor: z.spor,
        vv: z.vvod, mv: z.moj_vvod, nap: z.na_proverke });
    });
    probs.forEach(function (p) {
      p.resh = (p.items.filter(function (it) { return it.resh; })[0] || {}).resh || "";
      p.ob = p.items.some(function (it) { return it.ob; });   // obligatory (Р329): the sheet's ○ and △ tracks, all of КР and ДЗ
      var celaya = p.items.length === 1 && !p.items[0].l;
      var i0 = p.items[0];
      if (celaya) { p.stem = i0.tekst; p.parts = [{ l: "", o: i0.o, bylo: i0.bylo, otv: i0.otv, moj: i0.moj, nom: i0.nom, spor: i0.spor, vv: i0.vv, mv: i0.mv, nap: i0.nap }]; return; }
      var r = razbit(p.items[0].tekst), pom = {};
      p.items.forEach(function (it) { pom[it.l] = it; });
      p.stem = r.stem;
      p.parts = r.parts.map(function (q) {
        var it = pom[q.l];
        return { l: q.l, t: q.t, est: !!it, o: it ? it.o : null, bylo: it ? it.bylo : null, otv: it ? it.otv : null, moj: it ? it.moj : null, nom: it ? it.nom : null, spor: it ? it.spor : null,
          vv: it ? it.vv : null, mv: it ? it.mv : null, nap: it ? it.nap : false };
      });
    });
    return probs;
  }
  function ot(q) {
    if (rol !== "rebyonok" || q.est === false) return "";
    if (q.o === "+" && q.bylo) return '<span class="ot da" title="пересдано"><span class="str">−→</span>+</span>';
    return q.o === "+" ? '<span class="ot da">+</span>' : q.o === "-" ? '<span class="ot ne">−</span>' : '<span class="ot pu" aria-label="не сдано"></span>';
  }
  function otvety(q, m) {
    if (q.est === false) return "";
    var moj = q.moj ? e(q.moj) : "";
    if (q.vv && rol === "rebyonok" && m && m.vvod && m.vvod.zakryt) moj = mojVvod(m, q);
    var h = (moj ? '<span class="ov"><span class="ov-p">Твой ответ</span> ' + moj + "</span>" : "") +
      (q.nap ? '<span class="ov na-proverke">на проверке</span>' : "") +
      (q.otv ? '<span class="ov"><span class="ov-p">Ответ</span> ' + ef(q.otv) + "</span>" : "");
    return h ? '<div class="otv">' + h + "</div>" : "";
  }
  var SPOR = { otpravleno: "Отправлено учителю", zachteno: "Засчитано", ostavleno: "Проверено: ответ неверный" };
  function sporKn(m, q) {
    if (rol !== "rebyonok" || q.est === false || !q.nom) return "";
    if (q.spor) return '<div class="spor"><span class="spor-st ' + e(q.spor) + '">' + e(SPOR[q.spor] || "") + "</span></div>";
    if (q.o !== "-" || SMOTRYU) return "";
    return '<div class="spor"><button class="spor-kn" data-spor="' + e(m.id) + "|" + e(q.nom) + '">Не согласен</button>' +
      (q.sporOsh ? '<span class="spor-st oshibka">Не отправилось. Ещё раз</span>' : "") + "</div>";
  }
  function zhdetSpor(m) { return !!m && (m.zadachi || []).some(function (z) { return z.spor === "otpravleno"; }); }
  function nazhatSpor(klyuch) {
    var k = klyuch.split("|"), m = RABOTA[k[0]];
    var z = m && (m.zadachi || []).filter(function (x) { return x.nomer === k[1]; })[0];
    if (!z || z.spor || SMOTRYU) return;
    tuk();
    function perenarisovat() { if (otkr === k[0]) { var y = detal.scrollTop, wy = window.scrollY; risujDetal(); detal.scrollTop = y; window.scrollTo(0, wy); } }
    z.spor = "otpravleno"; z.sporOsh = false; perenarisovat();
    zapros("spor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rabota: k[0], punkt: k[1] }) })
      .then(function (r) { z.spor = (r && r.status) || "otpravleno"; polozhit("meropriyatie/" + encodeURIComponent(k[0]), m); perenarisovat(); },
        function () { z.spor = null; z.sporOsh = true; perenarisovat(); });
  }
  var CHERN = {}, VV_SOST = {}, DETI_VV = {}, OTKR_VVD = {}, FOTO = {};
  function vremya(iso) { var d = new Date(iso); return d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2); }
  function srokTekst(s) { var p = String(s).split("T"); return dt(p[0]) + ", " + p[1]; }
  function estVvod(mv) { return !!(mv && (mv.otvet || mv.vybor || mv.stroka || mv.foto)); }
  function fotoBlok(klyuch, put) {
    return FOTO[klyuch] ? '<img class="vv-img" alt="фото" src="' + e(FOTO[klyuch]) + '">'
      : '<button class="vv-fk" data-foto="' + e(klyuch) + '" data-put="' + e(put) + '">фото</button>';
  }
  function vvodBlok(m, q) {
    if (!q.vv || q.est === false || !q.nom) return "";
    if (rol === "prepod") return otvetyDetej(m, q);
    var mv = q.mv || {}, k = m.id + "|" + q.nom, vv = q.vv, h = "";
    var putFoto = "vvod-foto/" + encodeURIComponent(m.id) + "/" + encodeURIComponent(q.nom);
    if (m.vvod && m.vvod.zakryt) return "";       // closed: the saved answer is drawn by otvety()
    if (SMOTRYU) {                                // a parent: the child's saved answer as a line, nothing to press
      var sv = mojVvod(m, q);
      return sv ? '<div class="vv"><div class="vv-st">' + sv + (mv.kogda ? " · " + vremya(mv.kogda) : "") + "</div></div>" : "";
    }
    if (vv.vid === "vybor") h += '<div class="vv-knopki">' + vv.varianty.map(function (v) {
      return '<button class="vv-kn' + (mv.vybor === v ? " akt" : "") + '" data-vvod="' + e(k) + '" data-zn="' + e(v) + '">' + e(v) + "</button>";
    }).join("") + "</div>";
    var tekst = k in CHERN ? CHERN[k] : (mv.otvet || ""), stroka = (k + "|s") in CHERN ? CHERN[k + "|s"] : (mv.stroka || "");
    var poleOtveta = vv.vid !== "vybor" || vv.rassuzhdenie;
    if (poleOtveta || vv.stroka) {
      h += '<form class="vv-forma' + (vv.rassuzhdenie ? " dlinnyj" : "") + (vv.stroka ? " so-strokoj" : "") + '" data-vvod-forma="' + e(k) + '">' +
        (!poleOtveta ? "" : vv.rassuzhdenie ? '<textarea name="z" rows="4" maxlength="4000" placeholder="Объяснение">' + e(tekst) + "</textarea>"
          : '<input name="z" autocomplete="off" maxlength="200" ' + (vv.vid === "chislo" ? 'inputmode="decimal" placeholder="Число"'
            : 'placeholder="Все варианты через запятую"') + ' value="' + e(tekst) + '">') +
        (vv.stroka ? '<input name="s" class="vv-stroka" autocomplete="off" maxlength="500" placeholder="Почему — одной строкой" value="' + e(stroka) + '">' : "") +
        '<button type="submit">Сохранить</button>' +
        (vv.rassuzhdenie ? '<label class="vv-foto">Фото<input type="file" accept="image/*" data-vvod-foto="' + e(k) + '"></label>' : "") + "</form>";
    }
    var nesohr = (k in CHERN && CHERN[k] !== (mv.otvet || "")) || ((k + "|s") in CHERN && CHERN[k + "|s"] !== (mv.stroka || ""));
    var st = VV_SOST[k] || {}, s = st.idyot ? "сохраняю…" : st.osh ? '<span class="oshibka">' + e(st.osh) + "</span>"
      : nesohr ? "не сохранено"
      : mv.kogda ? "сохранено " + vremya(mv.kogda) : "";
    if (mv.foto && !st.idyot) s += (s ? " · " : "") + "фото " + fotoBlok(k, putFoto);
    return '<div class="vv">' + h + (s ? '<div class="vv-st">' + s + "</div>" : "") + "</div>";
  }
  function mojVvod(m, q) {
    var mv = q.mv || {}, sv = [mv.vybor, mv.otvet, mv.stroka].filter(Boolean).map(e);
    if (mv.foto) sv.push(fotoBlok(m.id + "|" + q.nom, "vvod-foto/" + encodeURIComponent(m.id) + "/" + encodeURIComponent(q.nom)));
    return sv.join(" · ");
  }
  function otvetyDetej(m, q) {
    var d = DETI_VV[m.id];
    if (!d) return "";
    var k = m.id + "|" + q.nom;
    var ryady = d.deti.filter(function (x) { return estVvod(x.punkty[q.nom]); }).map(function (x) {
      var a = x.punkty[q.nom], kf = m.id + "|" + x.id + "|" + q.nom;
      var zn = [a.vybor, a.otvet, a.stroka].filter(Boolean).map(e);
      if (a.foto) zn.push(fotoBlok(kf, "prepod/vvod-foto/" + encodeURIComponent(m.id) + "/" + encodeURIComponent(x.id) + "/" + encodeURIComponent(q.nom)));
      var o = a.otmetka === "+" ? '<span class="ot da">+</span>' : a.otmetka === "-" ? '<span class="ot ne">−</span>'
        : a.na_proverke ? '<span class="vv-np">на проверке</span>' : "";
      return '<li><span class="vv-imya">' + e(x.imya) + (x.test && !/тест/i.test(x.imya) ? " · тест" : "") + '</span><span class="vv-zn">' + zn.join(" · ") +
        '<span class="vv-kogda">' + e(vremya(a.kogda)) + "</span></span>" + o + "</li>";
    });
    return '<details class="vv-deti" data-vvd="' + e(k) + '"' + (OTKR_VVD[k] ? " open" : "") + "><summary>Ответы детей · " +
      ryady.length + " из " + d.vsego + "</summary>" + (ryady.length ? "<ul>" + ryady.join("") + "</ul>" : "") + "</details>";
  }
  function perenarisovat(id) { if (otkr === id) { var y = detal.scrollTop, wy = window.scrollY; risujDetal(); detal.scrollTop = y; window.scrollTo(0, wy); } }
  function obnovitRabotu(id) {
    api("meropriyatie/" + encodeURIComponent(id), 0).then(function (n) { RABOTA[id] = obrabotat(n); svezho[id] = Date.now(); perenarisovat(id); }, function () {});
  }
  function sohranit(k, polya, telo, tip) {
    var p = k.split("|"), id = p[0], nom = p[1], m = RABOTA[id];
    var z = m && (m.zadachi || []).filter(function (x) { return x.nomer === nom; })[0];
    if (!z || SMOTRYU) return;
    tuk();
    VV_SOST[k] = { idyot: true }; perenarisovat(id);
    var zap = telo ? zapros("vvod-foto?rabota=" + encodeURIComponent(id) + "&punkt=" + encodeURIComponent(nom),
      { method: "POST", headers: { "Content-Type": tip }, body: telo, zhdat: 60000 })
      : polya.reduce(function (pr, f) {
        return pr.then(function () {
          return zapros("vvod", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rabota: id, punkt: nom, pole: f[0], znachenie: f[1] }) });
        });
      }, Promise.resolve(null));
    zap.then(function (r) {
      if (r) z.moj_vvod = r.moj_vvod;
      VV_SOST[k] = {};
      (polya || []).forEach(function (f) {
        var ck = f[0] === "stroka" ? k + "|s" : k;
        if (f[0] !== "vybor" && CHERN[ck] === f[1]) delete CHERN[ck];
      });
      if (telo) delete FOTO[k];
      polozhit("meropriyatie/" + encodeURIComponent(id), m); perenarisovat(id);
    }, function (x) {
      var s = x && x.status;
      VV_SOST[k] = { osh: s === 409 ? "Срок прошёл — ответ не принят" : s === 413 ? "Фото слишком большое"
        : s === 400 ? "Не принято: проверь, что написано" : "Не сохранилось. Нажми ещё раз" };
      if (s === 409) obnovitRabotu(id);
      perenarisovat(id);
    });
  }
  function szhat(file, cb) {
    var fr = new FileReader();
    fr.onerror = function () { cb(null); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { cb(null); };
      img.onload = function () {
        var kf = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * kf); c.height = Math.round(img.naturalHeight * kf);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var q = 0.85;
        (function raz() {
          c.toBlob(function (b) {
            if (b && b.size > 950000 && q > 0.45) { q -= 0.15; raz(); } else cb(b && b.size <= 950000 ? b : null);
          }, "image/jpeg", q);
        })();
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function pokazatFoto(klyuch, put) {
    fetch("/7i/api/" + put, { headers: { Authorization: "tma " + initData } }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.blob();
    }).then(function (b) {
      var fr = new FileReader();
      fr.onload = function () { FOTO[klyuch] = fr.result; perenarisovat(otkr); };
      fr.readAsDataURL(b);
    }).catch(function () {});
  }
  function zagruzitOtvetyDetej(id) {
    zapros("prepod/vvod/" + encodeURIComponent(id)).then(function (d) { DETI_VV[id] = d; perenarisovat(id); }, function () {});
  }

  setInterval(function () {
    var id = otkr, m = id && RABOTA[id];
    if (rol !== "rebyonok" || !zhdetSpor(m) || (navigator.onLine === false)) return;
    api("meropriyatie/" + encodeURIComponent(id), 0).then(function (n) {
      RABOTA[id] = obrabotat(n); svezho[id] = Date.now();
      if (otkr === id) { var y = detal.scrollTop, wy = window.scrollY; risujDetal(); detal.scrollTop = y; window.scrollTo(0, wy); }
      if (!zhdetSpor(RABOTA[id])) obnovit();       // decided: the list's grades and the average too
    }, function () {});
  }, 30000);
  function polosa(m, probs) {
    var kl = { "+": "da", "-": "ne" };
    return '<div class="polosa" aria-label="Задачи">' + probs.map(function (p) {
      var cells = p.parts.length === 1 && !p.parts[0].l ? [p.parts[0]]
        : p.parts.filter(function (q) { return q.est !== false; });
      return cells.map(function (q) {
        var c = rol === "rebyonok" ? (kl[q.o] || (estVvod(q.mv) ? "est" : "")) : "";
        return '<button class="pl ' + c + '" data-k="z-' + e(m.id) + "-" + e(p.n) + '"' + (q.nom ? ' data-p="' + e(q.nom) + '"' : "") + '><span class="pl-c">' + e(p.n + q.l) + "</span></button>";
      }).join("");
    }).join("") + "</div>";
  }
  function risunki(m, variant, n) {
    var r = (m.risunki || []).filter(function (x) { return (x.variant === variant || x.variant === "") && x.zadacha === n; });
    if (!r.length) return "";
    return '<div class="ris">' + r.map(function (x) {
      return "<figure>" + x.svg + (x.podpis ? "<figcaption>" + e(x.podpis) + "</figcaption>" : "") + "</figure>";
    }).join("") + "</div>";
  }
  var RESH = {};
  function reshenie(m, p) {
    if (!p.resh) return "";
    var id = m.id + "-" + p.n;
    return '<details class="resh" data-resh="' + e(id) + '"' + (RESH[id] ? " open" : "") + "><summary>Решение</summary>" + p.resh + "</details>";
  }
  app.addEventListener("toggle", function (ev) {
    var d = ev.target; if (d && d.classList && d.classList.contains("resh")) RESH[d.getAttribute("data-resh")] = d.open;
    if (d && d.classList && d.classList.contains("vv-deti")) OTKR_VVD[d.getAttribute("data-vvd")] = d.open;
  }, true);
  function schetKn(m, q) {
    var s = rol === "prepod" && q.nom && konduitnaya(m) ? kdSchet(m) : null;
    return s ? '<button class="a-schet" data-kd-schet="' + e(q.nom) + '" data-kd-rid-schet="' + e(m.id) + '">+' + (s[q.nom] || 0) + "</button>" : "";
  }
  function zad(m, variant, p) {
    if (!p) return '<div class="z pusto"></div>';
    var z = p.ur === "○" ? KRUG : p.ur === "△" ? TRI : "";
    var odna = p.parts.length === 1 && !p.parts[0].l;
    function chast(q) { return '<span class="b">(' + e(q.l) + ")" + schetKn(m, q) + '</span><div class="tx">' + Bloki.tekst(q.t) + vvodBlok(m, q) + otvety(q, m) + sporKn(m, q) + "</div>" + ot(q); }
    var bezVvoda = !odna && !p.stem && p.parts.length;
    var p0 = odna || bezVvoda ? p.parts[0].nom : null;
    var s = '<div class="z"><div class="zv"' + (p0 ? ' data-p="' + e(p0) + '"' : "") + '><span class="nom"><span class="nom-n">' + z + e(p.n) + (p.ur === "*" ? "*" : "") + ".</span>" + (odna ? schetKn(m, p.parts[0]) : "") + "</span>" +
      (bezVvoda ? chast(p.parts[0]) : '<div class="tx">' + Bloki.tekst(p.stem) + (odna ? vvodBlok(m, p.parts[0]) + otvety(p.parts[0], m) + sporKn(m, p.parts[0]) : "") + "</div>" + (odna ? ot(p.parts[0]) : "")) + "</div>" + risunki(m, variant, p.n);
    if (!odna) s += p.parts.slice(bezVvoda ? 1 : 0).map(function (q) { return '<div class="pp"' + (q.nom ? ' data-p="' + e(q.nom) + '"' : "") + ">" + chast(q) + "</div>"; }).join("");
    return s + reshenie(m, p) + "</div>";
  }
  function teoriya(m, v) {
    return (m.teoriya || []).filter(function (x) { return x.variant === v || x.variant === ""; })[0] || null;
  }
  function teorKlyuch(t) { return t ? JSON.stringify([t.tekst, t.bloki || []]) : ""; }
  function teorBlok(t, m) { return Bloki.teoriya(t, m && m.vidR === "ДЗ"); }
  function rabota(m) {
    var vse = m.varianty && m.varianty.length ? m.varianty : [""];
    var vv = rol === "rebyonok" ? [m.moj_variant || vse[0]] : vse;
    var pok = vv.indexOf(varPok[m.id]) >= 0 ? varPok[m.id] : vv[0];
    var var_ = vv.length === 1 && vv[0] && (rol !== "rebyonok" || m.moj_variant) ? "вариант " + vv[0] : "";
    var meta = [m.vidR === "ДЗ" ? "задано " + dt(m.zan) : '<span class="l-data">' + e(dt(m.data)) + "</span>", m.vvod ? "срок " + srokTekst(m.vvod.srok) : "", var_]
      .filter(Boolean).map(function (x, i) { return i === 0 && m.vidR !== "ДЗ" ? x : e(x); }).join('<span class="l-r"> · </span>');
    var po = {}, nomera = [];
    vv.forEach(function (v) {
      po[v] = {};
      zadachi(m, v).forEach(function (p) { po[v][p.n] = p; if (nomera.indexOf(p.n) < 0) nomera.push(p.n); });
    });
    nomera.sort(function (a, b) { return a - b; });
    function obyaz(k) { return vv.some(function (v) { return po[v][k] && po[v][k].ob; }); }
    var oba = nomera.filter(obyaz), dop = nomera.filter(function (k) { return !obyaz(k); });
    nomera = oba.concat(dop);
    var zagDop = dop.length ? '<div class="dop-zag">' + (oba.length ? "Дополнительные" : "По желанию") + "</div>" : "";
    var probs = nomera.map(function (n) { return po[pok][n]; }).filter(Boolean), n = naz(m);
    var h = '<div class="l-shapka"><div><h1 class="l-zag">' + (n ? '<span class="l-kod">' + e(kod(m)) + "</span> " + e(n) : e(kod(m))) + "</h1>" +
      '<div class="l-meta">' + meta + "</div></div>" + pravo(m) + knopkaSetki(m, "l-setka") + "</div>" + polosa(m, probs);
    function ryady(f) { return oba.map(f).join("") + zagDop + dop.map(f).join(""); }
    if (vv.length > 1) {
      h += '<div class="vsw" role="tablist">' + vv.map(function (v) {
        return '<button class="' + (v === pok ? "akt" : "") + '" data-v="' + e(v) + '">Вариант ' + e(v) + "</button>";
      }).join("") + "</div>";
      var teor = vv.map(function (v) { return teoriya(m, v); });
      var teorOdna = teor.every(function (t) { return teorKlyuch(t) === teorKlyuch(teor[0]); });
      h += '<div class="zad dva" style="--n:' + vv.length + '">' + (teorOdna ? teorBlok(teor[0], m) : "") + '<div class="dva-zag">' + vv.map(function (v) {
        return '<div class="yach' + (v === pok ? " akt" : "") + '">Вариант ' + e(v) + "</div>";
      }).join("") + "</div>" + (teorOdna || !teor.some(Boolean) ? "" : '<div class="dva-ryad">' + vv.map(function (v, i) {
        return '<div class="yach' + (v === pok ? " akt" : "") + '">' + teorBlok(teor[i], m) + "</div>";
      }).join("") + "</div>") + ryady(function (k) {
        return '<div class="dva-ryad" id="z-' + e(m.id) + "-" + e(k) + '">' + vv.map(function (v) {
          return '<div class="yach' + (v === pok ? " akt" : "") + '">' + zad(m, v, po[v][k]) + "</div>";
        }).join("") + "</div>";
      }) + "</div>";
    } else {
      h += '<div class="zad">' + teorBlok(teoriya(m, vv[0]), m) + ryady(function (k) {
        return '<div class="odin" id="z-' + e(m.id) + "-" + e(k) + '">' + zad(m, vv[0], po[vv[0]][k]) + "</div>";
      }) + "</div>";
    }
    return h;
  }

  var KD = { para: null, rid: null, s: null, u: null, uSam: false, sel: null, reb: null, oshibka: "", csv: "", zakryto: null,
    kStolbcu: true, perenos: null, ubrat: null, komOtkryt: null, list: null, kolonka: null, vybor: null, vsp: null,
    kNaKolonku: false, prinimOtkr: false, varL: null };
  var KD_ZNAKI = ["✓", "И", "П", "+"];
  var KD_REZHIMY = ["+", "✓", "И", "П", "стереть"];
  var KD_REZHIM = (function () { try { var r = localStorage.getItem("7i:kd-rezhim"); return KD_REZHIMY.indexOf(r) >= 0 ? r : "+"; } catch (x) { return "+"; } })();
  function kdRezhim(r) { KD_REZHIM = r; KD.tap = null; try { localStorage.setItem("7i:kd-rezhim", r); } catch (x) {} }
  var KD_POLOVINY = [["list", "Только листок"], ["oba", "Листок и кондуит"], ["kd", "Только кондуит"]];
  var KD_POL = (function () { try { var p = localStorage.getItem("7i:kd-polovina"); return p === "list" || p === "kd" ? p : "oba"; } catch (x) { return "oba"; } })();
  function kdPolovina(p) { KD_POL = p; try { localStorage.setItem("7i:kd-polovina", p); } catch (x) {} }
  function kdPolIkona(p) {        // two panes, the shown ones filled
    var l = p !== "kd", r = p !== "list";
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="2.5" y="4.5" width="8" height="15" rx="2" fill="' + (l ? "currentColor" : "none") +
      '" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="4.5" width="8" height="15" rx="2" fill="' + (r ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.6"/></svg>';
  }
  function kdPolSwitch() {
    return '<div class="ka-pol" role="radiogroup">' + KD_POLOVINY.map(function (p) {
      return '<button class="' + (p[0] === KD_POL ? "akt" : "") + '" role="radio" aria-checked="' + (p[0] === KD_POL) + '" aria-label="' + p[1] +
        '" title="' + p[1] + '" data-kd-pol="' + p[0] + '">' + kdPolIkona(p[0]) + "</button>";
    }).join("") + "</div>";
  }
  function kdIzZhurnala(x) { return /^zhurnal:/.test(x.klyuch || ""); }
  function kdNazhatKletku(reb, punkt) {
    var k = reb + "|" + punkt, t = Date.now(), p = KD.tap && KD.tap.k === k && KD.tap.r === KD_REZHIM ? KD.tap : null;
    if (p && t - p.t < 400) return;                       // a bounce of the finger, not a second tap
    var u = KD.u && KD.u !== "*" ? KD.u : "";
    try { tg.HapticFeedback.impactOccurred("medium"); } catch (x) {}      // felt without looking
    if (KD_REZHIM === "стереть") {
      if (p && p.vid === "ster" && p.klyuchi.length) {
        p.klyuchi.forEach(function (c) { kdDejstvie({ vid: "otmena", rebyonok: reb, cel: c }, true); });
        KD.tap = { k: k, r: KD_REZHIM, t: t, vid: "vern", klyuchi: [] };
      } else {
        var seq = kdKletka(kdVid(), reb, punkt).filter(function (x) { return !kdIzZhurnala(x); });
        KD.tap = { k: k, r: KD_REZHIM, t: t, vid: "ster", klyuchi: seq.map(function (x) { return kdDejstvie({ vid: "otmena", rebyonok: reb, cel: x.klyuch }, true); }) };
      }
      return kdPerenarisovat();
    }
    if (p && p.vid === "dob") {
      kdDejstvie({ vid: "otmena", rebyonok: reb, cel: p.klyuch }, true);
      KD.tap = { k: k, r: KD_REZHIM, t: t, vid: "snyal" };
    } else {
      KD.tap = { k: k, r: KD_REZHIM, t: t, vid: "dob", klyuch: kdDejstvie({ vid: "podhod", rebyonok: reb, punkt: punkt, znak: KD_REZHIM, u_kogo: u }, true) };
    }
  }
  function kdRezhimy() {
    var och = KD_OCH.length ? '<span class="ka-och">' + KD_OCH.length + "</span>" : "";
    return '<div class="kd-rezhimy" role="radiogroup">' + KD_REZHIMY.map(function (r) {
      return '<button class="' + (r === KD_REZHIM ? "akt" : "") + (r === "+" ? " da" : "") + (r === "стереть" ? " ster" : "") + '" role="radio" aria-checked="' +
        (r === KD_REZHIM) + '" data-kd-rezhim="' + e(r) + '">' + e(r) + "</button>";
    }).join("") + och + "</div>";
  }
  function konduitnaya(m) { return !!m && !m.seminar && KD_VIDY_PARY.indexOf(m.vid) >= 0; }
  var KD_YAVKA = [["ne-prishel", "Не пришёл"], ["seminar", "Семинар"], ["otslushka", "Отслушка"]];
  var KD_REK = [["seminar", "Семинар"], ["otslushka", "Отслушка"]];
  var KD_UROVEN = { "○": KRUG, "△": TRI };
  var KD_VIDY_PARY = ["листок", "мини-листок", "кр", "ср"];   // = bot7i/konduit.py VIDY_PARY (a test holds them equal)
  var KD_PAUZY = [1500, 4000, 10000, 15000];
  var KD_CHERN = {}, IMYA = "", kdNastrVzyato = false;
  var KD_OCH = (function () { try { return JSON.parse(localStorage.getItem(klyuch("konduit-ochered")) || "[]"); } catch (x) { return []; } })();
  var KD_OTKAZY = (function () { try { return JSON.parse(localStorage.getItem(klyuch("konduit-otkazy")) || "[]"); } catch (x) { return []; } })();
  var kdIdyot = false, kdPauza = 0, kdTajmer = 0, kdSeti = true, kdNomer = 0, kdNeHranitsya = false;
  var KD_KODY = ["klyuch", "vid", "rebyonok", "punkt", "znak", "cel", "uzhe-otmeneno", "dlinno", "znaki", "metka", "yavka",
    "rekomendaciya", "variant", "pusto", "pole", "klyuch-zanyat", "sobytie", "rabota"];
  var KD_500 = 3, kdOsh500 = {};
  function kdZapisat(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (x) {}
    try {
      Object.keys(localStorage).forEach(function (q) {
        if (q.indexOf("7i:") === 0 && (q.indexOf(":prepod/konduit/") > 0 || q.indexOf(":meropriyatie/") > 0)) localStorage.removeItem(q);
      });
      localStorage.setItem(k, v); return true;
    } catch (y) { return false; }
  }
  function kdSohranitOch() {
    var ok = kdZapisat(klyuch("konduit-ochered"), JSON.stringify(KD_OCH)) && kdZapisat(klyuch("konduit-otkazy"), JSON.stringify(KD_OTKAZY));
    if (kdNeHranitsya !== !ok) { kdNeHranitsya = !ok; kdPerenarisovat(); }
  }
  function kdSegodnya() {
    try { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date()); } catch (x) { return new Date().toISOString().slice(0, 10); }
  }
  function kdNastr() { polozhit("konduit-nastr", { u: KD.uSam ? KD.u : null, para: KD.para === KD_PES ? null : KD.para, rid: KD.rid, den: kdSegodnya() }); }
  function kdPary() {
    var seg = kdSegodnya(), d = [];
    RAB.forEach(function (m) { if (konduitnaya(m) && m.data !== seg && d.indexOf(m.data) < 0) d.push(m.data); });
    return [seg].concat(d.sort().reverse(), kdPesochnica());   // every past pair: the old sheets live there too (Р402)
  }
  var KD_PES = "pesochnica";
  function kdPesochnica(para, dlinno) {
    if (para === undefined) return [KD_PES];
    return para === KD_PES ? "Песочница" : dlinno ? dt(para) : dtk(para);
  }
  function kdRab(s) { return (s.raboty || []).filter(function (r) { return r.id === KD.rid; })[0] || null; }
  function kdW(s, rid) {
    var po = (s.po_rabotam = s.po_rabotam || {}), k = rid || KD.rid;
    return po[k] || (po[k] = { kletki: {}, otmeneny: {}, variant: {} });
  }
  function kdRabotaSobytiya(z) { return z.telo.rabota || (/^\d{4}-\d\d-\d\d$/.test(z.mid) ? null : z.mid); }
  function kdVTojPare(s, z) { return z.mid === s.para || (s.raboty || []).some(function (r) { return r.id === z.mid; }); }
  function kdKorotko(fio) { var p = String(fio).split(/\s+/); return p.length > 1 ? p[1] + " " + p[0].charAt(0) + "." : String(fio); }
  function kdAvtor(a) { return /^бумага /.test(a || "") ? String(a).split(" · ")[0] : a === "журнал" ? a : kdKorotko(a || ""); }
  function kdBezVremeni(a) { return /^бумага /.test(a || "") || a === "журнал"; }
  function kdImena(s) {
    var pervoe = {}, n = {}, out = {};
    s.deti.forEach(function (d) { var p = String(d.imya).split(/\s+/); pervoe[d.id] = p.length > 1 ? p.slice(1).join(" ") : p[0]; n[pervoe[d.id]] = (n[pervoe[d.id]] || 0) + 1; });
    s.deti.forEach(function (d) { var p = String(d.imya).split(/\s+/); out[d.id] = pervoe[d.id] + (n[pervoe[d.id]] > 1 && p.length > 1 ? " " + p[0].charAt(0) + "." : ""); });
    return out;
  }
  function kdImya(s, id) { return kdImena(s)[id] || id; }
  function kdPolnoe(d) { var p = String(d.imya).split(/\s+/); return p.length > 1 ? p.slice(1).join(" ") + " " + p[0] : String(d.imya); }
  function kdPoImeni(s, deti) { var im = kdImena(s); return deti.slice().sort(function (a, b) { return String(im[a.id]).localeCompare(String(im[b.id]), "ru"); }); }
  function kdSvoyaMetka(s) {
    function nn(x) { return String(x || "").trim().toLowerCase().replace(/ё/g, "е"); }
    var kand = [ZOVUT.prozvishche, String(IMYA).split(/\s+/).slice(-1)[0], ZOVUT.zovut].map(nn).filter(Boolean);
    for (var i = 0; i < kand.length; i++) {
      var m = s.prinimayushchie.filter(function (x) { return nn(x) === kand[i]; })[0];
      if (m) return m;
    }
    return null;
  }
  function kdRebyonok(s, id) { return s.deti.filter(function (d) { return d.id === id; })[0] || null; }
  function kdVariant(s, d) { var r = kdRab(s); return kdW(s).variant[d.id] || (r && r.varianty_detej[d.id]) || ""; }
  function kdKletka(s, reb, punkt) { return (kdW(s).kletki[reb] || {})[punkt] || []; }
  function kdGde(s, reb) { var y = s.yavka[reb]; return y === "seminar" || y === "ne-prishel" ? y : s.gruppa[reb] ? "u" : "net"; }

  function kdPrimenit(s, t, o, zhdet, rid) {
    var u = t.u_kogo || (o && o.u_kogo) || s.gruppa[t.rebyonok] || "", kogda = (o && o.kogda) || t.kogda_klienta;
    function bez(spisok) { return (spisok || []).filter(function (x) { return x.klyuch !== t.cel; }); }
    if (t.vid === "podhod") {
      if (!rid) return;
      var w = kdW(s, rid), kl = (w.kletki[t.rebyonok] = w.kletki[t.rebyonok] || {}), seq = (kl[t.punkt] = kl[t.punkt] || []);
      if (!seq.some(function (x) { return x.klyuch === t.klyuch; }))
        seq.push({ znak: t.znak, klyuch: t.klyuch, avtor: IMYA, u_kogo: u, kogda: kogda, zhdet: !!zhdet, n: o ? o.id : null });
    } else if (t.vid === "otmena") {
      Object.keys(s.po_rabotam || {}).forEach(function (rr) {    // the attempt is in one of the pair's works
        var w = s.po_rabotam[rr], k = w.kletki[t.rebyonok] || {};
        Object.keys(k).forEach(function (p) {
          k[p].forEach(function (x) {          // the cell's history keeps it: who took it back and when
            if (x.klyuch !== t.cel) return;
            var r = (w.otmeneny[t.rebyonok] = w.otmeneny[t.rebyonok] || {}), sp = (r[p] = r[p] || []);
            if (!sp.some(function (y) { return y.klyuch === x.klyuch; }))
              sp.push({ znak: x.znak, klyuch: x.klyuch, avtor: x.avtor, kogda: x.kogda, n: x.n, otmenil: IMYA, otmeneno: kogda, otmena: t.klyuch, zhdet: !!zhdet });
          });
          k[p] = bez(k[p]);
        });
        var o = w.otmeneny[t.rebyonok] || {};
        Object.keys(o).forEach(function (p) {
          var nazad = o[p].filter(function (x) { return x.otmena === t.cel; });
          if (!nazad.length) return;
          o[p] = o[p].filter(function (x) { return x.otmena !== t.cel; });
          var seq = (k[p] = k[p] || []);
          nazad.forEach(function (x) { seq.push({ znak: x.znak, klyuch: x.klyuch, avtor: x.avtor, u_kogo: u, kogda: x.kogda, n: x.n, zhdet: !!zhdet }); });
          seq.sort(function (a, b) { return (a.n == null ? Number.MAX_SAFE_INTEGER : a.n) - (b.n == null ? Number.MAX_SAFE_INTEGER : b.n); });
          w.kletki[t.rebyonok] = k;
        });
      });
      if (s.kommentarii[t.rebyonok]) s.kommentarii[t.rebyonok] = bez(s.kommentarii[t.rebyonok]);
    } else if (t.vid === "perenos" || t.vid === "prinimayushchij") {
      if (t.znachenie && s.prinimayushchie.indexOf(t.znachenie) < 0) s.prinimayushchie.push(t.znachenie);
      if (t.vid === "perenos") { if (t.znachenie) s.gruppa[t.rebyonok] = t.znachenie; else delete s.gruppa[t.rebyonok]; }
    } else if (t.vid === "yavka" || t.vid === "rekomendaciya") {
      if (t.znachenie) s[t.vid][t.rebyonok] = t.znachenie; else delete s[t.vid][t.rebyonok];
    } else if (t.vid === "variant") {
      if (rid) kdW(s, rid).variant[t.rebyonok] = t.znachenie;
    } else if (t.vid === "kommentarij") {
      var c = (s.kommentarii[t.rebyonok] = s.kommentarii[t.rebyonok] || []);
      if (!c.some(function (x) { return x.klyuch === t.klyuch; }))
        c.push({ tekst: t.znachenie, klyuch: t.klyuch, avtor: IMYA, kogda: kogda, zhdet: !!zhdet });
    }
  }
  function kdVid() {
    var s = JSON.parse(JSON.stringify(KD.s));
    KD_OCH.forEach(function (z) { if (kdVTojPare(s, z)) kdPrimenit(s, z.telo, null, true, kdRabotaSobytiya(z)); });
    return s;
  }
  function kdDejstvie(telo, bezTuka) {
    if (!KD.para) return;
    if (telo.vid === "podhod" || telo.vid === "variant") { if (!KD.rid) return; telo.rabota = KD.rid; }   // a work's event
    kdNomer++;
    telo.klyuch = "k" + KTO_TG + "." + Date.now().toString(36) + "." + kdNomer + "." + Math.random().toString(36).slice(2, 7);
    telo.kogda_klienta = new Date().toISOString();
    KD_OCH.push({ mid: KD.para, telo: telo });
    kdSohranitOch(); if (!bezTuka) tuk(); kdPerenarisovat(); kdOtpravit();
    return telo.klyuch;
  }
  function kdPost(put, telo, tip) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    return fetch("/7i/api/" + put, { method: "POST", signal: ctl ? ctl.signal : undefined, body: tip ? telo : JSON.stringify(telo),
      headers: { Authorization: "tma " + initData, "Content-Type": tip || "application/json" } }).then(function (r) {
      clearTimeout(t);
      return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, b: b || {} }; });
    }, function () { clearTimeout(t); return { status: 0, b: {} }; });
  }
  var kdPodtverzhdeno = 0;            // marks confirmed so far: a session GET begun before the latest is stale
  function kdUbrat(z, kod) {
    KD_OCH = KD_OCH.filter(function (x) { return x.telo.klyuch !== z.telo.klyuch; });
    if (kod) KD_OTKAZY.push({ telo: z.telo, kod: kod });
    delete kdOsh500[z.telo.klyuch];
    kdSohranitOch();
  }
  function kdOtpravit() {
    if (kdIdyot || !KD_OCH.length || !initData) return;
    kdIdyot = true; clearTimeout(kdTajmer);
    var z = KD_OCH[0];
    kdPost("prepod/konduit/" + encodeURIComponent(z.mid) + "/sobytie", z.telo).then(function (o) {
      var otkaz = (o.status === 400 || o.status === 409) && KD_KODY.indexOf(o.b.oshibka) >= 0;
      if (o.status === 200 || otkaz) {
        kdIdyot = false;
        kdUbrat(z, otkaz ? o.b.oshibka : "");
        if (o.status === 200) {
          kdPodtverzhdeno++;
          if (KD.s && kdVTojPare(KD.s, z)) kdPrimenit(KD.s, z.telo, o.b, false, kdRabotaSobytiya(z));
        }
        kdPauza = 0; kdSeti = true; KD.oshibka = "";
        kdPerenarisovat();
        if (KD_OCH.length) kdOtpravit(); else kdZagruzit(true);
        return;
      }
      var k500 = o.status === 500 ? (kdOsh500[z.telo.klyuch] = kdOsh500[z.telo.klyuch] || { n: 0, t: Date.now() }) : null;
      if (k500) k500.n++;
      var n500 = k500 && Date.now() - k500.t >= 15000 ? k500.n : 0;
      var dalshe = function () {
        kdIdyot = false;
        kdSeti = o.status !== 0;
        KD.oshibka = o.status === 401 ? "открой журнал заново из бота"
          : o.status ? "сервер не принимает (HTTP " + o.status + ")" : "";
        kdTajmer = setTimeout(kdOtpravit, KD_PAUZY[Math.min(kdPauza++, KD_PAUZY.length - 1)]);
        kdPerenarisovat();
      };
      if (n500 < KD_500) return dalshe();
      zapros("zdorove", { zhdat: 5000 }).then(function () {
        kdIdyot = false;
        kdUbrat(z, "сервер не принимает (HTTP 500)");
        kdPauza = 0; KD.oshibka = "";
        kdPerenarisovat();
        if (KD_OCH.length) kdOtpravit(); else kdZagruzit(true);
      }, dalshe);
    });
  }
  var kdZaprosN = 0, kdPokazanN = 0;
  function kdZagruzit(tiho) {
    var para = KD.para, n = ++kdZaprosN, bylo = kdPodtverzhdeno, put = "prepod/konduit/" + encodeURIComponent(para);
    if (!para) return;
    api(put, tiho ? 0 : 1, true).then(function (s) {
      if (KD.para !== para || n < kdPokazanN) return;
      if (bylo !== kdPodtverzhdeno) { if (!KD_OCH.length) kdZagruzit(true); return; }
      kdPokazanN = n;
      KD.s = s; KD.oshibka = "";
      polozhit(put, s);
      kdPerenarisovat();
    }, function (x) {
      if (KD.para !== para) return;
      KD.oshibka = x && x.status ? "Не загрузилось (HTTP " + x.status + ")" : "Нет связи";
      kdPerenarisovat();
    });
  }
  function kdVybrat(para, rid) {
    KD.para = para; KD.rid = rid || null; KD.sel = null; KD.reb = null; KD.csv = ""; KD.zakryto = null; KD.kStolbcu = true;
    var est = para && vzyat("prepod/konduit/" + encodeURIComponent(para));
    KD.s = est && est.d && est.d.para === para ? est.d : null;
    kdNastr(); kdZagruzit();
  }
  setInterval(function () {
    if (rol === "prepod" && ekran() === "kd" && KD.para && !document.hidden && !KD_OCH.length) kdZagruzit(true);
  }, 20000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kdOtpravit(); });

  function kdZnaki(seq) { return seq.map(function (x) { return x.znak; }).join(""); }
  function kdKletkaHtml(s, reb, p) {
    var seq = kdKletka(s, reb, p.nomer), sel = KD.sel && KD.sel.reb === reb && KD.sel.punkt === p.nomer;
    var posl = seq.length ? seq[seq.length - 1].znak : "";
    return '<button class="kd-k' + (posl === "+" ? " da" : "") + (seq.some(function (x) { return x.zhdet; }) ? " zhdet" : "") +
      (sel ? " sel" : "") + ((KD.posl || {})[reb] === p.nomer ? " posl" : "") + '" data-kd-k="' + e(reb + "|" + p.nomer) + '" aria-label="' + e(p.nomer) + '">' +
      e(kdZnaki(seq)) + "</button>";
  }
  function kdLit() { return SHIROKIJ_MENU.matches ? KD.kolonka : KD.list; }
  function kdSetka(s, deti, gruppy) {
    var pp = kdRab(s).punkty, sel = KD.sel || {}, im = kdImena(s), w = kdW(s), lit = kdLit();
    gruppy = gruppy || [{ zag: null, deti: deti }];
    KD.poryadok = [];
    KD.posl = {};                       // each child's latest attempt in this work: its cell gets a dot
    Object.keys(w.kletki).forEach(function (r) {
      var best = -1;
      Object.keys(w.kletki[r]).forEach(function (pn) { w.kletki[r][pn].forEach(function (x) { if (kdIzZhurnala(x)) return; var n = x.n == null ? Number.MAX_SAFE_INTEGER : x.n; if (n > best) { best = n; KD.posl[r] = pn; } }); });
    });
    var vsego = gruppy.reduce(function (a, g) { return a + g.deti.length; }, 0);
    function kl(p) { return (lit === p.nomer ? " lit" : "") + (KD.vsp === p.nomer ? " vsp" : ""); }
    function ryad(d, tusk) {
      var v = kdVariant(s, d), rek = s.rekomendaciya[d.id], y = s.yavka[d.id];
      var otkl = rek && y !== "ne-prishel" && (y || "otslushka") !== rek;      // Р380: the choice against the recommendation
      KD.poryadok.push(d.id);
      return '<tr class="' + (tusk ? "tusk" : "") + '"><th' + (sel.reb === d.id ? ' class="sel"' : "") + '><button class="kd-imya" data-kd-reb="' + e(d.id) + '">' +
        '<span class="kd-im">' + e(im[d.id]) + "</span>" + (otkl ? '<span class="kd-rek-m" title="рекомендация: ' + (rek === "seminar" ? "семинар" : "отслушка") + '">рек.</span>' : "") +
        (v ? '<span class="kd-var">' + e(v) + "</span>" : "") + "</button></th>" +
        pp.map(function (p) { return '<td class="' + kl(p) + '">' + kdKletkaHtml(s, d.id, p) + "</td>"; }).join("") + "</tr>";
    }
    return '<div class="kd-setka' + (vsego <= 8 ? " krupno" : "") + '"><table><thead><tr><th></th>' + pp.map(function (p) {
      return '<th class="kd-zp' + (p.obyazatelnaya ? "" : " dop") + (sel.punkt === p.nomer ? " sel" : "") + kl(p) + '" data-p="' + e(p.nomer) + '"><button class="kd-zp-k" data-kd-zag="' +
        e(p.nomer) + '">' + (KD_UROVEN[p.uroven] || "") + e(p.nomer) + "</button></th>";
    }).join("") + "</tr></thead><tbody>" + gruppy.map(function (g) {
      return (g.zag ? '<tr class="kd-gr"><th colspan="' + (pp.length + 1) + '">' + (g.u ? '<button class="kd-gr-z" data-kd-u="' + e(g.u) + '">' : '<span class="kd-gr-z">') + e(g.zag) +
        ' <span class="kd-n">' + g.deti.length + "</span>" + (g.u ? "</button>" : "</span>") + "</th></tr>" : "") +
        g.deti.map(function (d) { return ryad(d, g.tusk || kdGde(s, d.id) !== "u"); }).join("");
    }).join("") + "</tbody></table></div>";
  }
  function kdIstoriya(s, reb, punkt) {
    var vse = kdKletka(s, reb, punkt).concat((kdW(s).otmeneny[reb] || {})[punkt] || []);
    function n(x) { return x.n == null ? Number.MAX_SAFE_INTEGER : x.n; }
    return vse.sort(function (a, b) { return n(a) - n(b); });
  }
  function kdIstStroka(x) {
    function kto(a) { return a && a !== IMYA ? " " + e(kdAvtor(a)) : ""; }
    function kogda(a, t) { return kdBezVremeni(a) ? "" : " " + e(vremya(t)); }
    var chto = "<b>" + e(x.znak) + "</b>" + kto(x.avtor) + (x.zhdet && !x.otmenil ? " …" : kogda(x.avtor, x.kogda));
    return x.otmenil ? "<s>" + chto + "</s> ↶" + kto(x.otmenil) + (x.zhdet ? " …" : " " + e(vremya(x.otmeneno))) : chto;
  }
  function kdIstKartochka(vse) {
    var bum = "";
    var h = vse.map(function (x) {
      if (!x.otmenil && kdBezVremeni(x.avtor)) { bum = kdAvtor(x.avtor); return '<span class="kd-i"><b>' + e(x.znak) + "</b></span>"; }
      return '<span class="kd-i">' + kdIstStroka(x) + "</span>";
    }).join(" · ");
    return h + (bum ? ' <span class="kd-i">' + e(bum) + "</span>" : "");
  }
  var kdPosl = { k: "", z: "", t: 0 };
  function kdNeSluchajno(z) {
    var k = KD.sel.reb + "|" + KD.sel.punkt, t = Date.now();
    var sluchajno = k === kdPosl.k && z === kdPosl.z && t - kdPosl.t < 700;
    kdPosl = { k: k, z: z, t: t };
    return !sluchajno;
  }
  function kdZnak(z) {
    if (!KD.sel || KD.zakryto === KD.sel.reb + "|" + KD.sel.punkt || !kdNeSluchajno(z)) return;
    if (z === "+") KD.zakryto = KD.sel.reb + "|" + KD.sel.punkt;
    try { tg.HapticFeedback.impactOccurred("medium"); } catch (x) {}      // a sign is felt without looking
    kdDejstvie({ vid: "podhod", rebyonok: KD.sel.reb, punkt: KD.sel.punkt, znak: z, u_kogo: KD.u && KD.u !== "*" ? KD.u : "" }, true);
  }
  function kdPopap() { return !!(tg && tg.showPopup && tg.isVersionAtLeast && tg.isVersionAtLeast("6.2")); }
  function kdOtmenit(podtverzhdeno) {
    var seq = KD.sel && KD.s ? kdKletka(kdVid(), KD.sel.reb, KD.sel.punkt).filter(function (x) { return !kdIzZhurnala(x); }) : [];
    if (!seq.length || (!podtverzhdeno && !kdNeSluchajno("↶"))) return;
    var moi = seq.filter(function (x) { return x.avtor === IMYA; }), cel = moi.length ? moi[moi.length - 1] : seq[seq.length - 1];
    if (!moi.length && !podtverzhdeno) {
      KD.sprosit = { klyuch: cel.klyuch, znak: cel.znak, avtor: cel.avtor, kletka: KD.sel.reb + "|" + KD.sel.punkt };
      if (kdPopap()) {
        var sel = KD.sel;
        try {
          tg.showPopup({ message: "Снять «" + cel.znak + "» (" + kdAvtor(cel.avtor) + ")?", buttons: [{ id: "da", type: "destructive", text: "Снять" }, { id: "net", type: "cancel" }] },
            function (b) { var sp = KD.sprosit; KD.sprosit = null; if (b === "da" && sp && KD.sel === sel) kdOtmenit(true); else kdPerenarisovat(); });
          return;
        } catch (x) {}
      }
      kdPerenarisovat(); return;
    }
    KD.sprosit = null;
    KD.zakryto = null;                 // a «+» taken back: the cell is being corrected, its signs come back
    kdDejstvie({ vid: "otmena", rebyonok: KD.sel.reb, cel: cel.klyuch });
  }
  var KD_VYBOR_ZHIVYOT = 30000, kdTajmerVybora = 0;
  function kdVyborZhivyot() {
    clearTimeout(kdTajmerVybora);
    if (!KD.sel) return;
    kdTajmerVybora = setTimeout(function () {
      if (!KD.sel) return;
      KD.sel = null; KD.zakryto = null;
      kdPerenarisovat();
    }, KD_VYBOR_ZHIVYOT);
  }
  function kdSdvinut(dr, dc) {
    if (!KD.sel || !KD.s || !kdRab(KD.s)) return;
    var pp = kdRab(KD.s).punkty.map(function (p) { return p.nomer; }), c = pp.indexOf(KD.sel.punkt);
    var ryady = KD.reb ? [KD.reb] : (KD.poryadok || []), r = ryady.indexOf(KD.sel.reb);
    if (KD.reb) { c += dr || dc; } else { r += dr; c += dc; }     // the card is one column: any arrow walks its items
    if (r < 0 || r >= ryady.length || c < 0 || c >= pp.length) return;
    KD.sel = { reb: ryady[r], punkt: pp[c] }; KD.zakryto = null;
    if (SHIROKIJ_MENU.matches && !KD.reb) { KD.kolonka = pp[c]; KD.kListu = true; }
    kdVyborZhivyot(); kdPerenarisovat();
    var el = KA.querySelector(".kd-k.sel");
    if (el) try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (x) {}
  }
  document.addEventListener("keydown", function (ev) {
    if (ekran() !== "kd" || !KD.s || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var t = ev.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    var z = { "1": "✓", "2": "И", "3": "П", "4": "+", "+": "+", "=": "+" }[ev.key];
    var sdvig = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[ev.key];
    if (!KD.sel || !(z || sdvig || ev.key === "Backspace" || ev.key === "Delete")) return;
    ev.preventDefault();
    if (z) kdZnak(z); else if (sdvig) kdSdvinut(sdvig[0], sdvig[1]); else kdOtmenit();
  });
  function kdOpisat(o, s) {
    var t = o.telo, d = s && t.rebyonok && kdRebyonok(s, t.rebyonok);
    var chto = t.vid === "podhod" ? t.znak + " " + t.punkt : t.vid === "otmena" ? "↶" : t.vid === "kommentarij" ? "комментарий" : t.vid;
    return (d ? kdImya(s, d.id) + " · " : "") + chto + " (" + o.kod + ")";
  }
  function kdOshibka(s) {
    var t = KD.oshibka || (KD_OCH.length && !kdSeti ? "нет связи" : "");
    if (kdNeHranitsya) t = (t ? t + " · " : "") + "очередь не сохраняется";
    var h = t ? '<span class="kd-ne">' + e(t) + "</span>" : "";
    if (KD_OTKAZY.length) h += '<span class="kd-otkazy">Не принято: ' + KD_OTKAZY.map(function (o) { return e(kdOpisat(o, s)); }).join("; ") +
      ' <button data-kd-otkazy="1">Понятно</button></span>';
    return h ? '<div class="ka-osh">' + h + "</div>" : "";
  }
  function kdPanel(s) {
    var sel = KD.sel, d = sel && kdRebyonok(s, sel.reb), seq = sel ? kdKletka(s, sel.reb, sel.punkt) : [];
    var zakryto = !!d && KD.zakryto === sel.reb + "|" + sel.punkt;
    var och = KD_OCH.length ? '<span class="ka-och">' + KD_OCH.length + "</span>" : "";
    var sp = KD.sprosit && sel && KD.sprosit.kletka === sel.reb + "|" + sel.punkt && !kdPopap() ? KD.sprosit : null;
    if (sp) return '<div class="kd-panel">' + och + '<div class="kd-sprosit">снять «' + e(sp.znak) + "» (" + e(kdAvtor(sp.avtor)) +
      ')? <button data-kd-da="1">да</button> <button data-kd-net="1">нет</button></div></div>';
    return '<div class="kd-panel">' + och + '<div class="kd-kn5">' + KD_ZNAKI.map(function (z, i) {
      return '<button class="' + (z === "+" ? "da" : "") + '" data-kd-znak="' + e(z) + '"' + (d && !zakryto ? "" : " disabled") + '><span class="kd-klav">' + (i + 1) + "</span>" + e(z) + "</button>";
    }).join("") + '<button class="kd-otm" data-kd-otmena="1" aria-label="↶"' + (seq.length ? "" : " disabled") + '><span class="kd-klav">⌫</span>↶</button></div></div>';
  }
  function kdInstr() {
    return '<div class="kd-instr"><label class="kd-kn">Загрузить распределение<input type="file" accept=".csv,text/csv" data-kd-csv="1"></label>' +
      '<form class="kd-metka" data-kd-metka="1"><input name="m" maxlength="30" autocomplete="off" placeholder="Новый принимающий"><button type="submit">+</button></form>' +
      (KD.para === KD_PES ? '<button class="kd-kn" data-kd-sbros="1">Сбросить песочницу</button>' : "") +
      (KD.csv ? '<span class="kd-csv">' + e(KD.csv) + "</span>" : "") + "</div>";
  }
  function kdGruppy(s) {
    var deti = s.deti.filter(function (d) { return !d.test; }), sek = {};
    deti.forEach(function (d) { var g = kdGde(s, d.id), k = g === "u" ? "u:" + s.gruppa[d.id] : g; (sek[k] = sek[k] || []).push(d); });
    var out = s.prinimayushchie.map(function (m) { return { zag: m, u: m, deti: kdPoImeni(s, sek["u:" + m] || []) }; });
    [["seminar", "Семинар"], ["ne-prishel", "Не пришли"], ["net", "Не распределены"]].forEach(function (x) {
      if (sek[x[0]]) out.push({ zag: x[1], deti: kdPoImeni(s, sek[x[0]]), tusk: x[0] !== "net" });
    });
    return out;
  }
  function kdPeregruz(gruppy) {
    var u = gruppy.filter(function (g) { return g.u; }), vsego = u.reduce(function (a, g) { return a + g.deti.length; }, 0);
    return u.length ? Math.ceil(vsego / u.length) : 0;
  }
  function kdRaspredelenie(s, gruppy) {
    var im = kdImena(s);
    function stroka(d) {
      var rek = s.rekomendaciya[d.id], y = s.yavka[d.id];
      var otkl = rek && y !== "ne-prishel" && (y || (s.gruppa[d.id] ? "otslushka" : "")) && (y || "otslushka") !== rek;
      return '<button class="r' + (KD.reb === d.id ? " otkr" : "") + '" data-kd-reb="' + e(d.id) + '"><span class="t"><span class="naz">' + e(im[d.id]) + "</span></span>" +
        (rek ? '<span class="kd-rek' + (otkl ? " otkl" : "") + '">рек. ' + (rek === "seminar" ? "семинар" : "отслушка") + "</span>" : "") + "</button>";
    }
    return '<div class="ka-spisok">' + gruppy.filter(function (g) { return g.deti.length; }).map(function (g) {
      return '<section class="zan"><div class="zan-d">' + e(g.zag) + '<span class="kd-n">' + g.deti.length + '</span></div><div class="rab">' + g.deti.map(stroka).join("") + "</div></section>";
    }).join("") + "</div>";
  }
  function kdZhetony(s) {
    var r = s && kdRab(s), n = null;
    if (s && KD.u && KD.u !== "*") n = kdGruppy(s).filter(function (g) { return g.u === KD.u; }).map(function (g) { return g.deti.length; })[0] || 0;
    function zh(v, html, knopka) {
      return knopka ? '<button class="ka-zh' + (KD.vybor === v ? " akt" : "") + (v === "para" && KD.para === KD_PES ? " pes" : "") + '" data-kd-vybor="' + v + '">' + html + "</button>"
        : '<span class="ka-zh">' + html + "</span>";
    }
    return '<div class="ka-zhetony' + (s ? "" : " zhdyot") + '">' + zh("para", e(kdPesochnica(KD.para)), true) + (r ? zh("rab", e(r.nomer), s.raboty.length > 1) : "") +
      (s ? zh("gr", KD.u === "*" ? "Все" : e(KD.u || "") + (n !== null ? " <b>" + n + "</b>" : ""), true) : "") + "</div>";
  }
  function kdVyborHtml(s) {
    var h = "";
    if (KD.vybor === "para") {
      var pok = kdPary();
      if (KD.para && pok.indexOf(KD.para) < 0) pok.push(KD.para);
      h = '<div class="ka-ch">' + pok.map(function (d) {
        return '<button class="' + (d === KD.para ? "akt" : "") + (d === KD_PES ? " pes" : "") + '" data-kd-para="' + e(d) + '">' + e(kdPesochnica(d)) + "</button>";
      }).join("") + "</div>";
    } else if (KD.vybor === "rab" && s) {
      h = '<div class="rab">' + s.raboty.map(function (r) {
        return '<button class="r' + (r.id === KD.rid ? " otkr" : "") + '" data-kd-rid="' + e(r.id) + '"><span class="kd">' + e(r.nomer) + '</span><span class="t"><span class="naz">' + e(r.nazvanie) + "</span></span></button>";
      }).join("") + "</div>";
    } else if (KD.vybor === "gr" && s) {
      var gruppy = kdGruppy(s), dolya = kdPeregruz(gruppy), skolko = {};
      gruppy.forEach(function (g) { if (g.u) skolko[g.u] = g.deti.length; });
      h = '<div class="ka-ch">' + [["*", "Все"]].concat(s.prinimayushchie.map(function (m) { return [m, m]; })).map(function (x) {
        var n = x[0] === "*" ? null : skolko[x[0]] || 0;
        return '<button class="' + (KD.u === x[0] ? "akt" : "") + (n !== null && n > dolya ? " pere" : "") + '" data-kd-u="' + e(x[0]) + '">' + e(x[1]) + (n !== null ? " <b>" + n + "</b>" : "") + "</button>";
      }).join("") + "</div>";
    }
    return '<div class="ka-vybor-fon" data-kd-vybor-zakryt="1"></div><div class="ka-vybor">' + h + "</div>";
  }
  function kdVybor(spisok, tek, atr, kontur) {
    return '<div class="kd-vybor' + (kontur ? " kontur" : "") + '">' + spisok.map(function (x) {
      return '<button class="' + (tek === x[0] ? "akt" : "") + '" ' + atr + '="' + e(x[0]) + '">' + e(x[1]) + "</button>";
    }).join("") + "</div>";
  }
  function konduitKartochka() {
    if (!KD.s) return "";
    var s = kdVid(), d = kdRebyonok(s, KD.reb), rab = kdRab(s);
    if (!d) return "";
    var v = rab ? kdVariant(s, d) : "", u = s.gruppa[d.id] || "";
    var meta = [(rab ? rab.nomer + " · " : "") + kdPesochnica(s.para, true), v ? "вариант " + v : ""].filter(Boolean).join(" · ");
    function blok(zag, telo) { return '<div class="kd-blok"><div class="kd-zag">' + zag + "</div>" + telo + "</div>"; }
    var pn = KD.perenos && KD.perenos.reb === d.id ? KD.perenos : null;
    var h = '<div class="l-shapka"><div><h1 class="l-zag">' + e(kdPolnoe(d)) + (d.test ? " · тест" : "") + '</h1><div class="l-meta">' + e(meta) + "</div></div></div>";
    if (s.prinimayushchie.length) {
      h += '<div class="kd-prinim"><button class="kd-tok' + (KD.prinimOtkr ? " akt" : "") + '" data-kd-prinim="1">' + e(u || "—") + " ⌄</button>" +
        (pn && pn.bylo ? '<button class="kd-vernut" data-kd-vernut="1">вернуть</button>' : "") + "</div>" +
        (KD.prinimOtkr ? kdVybor(s.prinimayushchie.map(function (m) { return [m, m]; }), u, "data-kd-perenos") : "");
    }
    var b = {};
    b.zadachi = rab ? blok("Задачи", '<div class="kd-punkty">' + rab.punkty.map(function (p) {
      return '<div class="kd-p"><span class="nom">' + (KD_UROVEN[p.uroven] || "") + e(p.nomer) + "</span>" + kdKletkaHtml(s, d.id, p) +
        '<span class="kd-p-ist">' + kdIstKartochka(kdIstoriya(s, d.id, p.nomer)) + "</span></div>";
    }).join("") + "</div>") : "";
    var kom = s.kommentarii[d.id] || [];
    b.kom = '<details class="kd-blok kd-kom-sv" data-kd-kom-sv="' + e(d.id) + '"' + (KD.komOtkryt === d.id ? " open" : "") + '><summary class="kd-zag">Комментарии' +
      (kom.length ? " · " + kom.length : "") + '</summary><form class="vv-forma dlinnyj kd-kom-forma" data-kd-kom="' + e(d.id) + '"><textarea name="t" rows="3" maxlength="2000">' +
      e(KD_CHERN[d.id] || "") + '</textarea><button type="submit">Сохранить</button></form><ul class="kd-kom">' +
      kom.slice().reverse().map(function (k) {
        var moj = k.avtor === IMYA, sprosit = KD.ubrat === k.klyuch;
        return '<li class="' + (k.zhdet ? "zhdet" : "") + '"><div class="kd-kom-t">' + e(k.tekst) + '</div><div class="kd-kom-m">' + e(k.avtor) + " · " + e(vremya(k.kogda)) +
          (moj ? (sprosit ? ' <span class="kd-ubrat">убрать? <button data-kd-ubrat-da="' + e(k.klyuch) + '">да</button> · <button data-kd-ubrat-net="1">нет</button></span>'
            : ' <button class="kd-ubrat-kn" data-kd-ubrat="' + e(k.klyuch) + '">убрать</button>') : "") + "</div></li>";
      }).join("") + "</ul></details>";
    b.yavka = blok("На паре", kdVybor(KD_YAVKA, s.yavka[d.id] || "", "data-kd-yavka"));
    b.rek = blok("Рекомендация", kdVybor(KD_REK, s.rekomendaciya[d.id] || "", "data-kd-rek", true));
    b.variant = rab && rab.varianty.length ? blok("Вариант", kdVybor(rab.varianty.map(function (x) { return [x, x]; }), v, "data-kd-variant")) : "";
    var poryadok = KD.u === "*" ? ["yavka", "zadachi", "kom", "rek", "variant"] : ["zadachi", "kom", "yavka", "rek", "variant"];
    return '<div class="ka-kart">' + h + poryadok.map(function (k) { return b[k]; }).join("") + "</div>";
  }
  function kdRabota(rid) { return RAB.concat(KRUZHOK).filter(function (x) { return x.id === rid; })[0] || null; }
  function kdZadachaHtml(punkt, vRabotu) {
    var m = kdRabota(KD.rid);
    if (!m || !punkt) return "";
    var vv = m.varianty && m.varianty.length ? m.varianty : [""], reb = KD.sel && KD.sel.reb, sv = reb && KD.s && kdRebyonok(KD.s, reb);
    var v = KD.varL && vv.indexOf(KD.varL) >= 0 ? KD.varL : (sv && vv.indexOf(kdVariant(KD.s, sv)) >= 0 ? kdVariant(KD.s, sv) : vv[0]);
    var pr = null, q = null;
    zadachi(m, v).forEach(function (p) { p.parts.forEach(function (x) { if (x.nom === punkt) { pr = p; q = x; } }); });
    var pu = (kdRab(KD.s) || { punkty: [] }).punkty.filter(function (x) { return x.nomer === punkt; })[0] || {};
    var h = '<div class="ka-zd"><div class="ka-zd-v"><span class="ka-zd-n">' + (KD_UROVEN[pu.uroven] || "") + e(punkt) + "</span>" +
      (vv.length > 1 ? '<span class="ka-zd-var">' + vv.map(function (x) { return '<button class="' + (x === v ? "akt" : "") + '" data-kd-var-l="' + e(x) + '">' + e(x) + "</button>"; }).join("") + "</span>" : "") +
      (vRabotu && pr ? '<button class="ka-zd-list" data-kd-v-rabotu="' + e(pr.n) + '">' + e(kod(m)) + " ›</button>" : "") + "</div>";
    if (!pr) return h + "</div>";
    h += '<div class="tx">' + Bloki.tekst(pr.stem || "") + (q.l ? '<span class="ka-chast"><span class="b">(' + e(q.l) + ")</span> " + Bloki.tekst(q.t || "") + "</span>" : "") + "</div>" +
      risunki(m, v, pr.n) + (q.otv ? '<div class="ka-otv">' + ef(q.otv) + "</div>" : "");
    return h + "</div>";
  }
  function kdFront(s) {
    var rab = kdRab(s), pp = rab.punkty.filter(function (p) { return p.obyazatelnaya; }), f = [];
    if (!pp.length) pp = rab.punkty;
    (KD.poryadok || []).forEach(function (id) {
      if (kdGde(s, id) !== "u" && KD.u !== "*") return;
      var est = rab.punkty.some(function (p) { return kdKletka(s, id, p.nomer).length; });
      if (!est) return;
      for (var i = 0; i < pp.length; i++) {
        var seq = kdKletka(s, id, pp[i].nomer);
        if (!seq.length || seq[seq.length - 1].znak !== "+") { f.push(i); return; }
      }
      f.push(pp.length - 1);
    });
    if (!f.length) return pp.length ? pp[0].nomer : null;
    f.sort(function (a, b) { return a - b; });
    return pp[f[Math.floor((f.length - 1) / 2)]].nomer;
  }
  function kdKStolbcuX(setka, punkt) {
    var zag = setka.querySelectorAll("thead th.kd-zp"), imena = setka.querySelector("thead th"), i = -1;
    for (var j = 0; j < zag.length; j++) if (zag[j].getAttribute("data-p") === punkt) i = j;
    if (i < 0 || !imena) return;
    var th = zag[Math.max(0, i - (SHIROKIJ_MENU.matches ? 2 : 0))];
    setka.style.scrollPaddingLeft = Math.ceil(imena.getBoundingClientRect().width) + "px";
    setka.scrollLeft += th.getBoundingClientRect().left - imena.getBoundingClientRect().right;
  }
  function kdKraj(setka) {
    var r = setka.getBoundingClientRect(), th = setka.querySelectorAll("thead th"), granica = r.width;
    for (var i = 1; i < th.length; i++) {
      var b = th[i].getBoundingClientRect();
      if (b.right > r.right + 0.5) { granica = Math.max(0, b.left - r.left); break; }
    }
    var m = granica >= r.width ? "none" : "linear-gradient(to right, #000 " + granica + "px, rgba(0,0,0,.12) " + granica + "px)";
    setka.style.webkitMaskImage = m; setka.style.maskImage = m;
  }
  document.addEventListener("scroll", function (ev) {
    var s = ev.target;
    if (s && s.classList && s.classList.contains("kd-setka") && !s._kraj) {
      s._kraj = true;
      requestAnimationFrame(function () { s._kraj = false; kdKraj(s); });
    }
  }, true);
  window.addEventListener("resize", function () { if (ekran() === "kd") risujKa(); });

  var KA = document.getElementById("ka"), KA_IST = document.getElementById("ka-ist");
  function risujKa() {
    var vK = ekran() === "kd" && !!rol;
    document.documentElement.classList.toggle("v-konduite", vK);
    if (tg && MOB) { try { if (vK) tg.disableVerticalSwipes(); else tg.enableVerticalSwipes(); } catch (x) {} }
    if (!vK) { KA.hidden = true; KA.innerHTML = ""; return; }
    KA.hidden = false;
    var shir = SHIROKIJ_MENU.matches, dve = DVE.matches;
    var s0 = KA.querySelector(".kd-setka"), sx = s0 ? s0.scrollLeft : 0, sy = s0 ? s0.scrollTop : 0;
    var k0 = KA.querySelector(".ka-kart-obl"), ky = k0 ? k0.scrollTop : 0;
    var b0 = KA.querySelector(".ka-bok"), by = b0 ? b0.scrollTop : 0, bylList = b0 && b0.getAttribute("data-rid");
    var l0 = KA.querySelector(".ka-list-telo"), ly = l0 ? l0.scrollTop : 0;
    var a = document.activeElement, kom = a && a.closest && a.closest("#ka [data-kd-kom]");
    var kk = kom && kom.getAttribute("data-kd-kom"), c0 = kom && a.selectionStart, c1 = kom && a.selectionEnd;
    var s = KD.s && KD.s.para === KD.para ? kdVid() : null, telo = "", rab = null;
    if (s) {
      if (KD.rid && !kdRab(s)) KD.rid = null;
      if (!KD.rid && s.raboty.length) KD.rid = s.raboty[0].id;     // the catalog's first work of the pair
      if (!KD.uSam || (KD.u !== "*" && s.prinimayushchie.indexOf(KD.u) < 0)) { KD.u = kdSvoyaMetka(s) || "*"; KD.uSam = false; }
      rab = kdRab(s);
    }
    var kart = !!KD.reb && !!s && !!kdRebyonok(s, KD.reb);
    var mPol = shir && rab && kdRabota(KD.rid), pol = mPol ? KD_POL : "oba";      // the halves: a computer, a work of the pair
    if (pol === "list") kart = false;
    if (!s) telo = KD.oshibka ? '<p class="tiho">' + e(KD.oshibka) + '<br><button class="knopka" data-kd-obnovit="1">Обновить</button></p>' : "";
    else if (kart && (!shir || pol === "kd")) telo = '<div class="ka-kart-obl">' + konduitKartochka() + "</div>";
    else if (!rab) telo = '<p class="tiho ka-net">На ' + e(kdPesochnica(s.para, true)) + " работ нет</p>" + (KD.u === "*" ? kdRaspredelenie(s, kdGruppy(s)) : "");
    else if (KD.u === "*") telo = kdSetka(s, null, kdGruppy(s).filter(function (g) { return g.deti.length; }));
    else {
      var deti = kdPoImeni(s, Object.keys(s.gruppa).filter(function (k) { return s.gruppa[k] === KD.u; }).map(function (k) { return kdRebyonok(s, k); }).filter(Boolean));
      deti = deti.filter(function (d) { return kdGde(s, d.id) === "u"; }).concat(deti.filter(function (d) { return kdGde(s, d.id) !== "u"; }));
      telo = deti.length ? kdSetka(s, deti) : '<p class="tiho ka-net">У ' + e(KD.u) + " пока нет детей</p>";
    }
    var list = !shir && !kart && rab && KD.list;
    var h = '<header class="ka-verh">' + (shir ? '<button class="ka-nazad" data-kd-nazad="1">‹ ' + e(kdNazadKuda()) + "</button>" : "") + kdZhetony(s) + "</header>" +
      '<div class="ka-telo' + (list ? " s-listom" : "") + '">' + (rab && s ? kdRezhimy() : "") + telo +
      (list ? '<div class="ka-list"><div class="ka-ruchka" aria-hidden="true"></div><div class="ka-list-telo">' + kdZadachaHtml(KD.list, true) + "</div></div>" : "") +
      (s ? kdOshibka(s) : "") + "</div>";
    var levo = "", m = rab && kdRabota(KD.rid);
    if (shir && pol !== "kd") {
      if (kart) levo = '<div class="ka-kart-obl">' + konduitKartochka() + "</div>";
      else if (m && (dve || pol === "list")) levo = '<div class="ka-sheet">' + rabota(m) + "</div>";
      else if (rab) levo = kdZadachaHtml(KD.kolonka || KD.front || (rab.punkty[0] || {}).nomer, true);
      h += '<aside class="ka-bok' + (kart ? " s-kartochkoj" : "") + '" data-rid="' + e(kart ? "" : KD.rid || "") + '">' + levo + "</aside>";
    }
    if (mPol) h += kdPolSwitch();
    if (KD.vybor) h += kdVyborHtml(s);
    KA.className = "ka" + (KD.para === KD_PES ? " pes" : "") + (shir && dve && !kart && m ? " dve" : "") + (mPol ? " pol-" + pol : "");
    KA.innerHTML = h;
    KA.setAttribute("data-och", String(KD_OCH.length));      // the queue's length, for the checks (konduit_ochered.py)
    var vb = KA.querySelector(".ka-vybor"), hd = KA.querySelector(".ka-zhetony");
    if (vb && hd) vb.style.top = Math.round(hd.getBoundingClientRect().bottom + 8) + "px";
    var b1 = KA.querySelector(".ka-bok"), sw = KA.querySelector(".ka-pol");
    if (sw) {                       // at the seam of the halves; with one half, at the edge where the other one was
      var kr = KA.getBoundingClientRect(), bb = b1 && b1.getBoundingClientRect();
      sw.style.left = (pol === "oba" && bb ? bb.right + 32 : pol === "list" ? kr.right - 32 : kr.left + 32) + "px";
    }
    if (b1) {
      b1.querySelectorAll(".resh").forEach(Bloki.formulyVHtml);
      try { Bloki.vmestit(b1); } catch (x) {}
      if (bylList === b1.getAttribute("data-rid")) b1.scrollTop = by;
      var kq = KD.kolonka && KD.kolonka.replace(/"/g, '\\"');
      var lit = kq && b1.querySelector('.ka-sheet .odin [data-p="' + kq + '"], .ka-sheet .yach.akt [data-p="' + kq + '"]');
      if (lit) {
        (lit.classList.contains("pp") ? lit : lit.closest(".z") || lit).classList.add("tek");
        if (KD.kListu) { KD.kListu = false; try { (lit.closest(".odin, .dva-ryad") || lit).scrollIntoView({ block: "start", behavior: "smooth" }); } catch (x) {} }
      }
    }
    var l1 = KA.querySelector(".ka-list-telo"); if (l1) { l1.scrollTop = ly; try { Bloki.vmestit(l1); } catch (x) {} }
    var k1 = KA.querySelector(".ka-kart-obl"); if (k1) k1.scrollTop = ky;
    var st = KA.querySelector(".kd-setka");
    if (st) {
      var im0 = st.querySelector("thead th");
      if (im0) st.style.scrollPaddingLeft = Math.ceil(im0.getBoundingClientRect().width) + "px";
      st.scrollLeft = sx; st.scrollTop = sy;
      if (s && rab && KD.kStolbcu) { KD.kStolbcu = false; KD.front = kdFront(s); if (KD.front) kdKStolbcuX(st, KD.front); if (shir && !dve) risujKa(); }
      else if (KD.kNaKolonku && KD.kolonka) { KD.kNaKolonku = false; kdKStolbcuX(st, KD.kolonka); }
      if (list && KD.sel) { var c = st.querySelector(".kd-k.sel"); if (c) { var cr = c.getBoundingClientRect(), sr = st.getBoundingClientRect(); if (cr.bottom > sr.bottom - 4) st.scrollTop += cr.bottom - sr.bottom + 8; } }
      kdKraj(st);
    }
    if (kk) {
      var n = KA.querySelector('[data-kd-kom="' + kk.replace(/"/g, '\\"') + '"] textarea');
      if (n) { try { n.focus({ preventScroll: true }); n.setSelectionRange(c0, c1); } catch (z) {} }
    }
    if (KD.vsp) { var vs = KD.vsp; setTimeout(function () { if (KD.vsp === vs) { KD.vsp = null; KA.querySelectorAll(".vsp").forEach(function (x) { x.classList.remove("vsp"); }); } }, 1800); }
  }
  function kdNazadKuda() {
    for (var i = STEK.length - 2; i >= 0; i--) if (STEK[i].e === "rabota" && RABOTA[STEK[i].id]) return kod(RABOTA[STEK[i].id]);
    return "Журнал";
  }
  function kdPerenarisovat() {
    if (!rol) return;
    if (ekran() === "kd") return risujKa();
    if (ekran() === "nastr") return perenarisovatDetal();
  }
  function kdOtkryt(o) {
    o = o || {};
    var para = o.para || kdParaPoUmolch();
    if (KD.para !== para || !KD.s) kdVybrat(para, o.rid);
    else if (o.rid && o.rid !== KD.rid) { KD.rid = o.rid; KD.kStolbcu = true; kdNastr(); }
    KD.sel = null; KD.reb = null; KD.list = null; KD.vybor = null; KD.zakryto = null; KD.prinimOtkr = false; KD.varL = null;
    KD.kolonka = o.punkt || null; KD.vsp = o.punkt || null; KD.kListu = !!o.punkt;
    if (o.punkt) { KD.kStolbcu = false; KD.kNaKolonku = true; } else KD.kStolbcu = true;
    tuk();
    if (ekran() === "kd") return risujKa();
    idti({ e: "kd", zamena: !!o.zamena });
  }
  function kdParaPoUmolch() {
    var seg = kdSegodnya(), d = [];
    RAB.forEach(function (m) { if (konduitnaya(m) && m.data <= seg && d.indexOf(m.data) < 0) d.push(m.data); });
    return d.sort().reverse()[0] || seg;
  }
  function kdParaSegodnya() { var seg = kdSegodnya(); return RAB.some(function (m) { return konduitnaya(m) && m.data === seg; }); }
  var kdPolosaP = null;
  function kdChitaemyj() {
    var verhEkrana = Math.max(0, (document.querySelector(".shapka") || { getBoundingClientRect: function () { return { bottom: 0 }; } }).getBoundingClientRect().bottom);
    var niz = window.innerHeight;
    function vidno(el) { var r = el.getBoundingClientRect(); return r.bottom > verhEkrana + 8 && r.top < niz && r.height > 0; }
    var akt = detal.querySelectorAll(".dva-ryad .yach.akt [data-p], .odin [data-p], .dva-ryad .yach.akt .zv[data-p]");
    if (kdPolosaP) {
      for (var j = 0; j < akt.length; j++) if (akt[j].getAttribute("data-p") === kdPolosaP && vidno(akt[j])) return kdPolosaP;
    }
    for (var i = 0; i < akt.length; i++) if (vidno(akt[i])) return akt[i].getAttribute("data-p");
    return null;
  }
  var KD_SESSII = {};
  function kdSchet(m) {
    var s = KD.s && KD.s.para === m.data ? kdVid() : KD_SESSII[m.data];
    if (!s) return null;
    var w = (s.po_rabotam || {})[m.id], out = {}, est = false;
    if (w) Object.keys(w.kletki).forEach(function (reb) {
      Object.keys(w.kletki[reb]).forEach(function (p) {
        var seq = w.kletki[reb][p];
        if (seq.length) est = true;
        if (seq.length && seq[seq.length - 1].znak === "+") out[p] = (out[p] || 0) + 1;
      });
    });
    return est || m.data >= kdSegodnya() ? out : null;
  }
  function kdSchetZagruzit(m) {
    if (rol !== "prepod" || !konduitnaya(m) || KD_SESSII[m.data] === "idyot") return;
    var put = "prepod/konduit/" + encodeURIComponent(m.data), est = vzyat(put);
    if (est && est.d && !KD_SESSII[m.data]) KD_SESSII[m.data] = est.d;
    api(put, 0, true).then(function (s) {
      KD_SESSII[m.data] = s; polozhit(put, s);
      if (otkr === m.id && ekran() === "rabota") perenarisovatDetal();
    }, function () {});
  }
  function kdNazhat(t) {
    var el;
    if (t.closest("[data-kd-nazad]")) { nazad(); return true; }
    if ((el = t.closest("[data-kd-vybor-zakryt]"))) { KD.vybor = null; risujKa(); return true; }
    if ((el = t.closest("[data-kd-vybor]"))) { var vb = el.getAttribute("data-kd-vybor"); KD.vybor = KD.vybor === vb ? null : vb; tuk(); risujKa(); return true; }
    if ((el = t.closest("[data-kd-para]"))) {
      KD.vybor = null; KD.list = null; KD.reb = null; KD.kolonka = null;
      kdVybrat(el.getAttribute("data-kd-para")); tuk(); risujKa(); return true;
    }
    if ((el = t.closest("[data-kd-rid]"))) {     // another work of the pair: the same children, its own items
      KD.vybor = null; KD.rid = el.getAttribute("data-kd-rid"); KD.sel = null; KD.zakryto = null; KD.list = null; KD.kolonka = null; KD.kStolbcu = true;
      kdNastr(); tuk(); risujKa(); return true;
    }
    if ((el = t.closest("[data-kd-u]"))) {
      KD.vybor = null; KD.u = el.getAttribute("data-kd-u"); KD.uSam = true; KD.sel = null; KD.reb = null; KD.list = null; KD.kStolbcu = true;
      kdNastr(); tuk(); risujKa(); return true;
    }
    if ((el = t.closest("[data-kd-zag]"))) {     // a column's heading: its task
      var pz = el.getAttribute("data-kd-zag"); tuk();
      if (KD.sel && KD.sel.punkt !== pz) KD.sel = null;
      if (SHIROKIJ_MENU.matches) { KD.reb = null; KD.kolonka = pz; KD.kListu = true; KD.varL = null; risujKa(); return true; }
      KD.list = KD.list === pz ? null : pz; KD.varL = null;
      risujKa(); return true;
    }
    if ((el = t.closest("[data-kd-var-l]"))) { KD.varL = el.getAttribute("data-kd-var-l"); risujKa(); return true; }
    if ((el = t.closest("[data-kd-v-rabotu]"))) {
      var m = kdRabota(KD.rid);
      if (m) { RABOTA[m.id] = m; kdSchetZagruzit(m); idti({ e: "rabota", id: m.id, k: "z-" + m.id + "-" + el.getAttribute("data-kd-v-rabotu") }); }
      return true;
    }
    if ((el = t.closest(".ka-sheet [data-kd-schet]"))) { kdKolonka(el.getAttribute("data-kd-schet"), true); return true; }
    if ((el = t.closest(".ka-sheet .pl[data-p]"))) { kdKolonka(el.getAttribute("data-p"), false); return true; }
    if ((el = t.closest(".ka-sheet .nom, .ka-sheet .b"))) { var dp = el.closest("[data-p]"); if (dp) kdKolonka(dp.getAttribute("data-p"), true); return true; }
    if ((el = t.closest(".ka-sheet [data-k]"))) { return false; }
    if ((el = t.closest("[data-kd-k]"))) {
      var p = el.getAttribute("data-kd-k").split("|"), punkt = p.slice(1).join("|");
      KD.sel = { reb: p[0], punkt: punkt }; KD.zakryto = null; KD.sprosit = null;   // the touched cell stays ringed (the keys act on it)
      if (KD.list && !SHIROKIJ_MENU.matches) KD.list = punkt;                     // the sheet follows the touched column
      if (SHIROKIJ_MENU.matches && !el.closest(".ka-kart") && KD.kolonka !== punkt) { KD.kolonka = punkt; KD.kListu = true; }
      kdVyborZhivyot(); kdNazhatKletku(p[0], punkt); risujKa(); return true;
    }
    if ((el = t.closest("[data-kd-pol]"))) { kdPolovina(el.getAttribute("data-kd-pol")); tuk(); risujKa(); return true; }
    if ((el = t.closest("[data-kd-rezhim]"))) { kdRezhim(el.getAttribute("data-kd-rezhim")); tuk(); risujKa(); return true; }
    if ((el = t.closest("[data-kd-znak]"))) { kdZnak(el.getAttribute("data-kd-znak")); return true; }
    if (t.closest("[data-kd-otmena]")) { kdOtmenit(); return true; }
    if (t.closest("[data-kd-da]")) { kdOtmenit(true); return true; }
    if (t.closest("[data-kd-net]")) { KD.sprosit = null; risujKa(); return true; }
    if ((el = t.closest("[data-kd-reb]"))) {
      KD.reb = el.getAttribute("data-kd-reb"); KD.list = null; KD.vybor = null; KD.prinimOtkr = false;
      KD.sel = null; KD.perenos = null; KD.ubrat = null;     // the card opens with nothing selected: a sign cannot go to a row out of sight
      tuk(); risujKa();
      var k = KA.querySelector(".ka-kart-obl"); if (k) k.scrollTop = 0;
      return true;
    }
    if (t.closest("[data-kd-prinim]")) { KD.prinimOtkr = !KD.prinimOtkr; tuk(); risujKa(); return true; }
    var polya = [["data-kd-yavka", "yavka"], ["data-kd-rek", "rekomendaciya"], ["data-kd-variant", "variant"], ["data-kd-perenos", "perenos"]];
    for (var i = 0; i < polya.length; i++) {
      if ((el = t.closest("[" + polya[i][0] + "]"))) {
        var zn = el.getAttribute(polya[i][0]), vid = polya[i][1];
        if (el.classList.contains("akt")) { if (vid === "yavka" || vid === "rekomendaciya") zn = ""; else { KD.prinimOtkr = false; risujKa(); return true; } }   // a second tap takes it back
        if (vid === "perenos") { KD.perenos = { reb: KD.reb, bylo: (KD.s && KD.s.gruppa[KD.reb]) || "", stalo: zn }; KD.prinimOtkr = false; }
        kdDejstvie({ vid: vid, rebyonok: KD.reb, znachenie: zn });
        return true;
      }
    }
    if ((el = t.closest("[data-kd-vernut]"))) {
      if (KD.perenos) { var pr = KD.perenos; KD.perenos = null; kdDejstvie({ vid: "perenos", rebyonok: pr.reb, znachenie: pr.bylo }); }
      return true;
    }
    if ((el = t.closest("[data-kd-ubrat]"))) { KD.ubrat = el.getAttribute("data-kd-ubrat"); risujKa(); return true; }
    if ((el = t.closest("[data-kd-ubrat-da]"))) { KD.ubrat = null; kdDejstvie({ vid: "otmena", rebyonok: KD.reb, cel: el.getAttribute("data-kd-ubrat-da") }); return true; }
    if (t.closest("[data-kd-ubrat-net]")) { KD.ubrat = null; risujKa(); return true; }
    if (t.closest("[data-kd-otkazy]")) { KD_OTKAZY = []; kdSohranitOch(); risujKa(); return true; }
    if (t.closest("[data-kd-obnovit]")) { KD.oshibka = ""; kdZagruzit(); risujKa(); return true; }
    return false;
  }
  function kdKolonka(p, vListe) {
    tuk();
    KD.reb = null; KD.kolonka = p; KD.vsp = p; KD.kNaKolonku = true; KD.kListu = !vListe; KD.varL = null;
    if (KD.sel && KD.sel.punkt !== p) KD.sel = null;
    risujKa();
  }
  KA.addEventListener("click", function (ev) {
    if (kdDolgoBylo && ev.target.closest(".kd-k")) { kdDolgoBylo = false; return; }
    if (kdNazhat(ev.target)) return;
    var k = ev.target.closest(".ka-sheet [data-k]");
    if (k) { var c = KA.querySelector('.ka-sheet [id="' + k.getAttribute("data-k") + '"]'); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }
    var v = ev.target.closest(".ka-sheet [data-v]");
    if (v) { varPok[KD.rid] = v.getAttribute("data-v"); risujKa(); }
  });
  KA.addEventListener("toggle", function (ev) {
    var d = ev.target;
    if (d && d.matches && d.matches("[data-kd-kom-sv]")) KD.komOtkryt = d.open ? d.getAttribute("data-kd-kom-sv") : null;
    if (d && d.classList && d.classList.contains("resh")) RESH[d.getAttribute("data-resh")] = d.open;
  }, true);
  KA.addEventListener("input", function (ev) {
    var kf = ev.target.closest && ev.target.closest("[data-kd-kom]");
    if (kf) KD_CHERN[kf.getAttribute("data-kd-kom")] = ev.target.value;
  });
  KA.addEventListener("submit", function (ev) {
    var kk = ev.target.closest("[data-kd-kom]");
    if (!kk) return;
    ev.preventDefault();
    var tekst = kk.querySelector("textarea").value.trim();
    if (!tekst) return;
    KD_CHERN[kk.getAttribute("data-kd-kom")] = "";
    kdDejstvie({ vid: "kommentarij", rebyonok: kk.getAttribute("data-kd-kom"), znachenie: tekst });
  });
  var kdDolgo = 0, kdDolgoBylo = false;
  function kdPokazatIst(el) {
    var s = KD.s && kdVid(), p = el.getAttribute("data-kd-k").split("|");
    var vse = s ? kdIstoriya(s, p[0], p.slice(1).join("|")) : [];
    if (!vse.length) return;
    KA_IST.innerHTML = vse.slice().reverse().map(function (x) { return '<div class="ka-ist-i">' + kdIstStroka(x) + "</div>"; }).join("");
    KA_IST.hidden = false;
    var r = el.getBoundingClientRect(), w = KA_IST.offsetWidth, hh = KA_IST.offsetHeight;
    var x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - hh - 8;
    if (y < 8) y = r.bottom + 8;
    KA_IST.style.left = x + "px"; KA_IST.style.top = y + "px";
    try { tg.HapticFeedback.impactOccurred("light"); } catch (z) {}
  }
  document.addEventListener("pointerdown", function (ev) {
    var el = ev.target.closest && ev.target.closest("#ka .kd-k");
    KA_IST.hidden = true; clearTimeout(kdDolgo); kdDolgoBylo = false;
    if (ekran() === "kd") kdVyborZhivyot();      // any touch in the кондуит keeps the selection alive for another 30 s
    if (!el) return;
    kdDolgo = setTimeout(function () { kdDolgoBylo = true; kdPokazatIst(el); }, 480);
  }, true);
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { document.addEventListener(n, function () { clearTimeout(kdDolgo); }, true); });
  document.addEventListener("contextmenu", function (ev) { if (ev.target.closest && ev.target.closest("#ka .kd-k")) ev.preventDefault(); });
  document.addEventListener("focusin", function (ev) { if (ev.target.closest && ev.target.closest("#ka textarea, #ka input")) KA.classList.add("klaviatura"); });
  document.addEventListener("focusout", function () { KA.classList.remove("klaviatura"); });
  document.addEventListener("keydown", function () { if (ekran() === "kd") kdVyborZhivyot(); }, true);
  function kdZagruzitCsv(file) {
    var mid = KD.para, fr = new FileReader();
    KD.csv = "загружаю…"; kdPerenarisovat();
    fr.onerror = function () { KD.csv = "файл не открылся"; kdPerenarisovat(); };
    fr.onload = function () {
      kdPost("prepod/konduit/" + encodeURIComponent(mid) + "/raspredelenie", String(fr.result), "text/csv").then(function (o) {
        KD.csv = o.status === 200 ? "детей " + o.b.detej + " · принимающих " + o.b.prinimayushchih + (o.b.neizvestnyh ? " · не узнано " + o.b.neizvestnyh : "")
          : o.status ? "не принято (" + (o.b.oshibka || "HTTP " + o.status) + ")" : "нет связи — загрузи ещё раз";
        kdZagruzit(true); kdPerenarisovat();
      });
    };
    fr.readAsText(file);
  }
  function kdSbrosit() {
    KD.csv = "…"; kdPerenarisovat();
    kdPost("prepod/konduit/" + KD_PES + "/sbros", {}).then(function (o) {
      KD.csv = o.status === 200 ? "песочница пуста" : o.status ? "не сброшено (HTTP " + o.status + ")" : "нет связи";
      kdZagruzit(true); kdPerenarisovat();
    });
  }

  function knopkaNazad() {
    if (!tg || !tg.BackButton) return;
    try { if (STEK.length) tg.BackButton.show(); else tg.BackButton.hide(); } catch (x) {}
  }
  var STEK = [], KOREN = {};
  function verh() { return STEK[STEK.length - 1] || null; }
  function ekran() { var t = verh(); return t ? t.e : "zhurnal"; }
  function idti(t) {
    var v = verh() || KOREN;
    v.y = window.scrollY; v.dy = detal.scrollTop; v.sy = spisok.scrollTop;
    STEK.push(t); pokazatEkran(true);
  }
  function pokazatEkran(novyj) {
    var t = verh() || KOREN;
    otkr = null;
    for (var i = STEK.length - 1; i >= 0; i--) if (STEK[i].e === "rabota") { otkr = STEK[i].id; break; }
    pravkaImeni = ekran() === "nastr";
    risuj();
    if (ekran() === "kd") return;
    if (novyj) {
      detal.scrollTop = 0; if (!SHIROKIJ.matches) window.scrollTo(0, 0);
      var z = t.k && detal.querySelector('[id="' + t.k + '"]');
      if (z) try { z.scrollIntoView({ block: "start" }); } catch (x) {}
      var inp = ekran() === "nastr" && detal.querySelector(".imya-forma input"); if (inp && !MOB) inp.focus();
    } else { detal.scrollTop = t.dy || 0; spisok.scrollTop = t.sy || 0; window.scrollTo(0, t.y || 0); }
  }
  function nazad() {
    if (ekran() === "kd") {           // the кондуит's own steps first: a token's choice, the receiver's choice, the sheet, the card
      if (KD.vybor) { KD.vybor = null; return risujKa(); }
      if (KD.prinimOtkr) { KD.prinimOtkr = false; return risujKa(); }
      if (KD.list && !SHIROKIJ_MENU.matches) { KD.list = null; return risujKa(); }
      if (KD.reb) { KD.reb = null; KD.sel = null; return risujKa(); }
    }
    if (!STEK.length) return;
    STEK.pop(); pokazatEkran(false);
  }
  function otkrytNastrojki() { if (!rol || SMOTRYU || ekran() === "nastr") return; oshibkaImeni = ""; idti({ e: "nastr" }); }
  var shapka = document.getElementById("shapka");
  function risujShapku() {
    var h = "", t = ekran(), m = otkr && RABOTA[otkr];
    if (t === "rabota" && m) h = '<span class="sh-naz">' + e(kod(m)) + ' <span class="sh-d">' + e(dtk(m.vidR === "ДЗ" ? m.zan : m.data)) + "</span></span>" + knopkaSetki(m, "sh-setka");
    else if (t === "zhurnal") h = pereklyuchatel();
    shapka.innerHTML = '<div class="sh-ryad">' + h + "</div>";
  }
  var svyaz = null;
  function strokaSvyazi() {
    if (!svyaz) return "";
    var d = new Date(svyaz.t), seg = new Date().toDateString() === d.toDateString();
    var kogda = (seg ? "" : d.getDate() + " " + MES[d.getMonth()] + ", ") + d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
    return '<p class="svyaz">' + (svyaz.zanovo ? "Журнал на " + kogda + ". Открой его заново из бота, чтобы обновить"
      : "Нет связи. Журнал на " + kogda) + "</p>";
  }
  function risujSpisok() {
    spisok.innerHTML = strokaSvyazi() + privet("privet") + (rezhim === "sm" ? srednij("v-uglu") + chipy() + zhurnal() : kruzhok()) +
      '<div class="kot-konec">' + kotSPrivetom() + "</div>" + '<button class="k-zhurnal" data-k-zhurnal="1">‹ Журнал</button>';
  }
  function nastrojkiHtml() {
    var h = '<form class="imya-forma nastr-imya" data-imya-forma="1"><h1 class="l-zag">Как тебя называть?</h1><div class="if-ryad"><input name="imya" maxlength="20" autocomplete="off" value="' +
      e(ZOVUT.prozvishche || "") + '"><button type="submit">Готово</button></div>' + (oshibkaImeni ? '<span class="oshibka">' + e(oshibkaImeni) + "</span>" : "") + "</form>";
    if (rol === "prepod" && VEDUSHCHIJ) {
      if (!KD.para) kdVybrat(kdParaPoUmolch());
      h += '<div class="kd-blok"><div class="kd-zag">Пара ' + e(kdPesochnica(KD.para, true)) + "</div>" + kdInstr() + "</div>";
    }
    return '<div class="nastr">' + h + "</div>";
  }
  function perenarisovatDetal() { var y = detal.scrollTop, wy = window.scrollY; risujDetal(); detal.scrollTop = y; window.scrollTo(0, wy); }
  function risujDetal() {
    var a = document.activeElement, f = a && a.closest && a.closest("[data-vvod-forma]");
    var fk = f && f.getAttribute("data-vvod-forma"), s0 = fk && a.selectionStart, s1 = fk && a.selectionEnd;
    var nastr = ekran() === "nastr", fi = nastr && a && a.closest && a.closest("[data-imya-forma]") ? a.value : null;
    detal.innerHTML = nastr ? nastrojkiHtml() : otkr && RABOTA[otkr] ? rabota(RABOTA[otkr]) : "";
    if (fi !== null) { var ni = detal.querySelector("[data-imya-forma] input"); if (ni) { ni.value = fi; try { ni.focus({ preventScroll: true }); } catch (x) {} } }
    if (fk) {
      var n = detal.querySelector('[data-vvod-forma="' + fk.replace(/"/g, '\\"') + '"] [name=' + (a.name === "s" ? "s" : "z") + "]");
      if (n) { try { n.focus({ preventScroll: true }); n.setSelectionRange(s0, s1); } catch (x) {} }
    }
    detal.querySelectorAll(".resh").forEach(Bloki.formulyVHtml);   // the solutions' formulas (veb/BLOKI.md)
    vmestitFormuly();
  }
  function vmestitFormuly() { Bloki.vmestit(detal); }   // a display wider than its line: veb/bloki.js
  window.addEventListener("resize", function () { if (otkr) vmestitFormuly(); });
  if (document.fonts && document.fonts.addEventListener)
    document.fonts.addEventListener("loadingdone", function () { if (otkr) vmestitFormuly(); });
  (function () {
    var s = document.createElement("script");
    s.src = "katex/katex.min.js";
    s.onload = function () {
      if (otkr) risujDetal();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (otkr) vmestitFormuly(); });
    };
    document.head.appendChild(s);
  })();
  function mestoKota() {
    var last = bok.lastElementChild;
    if (last) document.documentElement.style.setProperty("--menu-niz", Math.ceil(last.getBoundingClientRect().bottom) + "px");
  }
  window.addEventListener("resize", mestoKota);
  function risuj() {
    kotFon.innerHTML = kotSPrivetom();
    bok.innerHTML = menyu();
    mestoKota();
    risujShapku();
    risujSpisok();
    risujDetal();
    app.classList.toggle("s-rabotoj", !!otkr || ekran() === "nastr");
    app.classList.toggle("s-kruzhkom", !!otkr && !!RABOTA[otkr] && RABOTA[otkr].vid === "кружок" && ekran() === "rabota");
    knopkaNazad();
    risujKa();
  }
  var BOT = "https://t.me/conduit_57i_bot";
  var UCHITEL = "";
  function tiho(t, ssylka, prichina) {
    dorisoval();
    app.classList.remove("s-rabotoj"); bok.innerHTML = ""; detal.innerHTML = "";
    var chto = ssylka === "bot" ? '<a href="' + BOT + '">Открыть бота</a>'
      : ssylka === "obnovit" ? '<button class="knopka" data-obnovit="1">Обновить</button>' +
        '' : "";
    spisok.innerHTML = KOT + '<p class="tiho">' + e(t) + (chto ? "<br>" + chto : "") +
      (prichina ? '<br><span class="prichina">' + e(prichina) + "</span>" : "") + "</p>";
  }
  spisok.addEventListener("scroll", function () { spisok.classList.toggle("prokrucheno", spisok.scrollTop > 2); }, { passive: true });
  function tuk() { try { tg.HapticFeedback.selectionChanged(); } catch (x) {} }
  function otkryt(id) {
    tuk();
    var mp = rol === "prepod" && kdRabota(id);
    if (mp && konduitnaya(mp) && DVE.matches) { RABOTA[id] = mp; return kdOtkryt({ para: mp.data, rid: id, zamena: true }); }
    if (ekran() === "rabota") STEK.pop();          // the narrow list beside a work: another work takes its place
    var shown = false;
    function pokazat() { if (!shown) { shown = true; idti({ e: "rabota", id: id }); } else perenarisovatDetal(); }
    if (rol === "prepod") {
      RABOTA[id] = mp;
      if (RABOTA[id] && RABOTA[id].vvod) zagruzitOtvetyDetej(id);
      if (RABOTA[id]) kdSchetZagruzit(RABOTA[id]);
      return pokazat();
    }
    var put = "meropriyatie/" + encodeURIComponent(id), est = RABOTA[id] || vzyat(put);
    if (est && !RABOTA[id]) RABOTA[id] = obrabotat(est.d);
    if (RABOTA[id]) pokazat();
    if (svezho[id] && Date.now() - svezho[id] < 300000 && !zhdetSpor(RABOTA[id])) return;
    api(put, RABOTA[id] ? 2 : 0).then(function (m) {
      svezho[id] = Date.now();
      var bylo = !!RABOTA[id];
      RABOTA[id] = obrabotat(m);
      if (!bylo) return pokazat();
      if (otkr === id) perenarisovatDetal();
    }).catch(function (x) {
      if (RABOTA[id]) return;                 // the kept one stays on the screen
      svyaz = { t: Date.now() }; risuj();
      dolozhit("rabota", { oshibka: (x && (x.status || x.name)) || "" });
    });
  }
  var svezho = {};
  function zaranee() {
    if (rol !== "rebyonok" || (navigator.connection && navigator.connection.saveData)) return;
    var ochered = RAB.concat(KRUZHOK).map(function (m) { return m.id; }).filter(function (id) {
      var est = vzyat("meropriyatie/" + encodeURIComponent(id));
      return !est || Date.now() - est.t > 6 * 3600 * 1000;
    });
    (function sled() {
      var id = ochered.shift();
      if (!id) return;
      api("meropriyatie/" + encodeURIComponent(id)).then(function (m) {
        if (!RABOTA[id] || otkr !== id) RABOTA[id] = obrabotat(m);
        svezho[id] = Date.now();
        setTimeout(sled, 300);
      }, function () {});
    })();
  }

  app.addEventListener("click", function (ev) {
    var s = ev.target.closest("[data-s]");
    if (s) {
      rezhim = s.getAttribute("data-s");
      if (s.hasAttribute("data-f")) filtr = s.getAttribute("data-f");
      STEK = []; tuk(); pokazatEkran(false); window.scrollTo(0, 0); return;
    }
    var ko = ev.target.closest("[data-kd-otkryt]");
    if (ko) {
      var mk = kdRabota(ko.getAttribute("data-kd-otkryt"));
      if (mk) kdOtkryt({ para: mk.data, rid: mk.id, punkt: ekran() === "rabota" && otkr === mk.id ? kdChitaemyj() : null });
      return;
    }
    var sc = ev.target.closest("[data-kd-schet]");
    if (sc) { var ms = kdRabota(sc.getAttribute("data-kd-rid-schet")); if (ms) kdOtkryt({ para: ms.data, rid: ms.id, punkt: sc.getAttribute("data-kd-schet") }); return; }
    if (ev.target.closest("[data-kd-csv]")) return;
    if (ev.target.closest("[data-kd-sbros]")) { kdSbrosit(); return; }
    var f = ev.target.closest("[data-f]"); if (f) { tuk(); filtr = f.getAttribute("data-f"); risuj(); return; }
    if (ev.target.closest("[data-k-zhurnal]")) { STEK = []; pokazatEkran(false); return; }
    if (ev.target.closest("[data-obnovit]")) { window.location.reload(); return; }
    if (ev.target.closest("[data-imya]")) { otkrytNastrojki(); return; }
    var sp = ev.target.closest("[data-spor]"); if (sp) { nazhatSpor(sp.getAttribute("data-spor")); return; }
    var vk = ev.target.closest("[data-vvod]"); if (vk) { sohranit(vk.getAttribute("data-vvod"), [["vybor", vk.getAttribute("data-zn")]]); return; }
    var fk = ev.target.closest("[data-foto]"); if (fk) { pokazatFoto(fk.getAttribute("data-foto"), fk.getAttribute("data-put")); return; }
    var b = ev.target.closest("[data-id]"); if (b) { otkryt(b.getAttribute("data-id")); return; }
    var v = ev.target.closest("[data-v]");
    if (v && otkr) { varPok[otkr] = v.getAttribute("data-v"); var y = detal.scrollTop, wy = window.scrollY; risujDetal(); detal.scrollTop = y; window.scrollTo(0, wy); return; }
    var k = ev.target.closest("[data-k]");
    if (k) {
      kdPolosaP = k.getAttribute("data-p");      // ▦ right after a tap in the strip lands on that item (A2)
      var t = detal.querySelector('[id="' + k.getAttribute("data-k") + '"]'); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.addEventListener("keydown", function (ev) {
    var t = ev.target;
    if (ev.key === "Escape" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && ekran() === "kd")) nazad();
  });
  ["touchmove", "wheel"].forEach(function (n) { window.addEventListener(n, function () { kdPolosaP = null; }, { passive: true }); });
  app.addEventListener("input", function (ev) {
    var f = ev.target.closest && ev.target.closest("[data-vvod-forma]");
    if (f && ev.target.name === "z") CHERN[f.getAttribute("data-vvod-forma")] = ev.target.value;
    if (f && ev.target.name === "s") CHERN[f.getAttribute("data-vvod-forma") + "|s"] = ev.target.value;
  });
  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.matches && t.matches("[data-kd-csv]") && t.files && t.files[0]) { kdZagruzitCsv(t.files[0]); t.value = ""; return; }
    if (!t.matches || !t.matches("[data-vvod-foto]") || !t.files || !t.files[0]) return;
    var k = t.getAttribute("data-vvod-foto");
    VV_SOST[k] = { idyot: true }; perenarisovat(k.split("|")[0]);
    szhat(t.files[0], function (b) {
      if (!b) { VV_SOST[k] = { osh: "Фото не открылось. Сфотографируй ещё раз" }; return perenarisovat(k.split("|")[0]); }
      sohranit(k, null, b, "image/jpeg");
    });
  });
  app.addEventListener("submit", function (ev) {
    var km = ev.target.closest("[data-kd-metka]");
    if (km) {                                     // «Новый принимающий» (⋯ → «Настройки»)
      ev.preventDefault();
      var pole = km.querySelector("input"), tekst = pole.value.trim();
      if (!tekst) return;
      pole.value = ""; kdDejstvie({ vid: "prinimayushchij", znachenie: tekst });
      KD.csv = "+ " + tekst; perenarisovatDetal();
      return;
    }
    var vf = ev.target.closest("[data-vvod-forma]");
    if (vf) {
      ev.preventDefault();
      var k = vf.getAttribute("data-vvod-forma"), polya = [], pz = vf.querySelector("[name=z]"), ps = vf.querySelector("[name=s]");
      if (pz) { CHERN[k] = pz.value; polya.push(["otvet", pz.value]); }
      if (ps) { CHERN[k + "|s"] = ps.value; polya.push(["stroka", ps.value]); }
      sohranit(k, polya);
      return;
    }
    var f = ev.target.closest("[data-imya-forma]"); if (!f) return;
    ev.preventDefault();
    var imya = f.querySelector("input").value;
    fetch("/7i/api/imya", { method: "POST", headers: { Authorization: "tma " + initData, "Content-Type": "application/json" },
      body: JSON.stringify({ imya: imya }) }).then(function (r) {
      if (r.status === 400) { oshibkaImeni = "до 20 знаков"; perenarisovatDetal(); return null; }
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (z) {
      if (!z) return;
      ZOVUT = z; oshibkaImeni = "";
      if (ekran() === "nastr") nazad(); else risuj();
    }).catch(function () { oshibkaImeni = "не сохранилось, попробуй ещё раз"; perenarisovatDetal(); });
  });
  if (tg && tg.BackButton) tg.BackButton.onClick(nazad);

  var FRAZY = ["Мур!", "Мяу!", "Привет-привет!", "Мур-мур-мур", "Кис-кис?", "Щекотно!", "Не буди кота",
    "Тыгыдык!", "Где мой корм?", "А сметана есть?", "Ты чего мышей не ловишь?", "Я поймал 67 мышей",
    "Шесть-семь!", "Плюс тысяча ауры", "Котик одобряет", "Это база", "Имба!", "Я на чиле",
    "Я не толстый, я пушистый", "Хвост на месте", "Можно погладить", "Я не сплю, я думаю", "Мяу? Мяу!",
    "Пятница скоро?", "Мур в квадрате!", "Один, два, мур!", "Ещё задачку?", "Плюсик близко",
    "Сколько у кота ушей?", "Нарисуй картинку", "Попробуй маленький пример", "Ищи закономерность",
    "Ответ проверили?", "Мур-мяу-мур", "Кто трогает кота?", "Лапки устали", "Мяу, ты молодец",
    "Мышь в домике", "Мурчу от гордости", "Сначала подумай, потом мур",
    "Мяу! Решим задачку?", "Ноль — тоже чётное, мур", "Пересчитай ещё разок", "Тш-ш, кот думает"];
  var meshok = [], bylaFraza = "";
  function fraza() {
    if (!meshok.length) {
      meshok = FRAZY.slice();
      for (var i = meshok.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = meshok[i]; meshok[i] = meshok[j]; meshok[j] = t; }
      if (meshok[meshok.length - 1] === bylaFraza) meshok.unshift(meshok.pop());   // never the same twice in a row
    }
    return (bylaFraza = meshok.pop());
  }
  document.addEventListener("click", function (ev) {
    var k = ev.target.closest(".kot-fon .kot, .kot-konec .kot");
    if (!k) return;
    tuk();
    if (!(window.kotZhivoj && kotZhivoj.mahnut(k))) { k.classList.remove("prygaet"); void k.offsetWidth; k.classList.add("prygaet"); }
    KOT_FRAZA = fraza();                       // another phrase, and it stays (every cat on the page says it)
    document.querySelectorAll(".oblako").forEach(function (o) { o.textContent = KOT_FRAZA; });
  });
  document.addEventListener("animationend", function (ev) { if (ev.target.classList) ev.target.classList.remove("prygaet"); });

  function oshibka(x) {
    if (x && x.status === 401) tiho("Открой журнал заново из бота", "bot");
    else if (x && x.status === 403) tiho("Сначала нажми /start в боте", "bot");
    else if (!x || !x.status) tiho("Нет связи. Журнал откроется сам, когда появится интернет", "obnovit",
              x && (x.name || "") + (x && x.message ? ": " + x.message : ""));
    else tiho("Журнал не открылся. Обнови страницу или закрой журнал и открой его снова", "obnovit",
              x && (x.name || "") + (x && x.message ? ": " + x.message : ""));
  }
  function prinyat(k, d) {
    SMOTRYU = k.kto === "roditel";
    rol = SMOTRYU ? "rebyonok" : k.kto;
    if (SMOTRYU && NASTR) { try { tg.SettingsButton.hide(); } catch (x) {} }
    VEDUSHCHIJ = !!k.vedushchij;
    IMYA = k.imya || "";
    ZOVUT = { zovut: k.zovut || "", prozvishche: k.prozvishche || null };
    app.classList.add(rol === "prepod" ? "prepod" : "rebyonok");
    SREDNIJ = d.srednij || null;
    RAB = []; KRUZHOK = [];
    d.meropriyatiya.forEach(function (m) {
      obrabotat(m);
      if (m.vid === "кружок") KRUZHOK.push(m); else RAB.push(m);
    });
    if (rol === "prepod") {                    // a teacher's works are the journal's own items
      RABOTA = {};
      STEK.forEach(function (t) { if (t.e === "rabota") RABOTA[t.id] = kdRabota(t.id); });
    }
    if (rol === "prepod" && !kdNastrVzyato) {
      kdNastrVzyato = true;
      var n = (vzyat("konduit-nastr") || {}).d || {}, seg = kdSegodnya();
      if (n.den === seg && n.u) { KD.u = n.u; KD.uSam = true; }
      if (kdParaSegodnya() && !STEK.length) {
        kdVybrat(seg, n.den === seg && n.para === seg ? n.rid : null);
        STEK = [{ e: "kd", zamena: DVE.matches }];
      } else if (n.den === seg && n.para) kdVybrat(n.para, n.rid);
    }
    if (rol === "prepod") kdOtpravit();
    if (pravkaImeni) return;                  // never redraw under a name being typed
    var y = detal.scrollTop, wy = window.scrollY;
    risuj();
    if (otkr) { detal.scrollTop = y; window.scrollTo(0, wy); }
    dorisoval();
  }
  var kept = vzyat("kto-ya"), keptD = kept && vzyat(kept.d.kto === "prepod" ? "prepod/meropriyatiya" : "moi-meropriyatiya");
  if (kept && keptD) prinyat(kept.d, keptD.d);
  var gruzhu = false, povtor = 0;
  function obnovit() {
    if (gruzhu) return;
    gruzhu = true; clearTimeout(povtor);
    var bylKept = !!rol, kk;
    api("kto-ya").then(function (k) {
      kk = k;
      return api(k.kto === "prepod" ? "prepod/meropriyatiya" : "moi-meropriyatiya");
    }).then(function (d) {
      svyaz = null; prinyat(kk, d);
      dolozhit("otkryt", { iz: bylKept ? "telefon" : "set" });
      zaranee();
    }, function (x) {
      dolozhit("oshibka", { oshibka: (x && (x.status || x.name)) || "", iz: bylKept ? "telefon" : "" });
      if (rol) {
        svyaz = { t: keptD ? keptD.t : Date.now(), zanovo: x && x.status === 401 };
        if (!pravkaImeni) risuj();
        dorisoval();
      } else {
        oshibka(x);
        if (!x || (x.status !== 401 && x.status !== 403)) povtor = setTimeout(obnovit, 20000);
      }
    }).then(function () { gruzhu = false; });
  }
  obnovit();
  window.addEventListener("online", function () { otpravit(); kdPauza = 0; kdOtpravit(); if (svyaz || !rol) obnovit(); });
})();
