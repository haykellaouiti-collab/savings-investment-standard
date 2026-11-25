  /* ---------- Monte Carlo retraite (Pro) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function monteCarlo(o) {
    var rnd = mulberry32(o.seed || 12345), runs = o.runs || 3000;
    var Y = Math.max(0, o.retireAge - o.age), W = Math.max(1, o.lifeExp - o.retireAge);
    var realMean = (1 + o.mean / 100) / (1 + o.inflation / 100) - 1, sd = o.vol / 100;
    var atRet = [], atEnd = [], ok = 0;
    function gauss() { var u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    for (var s = 0; s < runs; s++) {
      var bal = o.savings, y;
      for (y = 0; y < Y; y++) bal = bal * (1 + realMean + sd * gauss()) + o.monthly * 12;
      atRet.push(bal);
      var alive = true;
      for (y = 0; y < W; y++) {
        bal = bal * (1 + realMean + sd * gauss()) - o.income * 12;
        if (bal <= 0) { alive = false; bal = 0; break; }
      }
      if (alive) ok++;
      atEnd.push(bal);
    }
    function pct(arr, p) { var a = arr.slice().sort(function (x, y2) { return x - y2; }); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; }
    return { success: ok / runs * 100, ret10: pct(atRet, 0.1), ret50: pct(atRet, 0.5), ret90: pct(atRet, 0.9), end10: pct(atEnd, 0.1), end50: pct(atEnd, 0.5), end90: pct(atEnd, 0.9), runs: runs };
  }

