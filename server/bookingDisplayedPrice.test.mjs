// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { consultationBase, bookingClientTotal, bookingPricingSnapshot } from '../shared/bookingPricing.mjs';

const source = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const route = ast.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.arguments[0]?.text === '/api/bookings/create');

async function create({ rate = 41000, duration = 60, price = 1, surcharge = .1, service, settingsError, lawyerMissing = false } = {}) {
  let stored, preference, handler;
  const supabase = {
    rpc: vi.fn(async () => ({ error: null })),
    from(table) {
      let action = 'select', payload, columns;
      const result = () => {
        if (table === 'platform_settings') return { data: { client_surcharge_percent: surcharge, platform_fee_percent: .2 }, error: settingsError };
        if (table === 'profiles') return { data: lawyerMissing ? null : { user_id: 'L1', first_name: 'Test', last_name: 'Lawyer', hourly_rate_clp: rate } };
        if (table === 'lawyer_services') return { data: service };
        if (table === 'bookings' && action === 'insert') { stored = { ...payload, id: 'B1' }; return { data: stored }; }
        if (table === 'bookings' && action === 'select') return { data: [] };
        if (table === 'booking_leads') return { data: { id: 'lead' } };
        return { data: null, error: null };
      };
      const q = { select(c) { columns = c; return q; }, eq() { return q; }, in() { return q; }, order() { return q; }, limit() { return q; },
        insert(p) { action = 'insert'; payload = p; return q; }, update() { action = 'update'; return q; },
        single: async () => result(), maybeSingle: async () => result(), then: (a,b) => Promise.resolve(result()).then(a,b) };
      return q;
    },
  };
  const fetch = vi.fn(async (_url, options) => { preference = JSON.parse(options.body); return { ok: true, json: async () => ({ id: 'PREF', init_point: 'https://checkout.test' }) }; });
  vm.runInNewContext(route.getText(ast), {
    app: { post(_path, h) { handler = h; } }, supabase, consultationBase, bookingClientTotal, bookingPricingSnapshot,
    console: { log(){}, warn(){}, error(){} }, notificationsService: { notifyUsers: async () => {} },
    resolveWebhookUrl: () => null, appUrl: 'https://legalup.test', mercadopagoAccessToken: 'mock', isLocal: false,
    capturePostHog: async () => {}, fetch, process: { env: {} },
  });
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(value) { this.body = value; return this; } };
  await handler({ body: { lawyer_id: 'L1', user_email: 'test@test.invalid', user_name: 'Test', scheduled_date: '2030-01-01', scheduled_time: '10:00', duration, price, ...(service ? { booking_type: 'service', service_id: 'S1', service_title: 'Legal service' } : {}) } }, res);
  return { res, stored, preference, fetch };
}

const cases = [['Maria',41000,45000],['Astrid',45000,50000],['Hans',79000,87000],['Miguel',27000,30000],['Exact',70000,77000],['Fraction1',31818,35000],['Fraction2',40909,45000]];
describe('Actual booking handler: displayed price contract', () => {
  it.each(cases)('%s: UI, persisted snapshot and MP agree', async (_name, rate, expected) => {
    const {res,stored,preference} = await create({rate});
    expect(res.statusCode).toBe(200);
    expect(bookingClientTotal(consultationBase(rate,60),.1)).toBe(expected);
    expect(stored.price).toBe(expected);
    expect(stored.pricing_snapshot.client_total).toBe(expected);
    expect(stored.pricing_snapshot.base_amount).toBe(rate);
    expect(stored.pricing_snapshot.client_surcharge).toBe(expected-rate);
    expect(stored.pricing_snapshot.platform_fee).toBe(Math.round(rate*.2));
    expect(stored.pricing_snapshot.lawyer_amount).toBe(rate-Math.round(rate*.2));
    expect(preference.items[0].unit_price).toBe(expected);
    expect(preference.items[0].quantity).toBe(1);
  });
  it.each([1,999999999])('ignores manipulated price %s', async price => {
    const r=await create({price}); expect(r.stored.price).toBe(45000); expect(r.preference.items[0].unit_price).toBe(45000);
  });
  it.each([[30,20500,23000],[60,41000,45000],[90,61500,68000],[120,82000,90000]])('duration %s',async(duration,base,total)=>{
    const r=await create({duration}); expect(r.stored.pricing_snapshot.base_amount).toBe(base); expect(r.stored.price).toBe(total);
    expect(bookingClientTotal(consultationBase(41000,duration),.1)).toBe(total);
  });
  it('uses configured surcharge in shared UI contract and actual handler',async()=>{
    const r=await create({surcharge:.15}); expect(r.stored.price).toBe(47000); expect(bookingClientTotal(41000,.15)).toBe(47000);
    expect(r.stored.pricing_snapshot.client_surcharge).toBe(6000);
  });
  it('service uses service base, not hourly/duration, and rounds its advertised total',async()=>{
    const r=await create({rate:99999,duration:90,service:{price_clp:409091,lawyer_user_id:'L1'}});
    expect(r.stored.price).toBe(450000); expect(r.stored.pricing_snapshot.base_amount).toBe(409091);
    expect(r.stored.pricing_snapshot.client_surcharge).toBe(40909); expect(r.preference.items[0].unit_price).toBe(450000);
  });
  it('rejects cross-lawyer service before insert/provider',async()=>{
    const r=await create({service:{price_clp:41000,lawyer_user_id:'L2'}}); expect(r.res.statusCode).toBe(403); expect(r.stored).toBeUndefined(); expect(r.fetch).not.toHaveBeenCalled();
  });
  it('rejects missing lawyer',async()=>{const r=await create({lawyerMissing:true});expect(r.res.statusCode).toBe(404);expect(r.fetch).not.toHaveBeenCalled();});
  it('fails closed on settings read error',async()=>{const r=await create({settingsError:{message:'unavailable'}});expect(r.res.statusCode).toBe(500);expect(r.stored).toBeUndefined();expect(r.fetch).not.toHaveBeenCalled();});
  it('rejects invalid duration',async()=>{const r=await create({duration:45});expect(r.res.statusCode).toBe(400);expect(r.fetch).not.toHaveBeenCalled();});
});

describe('Actual UI calculation and webhook snapshot consumption', () => {
  it.each(cases)('%s: BookingPage uses the same displayed total', (_name, rate, total) => {
    const ui = readFileSync(new URL('../src/pages/BookingPage.tsx', import.meta.url), 'utf8');
    const tree = ts.createSourceFile('BookingPage.tsx', ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let declaration;
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'getClientPriceForDuration') declaration = node;
      ts.forEachChild(node, visit);
    }
    visit(tree);
    const executable = ts.transpile(`const ${declaration.getText(tree)}; getClientPriceForDuration(60);`, { target: ts.ScriptTarget.ES2022 });
    expect(vm.runInNewContext(executable, {lawyer:{hourly_rate_clp:rate}, clientSurchargePercent:.1, consultationBase, bookingClientTotal})).toBe(total);
  });
  it('webhook reads original base and lawyer amount from rounded booking snapshot', async () => {
    const { stored } = await create();
    const start = source.indexOf('          let snap = booking.pricing_snapshot;');
    const end = source.indexOf('          // Verificar ecuación DB:', start);
    const accounting = source.slice(start,end);
    const values = await vm.runInNewContext(`(async()=>{${accounting}\nreturn {derivedOriginal,clientSurcharge,platformFee,lawyerAmount};})()`,{booking:stored});
    expect(values).toEqual({derivedOriginal:41000,clientSurcharge:4000,platformFee:8200,lawyerAmount:32800});
  });
});
