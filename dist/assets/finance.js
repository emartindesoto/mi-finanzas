import { sum, monthOf, today } from './models.js';
export const sorted = (items) => [...items].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
export function holdings(s, asOf = today()) {
    return s.assets.map(asset => {
        const lots = [];
        let realized = 0, invested = 0;
        for (const t of sorted(s.trades.filter(x => x.assetId === asset.id && x.date <= asOf))) {
            if (t.kind === 'buy' || t.kind === 'grant') {
                const cost = t.quantity * t.unitPrice + t.fee;
                lots.push({ qty: t.quantity, price: cost / t.quantity, date: t.date, unlockDate: t.unlockDate });
                invested += cost;
            }
            else {
                let rest = t.quantity;
                let basis = 0;
                for (const lot of lots) {
                    if (rest <= 1e-10)
                        break;
                    if (lot.unlockDate && lot.unlockDate > t.date)
                        continue;
                    const n = Math.min(rest, lot.qty);
                    lot.qty -= n;
                    rest -= n;
                    basis += n * lot.price;
                }
                if (rest > 0.00000001)
                    throw Error(`Venta de ${asset.symbol || asset.name} sin participaciones disponibles (o todavía bloqueadas) el ${t.date}.`);
                realized += t.quantity * t.unitPrice - t.fee - basis;
            }
        }
        const quantity = sum(lots.map(l => l.qty));
        const cost = sum(lots.map(l => l.qty * l.price));
        const price = priceAt(s, asset, asOf);
        const value = quantity * price;
        const div = sum(s.dividends.filter(d => d.assetId === asset.id && d.date <= asOf).map(d => d.gross - d.tax - d.fee));
        const unrealized = value - cost;
        const result = realized + unrealized + div;
        const lockedQuantity = sum(lots.filter(l => l.unlockDate && l.unlockDate > asOf).map(l => l.qty));
        return { asset, quantity, cost, realized, dividends: div, invested, value, unrealized, returnEUR: result, returnPct: invested > 0 ? result / invested * 100 : null, lockedQuantity, lots: lots.filter(l => l.qty > 1e-10) };
    });
}
export function priceAt(s, asset, day = today()) {
    const quotes = s.prices.filter(q => q.assetId === asset.id && q.date <= day);
    if (asset.priceDate <= day)
        quotes.push({ id: 'asset', assetId: asset.id, date: asset.priceDate, price: asset.price });
    // Price at a purchase is only an estimate if no explicit manual valuation was recorded.
    for (const t of s.trades.filter(t => t.assetId === asset.id && t.date <= day)) {
        quotes.push({ id: 'trade' + t.id, assetId: asset.id, date: t.date, price: t.unitPrice });
    }
    quotes.sort((a, b) => a.date.localeCompare(b.date) || (a.id === 'asset' ? 2 : a.id.startsWith('trade') ? 0 : 1) - (b.id === 'asset' ? 2 : b.id.startsWith('trade') ? 0 : 1));
    return quotes.at(-1)?.price ?? 0;
}
export function accountBalance(s, accountId, day = today()) {
    const account = s.accounts.find(a => a.id === accountId);
    if (!account || account.openingDate > day)
        return 0;
    let value = account.openingBalance;
    for (const m of s.movements) {
        if (m.date > day || m.date < account.openingDate)
            continue;
        if (m.accountId === accountId)
            value += m.kind === 'income' ? m.amount : -m.amount;
        if (m.kind === 'transfer' && m.toAccountId === accountId)
            value += m.amount;
    }
    for (const p of s.payrolls) {
        if (p.date <= day && p.date >= account.openingDate && p.accountId === accountId)
            value += p.net;
    }
    for (const t of s.trades) {
        if (t.date > day || t.date < account.openingDate || t.accountId !== accountId)
            continue;
        if (t.kind === 'buy')
            value -= t.quantity * t.unitPrice + t.fee;
        if (t.kind === 'sell')
            value += t.quantity * t.unitPrice - t.fee;
    }
    for (const d of s.dividends) {
        if (d.date <= day && d.date >= account.openingDate && d.accountId === accountId)
            value += d.gross - d.tax - d.fee;
    }
    return value;
}
export function netWorth(s, day = today()) { const cash = sum(s.accounts.filter(a => a.kind !== 'debt').map(a => accountBalance(s, a.id, day))); const debts = -sum(s.accounts.filter(a => a.kind === 'debt').map(a => accountBalance(s, a.id, day))); const invested = sum(holdings(s, day).map(h => h.value)); return { cash, invested, debts, total: cash + invested - debts }; }
export function cashFlow(s, from, to) {
    const between = (d) => d >= from && d <= to;
    const income = sum(s.movements.filter(m => m.kind === 'income' && between(m.date)).map(m => m.amount));
    const salaries = sum(s.payrolls.filter(p => between(p.date)).map(p => p.net));
    const dividendIncome = sum(s.dividends.filter(d => between(d.date)).map(d => d.gross - d.tax - d.fee));
    const expenses = sum(s.movements.filter(m => m.kind === 'expense' && between(m.date)).map(m => m.amount));
    return { income: income + salaries + dividendIncome, otherIncome: income, salaries, dividendIncome, expenses, saving: income + salaries + dividendIncome - expenses };
}
export function startOfPeriod(period, day = today()) {
    if (period === 'ALL')
        return '1900-01-01';
    const n = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '5Y': 60 }[period] || 12;
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - n);
    return d.toISOString().slice(0, 10);
}
export const endOfMonth = (month) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
export function monthsInRange(from, to) { const arr = []; let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)); let k = 0; while (`${y}-${String(m).padStart(2, '0')}` <= monthOf(to) && k++ < 2400) {
    arr.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
        m = 1;
        y++;
    }
} return arr; }
export function monthlyStats(s, from, to = today()) {
    return monthsInRange(from, to).map(month => {
        const end = endOfMonth(month) > to ? to : endOfMonth(month);
        const start = month + '-01';
        const flow = cashFlow(s, start, end);
        const worth = netWorth(s, end);
        return { month, label: new Date(`${start}T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), end, ...flow, ...worth };
    });
}
export function expensesByCategory(s, from, to = today()) {
    const categories = s.categories.filter(c => c.kind === 'expense').map(c => ({ id: c.id, name: c.name, total: sum(s.movements.filter(m => m.kind === 'expense' && m.categoryId === c.id && m.date >= from && m.date <= to).map(m => m.amount)) }));
    const without = sum(s.movements.filter(m => m.kind === 'expense' && m.date >= from && m.date <= to && !s.categories.some(c => c.id === m.categoryId && c.kind === 'expense')).map(m => m.amount));
    if (without)
        categories.push({ id: 'uncategorized', name: 'Sin categoría', total: without });
    return categories.filter(x => x.total > 0).sort((a, b) => b.total - a.total);
}
export function netInvestmentCashFlows(s, assetId, at = today()) {
    const cf = [];
    for (const t of s.trades.filter(t => t.assetId === assetId && t.date <= at)) {
        cf.push({ date: t.date, amount: t.kind === 'sell' ? t.quantity * t.unitPrice - t.fee : -(t.quantity * t.unitPrice + t.fee) });
    }
    for (const d of s.dividends.filter(d => d.assetId === assetId && d.date <= at)) {
        cf.push({ date: d.date, amount: d.gross - d.tax - d.fee });
    }
    const h = holdings(s, at).find(x => x.asset.id === assetId);
    if (h && h.value > 0)
        cf.push({ date: at, amount: h.value });
    return cf;
}
/** Annualised money-weighted rate of return (XIRR). Null if a solution is not bracketed. */
export function xirr(flows) {
    if (flows.length < 2 || !flows.some(f => f.amount < 0) || !flows.some(f => f.amount > 0))
        return null;
    const date0 = Date.parse(flows.map(f => f.date).sort()[0] + 'T00:00:00Z');
    const terms = flows.map(f => ({ amount: f.amount, years: (Date.parse(f.date + 'T00:00:00Z') - date0) / 86400000 / 365.25 }));
    const fn = (r) => sum(terms.map(f => f.amount / Math.pow(1 + r, f.years)));
    let lo = -0.99999, hi = 10;
    let fl = fn(lo), fh = fn(hi);
    if (!Number.isFinite(fl) || !Number.isFinite(fh) || fl * fh > 0)
        return null;
    for (let i = 0; i < 150; i++) {
        const mid = (lo + hi) / 2;
        const fm = fn(mid);
        if (!Number.isFinite(fm))
            return null;
        if (Math.abs(fm) < 0.000001)
            return mid * 100;
        if (fl * fm > 0) {
            lo = mid;
            fl = fm;
        }
        else {
            hi = mid;
            fh = fm;
        }
    }
    return (lo + hi) / 2 * 100;
}
export function maturityMonthly(goal, allocated, deadline, day = today()) {
    const months = Math.max(1, (Number(deadline.slice(0, 4)) - Number(day.slice(0, 4))) * 12 + Number(deadline.slice(5, 7)) - Number(day.slice(5, 7)));
    return Math.max(0, goal - allocated) / months;
}
export function projectCompound(initial, monthly, annualPct, years) { const rate = Math.pow(1 + annualPct / 100, 1 / 12) - 1; const pts = []; let value = initial; for (let i = 1; i <= years * 12; i++) {
    value = value * (1 + rate) + monthly;
    if (i % 12 === 0)
        pts.push({ year: i / 12, value, contributed: initial + monthly * i });
} return pts; }
export function nextRecurrings(s, asOf = today()) {
    const created = [];
    const existing = new Set(s.movements.map(x => x.occurrenceKey));
    for (const r of s.recurrings.filter(x => x.active)) {
        const start = monthOf(r.startDate);
        let date = start + '-01';
        let n = 0;
        while (date <= asOf && n++ < 120) {
            const m = monthOf(date);
            const last = Number(endOfMonth(m).slice(-2));
            const due = `${m}-${String(Math.min(r.day, last)).padStart(2, '0')}`;
            const key = `${r.id}:${m}`;
            if (due >= r.startDate && due <= asOf && !existing.has(key)) {
                created.push({ id: crypto.randomUUID(), date: due, kind: r.kind, accountId: r.accountId, categoryId: r.categoryId, amount: r.amount, description: r.description, occurrenceKey: key });
                existing.add(key);
            }
            const d = new Date(`${m}-01T00:00:00Z`);
            d.setUTCMonth(d.getUTCMonth() + 1);
            date = d.toISOString().slice(0, 10);
        }
    }
    return created;
}
export function transactionFingerprint(m) { return [m.date, m.kind, m.accountId, m.toAccountId || '', m.amount.toFixed(2), m.categoryId || '', m.description.trim().toLowerCase()].join('|'); }
