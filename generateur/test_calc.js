const C = require('./assets/calc.js'); let fail = 0;
function eq(name, got, exp, tol) { tol = tol || 0.01; const ok = Math.abs(got - exp) <= tol; if (!ok) fail++; console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name + ' got=' + got + ' exp=' + exp); }
// 1) Credit 100000, 7 %, 15 ans: mensualite 898.83
let L = C.loan({ amount: 100000, rate: 7, years: 15 });
eq('mensualite', L.payment, 898.83, 0.01); eq('interets', L.totalInterest, 898.8283 * 180 - 100000, 1); eq('mois', L.months, 180); eq('solde final', L.rows[L.rows.length - 1].balance, 0);
// 2) remboursement anticipe reduit la duree et les interets
let L2 = C.loan({ amount: 100000, rate: 7, years: 15, extra: 500, extraStart: 13 });
console.log('extra: mois', L2.months, 'economie interets', Math.round(L2.interestSaved)); if (!(L2.months < 180 && L2.interestSaved > 0)) fail++;
// 3) TAEG sans frais = taux effectif annuel
eq('TAEG sans frais', L.apr, (Math.pow(1 + 0.07 / 12, 12) - 1) * 100, 0.001);
let L3 = C.loan({ amount: 100000, rate: 7, years: 15, insurance: 0.3, fees: 1000 }); console.log('TAEG avec frais/assurance', L3.apr.toFixed(3)); if (!(L3.apr > L.apr)) fail++;
// 4) Epargne: 10000 initial, 200/mois, 5 %, 10 ans => 10000*1.00416667^120 + 200*((..)-1)/r
let S = C.savings({ initial: 10000, monthly: 200, rate: 5, years: 10, inflation: 2 }); const r = 0.05 / 12, g = Math.pow(1 + r, 120);
eq('epargne FV', S.final, 10000 * g + 200 * (g - 1) / r, 0.01); eq('reel', S.real, S.final / Math.pow(1.02, 10), 0.01);
// 5) Objectif: l'epargne mensuelle calculee fait atteindre la cible
let G = C.goal({ target: 50000, current: 5000, years: 8, rate: 4 }); let chk = C.savings({ initial: 5000, monthly: G.monthly, rate: 4, years: 8 }); eq('objectif', chk.final, 50000, 0.01);
// 6) TVM: coherence FV -> PMT -> PV -> N -> RATE
const base = { n: 120, rate: 7, ppy: 12, pv: -10000, pmt: -100, fv: 0 };
const fv = C.tvm(Object.assign({}, base, { solve: 'FV' })); console.log('FV', fv.toFixed(2));
eq('TVM PMT', C.tvm({ n: 120, rate: 7, ppy: 12, pv: -10000, pmt: 0, fv: fv, solve: 'PMT' }) , -100, 0.001 + 0) ;
eq('TVM PV', C.tvm({ n: 120, rate: 7, ppy: 12, pv: 0, pmt: -100, fv: fv, solve: 'PV' }), -10000, 0.01);
eq('TVM N', C.tvm({ n: 0, rate: 7, ppy: 12, pv: -10000, pmt: -100, fv: fv, solve: 'N' }), 120, 0.001);
eq('TVM RATE', C.tvm({ n: 120, rate: 0, ppy: 12, pv: -10000, pmt: -100, fv: fv, solve: 'RATE' }), 7, 0.001);
// Pret classique: PV=100000, FV=0, PMT => mensualite negative = -898.83
eq('TVM pret', C.tvm({ n: 180, rate: 7, ppy: 12, pv: 100000, pmt: 0, fv: 0, solve: 'PMT' }), -898.83, 0.01);
// 7) VAN / TRI
const fl = [-1000, 300, 400, 500, 200]; eq('VAN 8%', C.npv(0.08, fl), -1000 + 300 / 1.08 + 400 / 1.08 ** 2 + 500 / 1.08 ** 3 + 200 / 1.08 ** 4, 0.001);
const i = C.irr(fl); eq('VAN au TRI = 0', C.npv(i / 100, fl), 0, 0.001); console.log('TRI', i.toFixed(3) + '%', 'payback', C.payback(fl).toFixed(2)); eq('parse', C.parseFlows('-1000, 300; 400\n500 ,200').length, 5);
// 8) Retraite: epargne mensuelle fait atteindre le capital
const R = C.retirement({ age: 30, retireAge: 65, lifeExp: 90, income: 2000, pension: 0, savings: 0, inflation: 2, retPre: 5, retPost: 3 });
const ra = Math.pow(1.05, 1 / 12) - 1, gg = Math.pow(1 + ra, 420); eq('retraite FV=capital', R.monthly * (gg - 1) / ra, R.capital, 1); console.log('retraite', Math.round(R.capital), Math.round(R.capitalToday), Math.round(R.monthly));
// 9) Acheter/louer: symetrie et sanity
const B = C.buyRent({ price: 150000, down: 20000, rate: 7, years: 20, rent: 600, rentGrowth: 3, appreciation: 3, maintenance: 1, closing: 5, selling: 4, invest: 5, horizon: 20 }); console.log('buy/rent', Math.round(B.own), Math.round(B.rent), 'breakeven', B.breakeven);
if (!(isFinite(B.own) && isFinite(B.rent))) fail++;

console.log(fail ? ('\n' + fail + ' ECHEC(S)') : '\nTous les tests OK'); process.exit(fail ? 1 : 0);
