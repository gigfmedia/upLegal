// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createProspectingRepository } from './repository.mjs';

function createFakeSupabase({ send, prospect }) {
  const writes = [];
  function query(table, patch = null) {
    let filters = {};
    const q = {
      eq(key, value) { filters = { ...filters, [key]: value }; return q; },
      select() { return q; },
      async maybeSingle() {
        if (patch) {
          writes.push({ table, patch, filters });
          if (table === 'prospecting_sends') Object.assign(send, patch);
          if (table === 'prospects') Object.assign(prospect, patch);
        }
        return { data: table === 'prospecting_sends' ? structuredClone(send) : null, error: null };
      },
      async single() { return this.maybeSingle(); },
      then(resolve, reject) {
        return this.maybeSingle().then(resolve, reject);
      },
    };
    return q;
  }
  return {
    writes,
    from(table) {
      return {
        update(patch) { return query(table, patch); },
        upsert(row) {
          return {
            select() {
              return {
                single: async () => {
                  writes.push({ table, patch: row, filters: {} });
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

function setup(status) {
  const send = {
    id: 'send-1',
    prospect_id: 'prospect-1',
    to_email: 'juan@estudio.cl',
    status,
    sent_at: null,
    delivered_at: null,
    bounced_at: null,
    complained_at: null,
  };
  const prospect = { id: 'prospect-1', status: 'contacted', send_status: 'sent' };
  const supabase = createFakeSupabase({ send, prospect });
  const repository = createProspectingRepository({ supabase, logger: { error() {}, warn() {} } });
  return { repository, supabase, send, prospect };
}

describe('prospecting provider events', () => {
  it('no degrada bounced a delivered si el evento llega fuera de orden', async () => {
    const { repository, supabase, send, prospect } = setup('bounced');
    await repository.applyProviderEvent({
      send,
      status: 'delivered',
      email: 'juan@estudio.cl',
    });
    expect(send.status).toBe('bounced');
    expect(send.delivered_at).toBe(null);
    expect(prospect.send_status).toBe('sent');
    expect(supabase.writes.some((write) => write.table === 'prospects')).toBe(false);
  });

  it('no degrada complained a sent si el evento llega fuera de orden', async () => {
    const { repository, send } = setup('complained');
    await repository.applyProviderEvent({ send, status: 'sent', email: 'juan@estudio.cl' });
    expect(send.status).toBe('complained');
  });

  it('permite avanzar de sent a delivered y actualiza el prospecto', async () => {
    const { repository, send, prospect } = setup('sent');
    await repository.applyProviderEvent({ send, status: 'delivered', email: 'juan@estudio.cl' });
    expect(send.status).toBe('delivered');
    expect(send.delivered_at).toBeTruthy();
    expect(prospect.send_status).toBe('delivered');
  });

  it('permite que un rebote reemplace un fallo genérico', async () => {
    const { repository, send } = setup('failed');
    await repository.applyProviderEvent({ send, status: 'bounced', email: 'juan@estudio.cl' });
    expect(send.status).toBe('bounced');
    expect(send.bounced_at).toBeTruthy();
  });
});
