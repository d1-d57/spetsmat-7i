(function () {
  "use strict";
  var net = window.fetch.bind(window);
  var KTO = { kto: "roditel", imya: "", pol: null, vedushchij: false, prozvishche: null, zovut: "" };
  window.fetch = function (url, kak) {
    if (typeof url !== "string" || url.indexOf("/7i/api/") !== 0) return net(url, kak);
    if (((kak && kak.method) || "GET").toUpperCase() !== "GET")
      return Promise.resolve(new Response("{}", { status: 403 }));
    var put = url.slice(8);
    if (put === "kto-ya") return Promise.resolve(new Response(JSON.stringify(KTO), { status: 200 }));
    return net("api/" + put + ".json", kak && kak.signal ? { signal: kak.signal } : undefined);
  };
  // the cat is sized to the free space under the menu, measured on «resize»: ask for it again once the menu,
  // the fonts and the list are there, so the cat never covers the menu's last item
  function izmerit() { try { window.dispatchEvent(new Event("resize")); } catch (x) {} }
  window.addEventListener("load", function () { [0, 300, 1000, 2500].forEach(function (t) { setTimeout(izmerit, t); }); });
  try { document.fonts.ready.then(izmerit); } catch (x) {}
})();
