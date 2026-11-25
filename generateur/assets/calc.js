/* calc.js - moteur de calcul pur (navigateur + Node pour les tests) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function pmtFn(P, r, n) {
    if (n <= 0) return 0;
    if (Math.abs(r) < 1e-12) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }
  function bisect(f, lo, hi, it) {
    var flo = f(lo), fhi = f(hi);
    if (!isFinite(flo) || !isFinite(fhi)) return NaN;
    if (flo === 0) return lo;
    if (fhi === 0) return hi;
    if (flo * fhi > 0) return NaN;
    for (var i = 0; i < (it || 200); i++) {
      var mid = (lo + hi) / 2, fm = f(mid);
      if (fm === 0) return mid;
      if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }
  // balayage puis bissection : cherche une racine dans [a,b]
  function findRoot(f, a, b, steps) {
    steps = steps || 400;
    var prev = a, fp = f(a);
    for (var i = 1; i <= steps; i++) {
      var x = a + (b - a) * i / steps, fx = f(x);
      if (isFinite(fp) && isFinite(fx) && fp * fx <= 0) return bisect(f, prev, x);
      prev = x; fp = fx;
    }
    return NaN;
  }

  /* ---------- Credit ---------- */
  function loan(o) {
    var P = o.amount, n = Math.max(1, Math.round(o.years * 12)), r = o.rate / 100 / 12;
    var base = pmtFn(P, r, n);
    var insM = P * (o.insurance || 0) / 100 / 12;
    var fees = o.fees || 0;
    function run(extra, start) {
      var bal = P, rows = [], ti = 0;
      for (var m = 1; m <= n && bal > 0.005; m++) {
        var i = bal * r, pr = base - i;
        if (extra > 0 && m >= start) pr += extra;
        if (pr > bal || m === n) pr = bal;
        bal -= pr; if (bal < 0.005) bal = 0;
        rows.push({ m: m, pay: i + pr, principal: pr, interest: i, balance: bal });
        ti += i;
      }
      return { rows: rows, interest: ti, months: rows.length };
    }
    var a = run(o.extra || 0, o.extraStart || 1), b = run(0, 1);
    var insTotal = insM * a.months;
    // TAEG : taux mensuel i tel que somme(flux actualises) = capital - frais, sur l'echeancier contractuel
    var net = P - fees;
    var f = function (i) {
      var s = 0;
      for (var k = 0; k < b.rows.length; k++) s += (b.rows[k].pay + insM) / Math.pow(1 + i, k + 1);
      return s - net;
    };
    var im = bisect(f, 0, 1, 200);
    var apr = isFinite(im) ? (Math.pow(1 + im, 12) - 1) * 100 : NaN;
    return {
      payment: base + insM, paymentBase: base, insuranceMonthly: insM,
      rows: a.rows, months: a.months, totalInterest: a.interest, totalInsurance: insTotal, fees: fees,
      totalCost: a.interest + insTotal + fees, totalPaid: P + a.interest + insTotal + fees,
      apr: apr, monthsSaved: b.months - a.months, interestSaved: b.interest - a.interest, baseMonths: b.months
    };
  }

  /* ---------- Epargne ---------- */
  function savings(o) {
    var r = o.rate / 100 / 12, n = Math.max(1, Math.round(o.years * 12));
    var bal = o.initial, contrib = o.initial, series = [{ y: 0, bal: bal, contrib: contrib }];
    for (var m = 1; m <= n; m++) {
      bal = bal * (1 + r) + o.monthly; contrib += o.monthly;
      if (m % 12 === 0 || m === n) series.push({ y: m / 12, bal: bal, contrib: contrib });
    }
    var real = bal / Math.pow(1 + (o.inflation || 0) / 100, n / 12);
    return { final: bal, contributions: contrib, interest: bal - contrib, real: real, series: series };
  }

  /* ---------- Objectif ---------- */
  function goal(o) {
    var r = o.rate / 100 / 12, n = Math.max(1, Math.round(o.years * 12));
    var g = Math.pow(1 + r, n), need = o.target - o.current * g, pmt;
    if (need <= 0) pmt = 0; else pmt = Math.abs(r) < 1e-12 ? need / n : need * r / (g - 1);
    var contrib = o.current + pmt * n, finalV = o.current * g + (Math.abs(r) < 1e-12 ? pmt * n : pmt * (g - 1) / r);
    return { monthly: pmt, contributions: contrib, interest: finalV - contrib, final: finalV, reached: need <= 0 };
  }

  /* ---------- Retraite (approche en termes reels) ---------- */
  function retirement(o) {
    var Y = Math.max(0, o.retireAge - o.age), N = Math.max(1, Math.round((o.lifeExp - o.retireAge) * 12));
    var inf = o.inflation / 100;
    var needToday = Math.max(0, o.income - (o.pension || 0));
    var incomeNominal = needToday * Math.pow(1 + inf, Y);                 // 1er revenu mensuel a la retraite
    var realPost = (1 + o.retPost / 100) / (1 + inf) - 1;
    var rm = Math.pow(1 + realPost, 1 / 12) - 1;
    var annuity = Math.abs(rm) < 1e-12 ? N : (1 - Math.pow(1 + rm, -N)) / rm;
    var capital = incomeNominal * annuity;
    var nAcc = Y * 12, ra = Math.pow(1 + o.retPre / 100, 1 / 12) - 1;
    var grown = (o.savings || 0) * Math.pow(1 + ra, nAcc);
    var gap = capital - grown, monthly = 0;
    if (gap > 0 && nAcc > 0) monthly = Math.abs(ra) < 1e-12 ? gap / nAcc : gap * ra / (Math.pow(1 + ra, nAcc) - 1);
    return {
      yearsToRetire: Y, retirementYears: N / 12, incomeNominal: incomeNominal, capital: capital,
      capitalToday: capital / Math.pow(1 + inf, Y), monthly: monthly, covered: gap <= 0, grown: grown
    };
  }

  /* ---------- Acheter ou louer ---------- */
  function buyRent(o) {
    var H = Math.max(1, Math.round(o.horizon * 12)), P = o.price, L = Math.max(0, P - o.down);
    var n = Math.max(1, Math.round(o.years * 12)), r = o.rate / 100 / 12, pay = pmtFn(L, r, n);
    var bal = L, val = P, rentM = o.rent;
    var ri = Math.pow(1 + o.invest / 100, 1 / 12) - 1, gm = Math.pow(1 + o.appreciation / 100, 1 / 12) - 1,
        rg = Math.pow(1 + o.rentGrowth / 100, 1 / 12) - 1;
    var ownInv = 0, rentInv = o.down + P * o.closing / 100, series = [], breakeven = null, ownNW = 0;
    for (var m = 1; m <= H; m++) {
      var interest = bal * r, payment = 0;
      if (m <= n && bal > 0.005) { payment = pay; bal -= Math.min(pay - interest, bal); if (bal < 0.005) bal = 0; }
      val *= 1 + gm;
      var ownCost = payment + val * o.maintenance / 100 / 12;
      ownInv *= 1 + ri; rentInv *= 1 + ri;
      if (ownCost > rentM) rentInv += ownCost - rentM; else ownInv += rentM - ownCost;
      rentM *= 1 + rg;
      if (m % 12 === 0 || m === H) {
        ownNW = val * (1 - o.selling / 100) - bal + ownInv;
        var pt = { y: m / 12, own: ownNW, rent: rentInv };
        series.push(pt);
        if (breakeven === null && ownNW >= rentInv) breakeven = pt.y;
      }
    }
    var last = series[series.length - 1];
    return { own: last.own, rent: last.rent, diff: last.own - last.rent, series: series, breakeven: breakeven, payment: pay };
  }

  /* ---------- TVM (flux sortants negatifs) ---------- */
  function tvm(o) {
    var ppy = o.ppy || 12, r = o.rate / 100 / ppy, n = o.n, pv = o.pv, pmt = o.pmt, fv = o.fv, g = Math.pow(1 + r, n), z = Math.abs(r) < 1e-12;
    switch (o.solve) {
      case 'FV': return z ? -(pv + pmt * n) : -(pv * g + pmt * (g - 1) / r);
      case 'PV': return z ? -(fv + pmt * n) : -(fv + pmt * (g - 1) / r) / g;
      case 'PMT': return z ? -(pv + fv) / n : -(fv + pv * g) * r / (g - 1);
      case 'N': {
        if (z) return pmt === 0 ? NaN : -(pv + fv) / pmt;
        var x = (pmt - fv * r) / (pmt + pv * r);
        return x > 0 ? Math.log(x) / Math.log(1 + r) : NaN;
      }
      case 'RATE': {
        var f = function (i) {
          if (Math.abs(i) < 1e-10) return pv + pmt * n + fv;
          var gg = Math.pow(1 + i, n); return pv * gg + pmt * (gg - 1) / i + fv;
        };
        var i = findRoot(f, -0.5, 1);
        return isFinite(i) ? i * ppy * 100 : NaN;
      }
    }
    return NaN;
  }

  /* ---------- VAN / TRI ---------- */
  function npv(rate, flows) { var s = 0; for (var i = 0; i < flows.length; i++) s += flows[i] / Math.pow(1 + rate, i); return s; }
  function irr(flows) {
    var hasPos = flows.some(function (x) { return x > 0; }), hasNeg = flows.some(function (x) { return x < 0; });
    if (!hasPos || !hasNeg) return NaN;
    var v = findRoot(function (r) { return npv(r, flows); }, -0.95, 10, 2000);
    return isFinite(v) ? v * 100 : NaN;
  }
  function payback(flows) {
    var cum = 0;
    for (var i = 0; i < flows.length; i++) {
      var prev = cum; cum += flows[i];
      if (i > 0 && cum >= 0 && prev < 0) return i - 1 + (-prev / flows[i]);
    }
    return NaN;
  }
  function parseFlows(text) {
    return String(text).split(/[\s;]+/).map(function (s) {
      return parseFloat(s.replace(/−/g, '-').replace(/,+$/, '').replace(',', '.'));
    }).filter(function (x) { return isFinite(x); });
  }

  /* ---------- Budget ---------- */
  function budget(o) {
    return { needs: o.income * o.needs / 100, wants: o.income * o.wants / 100, save: o.income * o.save / 100, total: o.needs + o.wants + o.save };
  }

  return { pmt: pmtFn, loan: loan, savings: savings, goal: goal, retirement: retirement, buyRent: buyRent, tvm: tvm, npv: npv, irr: irr, payback: payback, parseFlows: parseFlows, budget: budget };
});
