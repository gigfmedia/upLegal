import { supabase } from '@/lib/supabaseClient';

export async function loadDemoData(lawyerId: string) {
  // Check if already has demo data (avoid duplicates)
  const { count: existing } = await supabase.from('lawyer_clients').select('id', { count: 'exact', head: true }).eq('lawyer_id', lawyerId).ilike('email', '%@demo.legalup.cl');
  if ((existing ?? 0) > 0) {
    return { created: 0, message: 'Demo ya cargado' };
  }

  const now = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // 2 clients
  const { data: c1 } = await supabase.from('lawyer_clients').insert({ lawyer_id: lawyerId, name: 'María González', email: 'maria.gonzalez@demo.legalup.cl', phone: '+56911111111', source: 'LAWYER_DIRECT' }).select('id').single();
  const { data: c2 } = await supabase.from('lawyer_clients').insert({ lawyer_id: lawyerId, name: 'Pedro Soto', email: 'pedro.soto@demo.legalup.cl', phone: '+56922222222', source: 'LAWYER_DIRECT' }).select('id').single();
  if (!c1 || !c2) throw new Error('No se pudo crear clientes demo');

  // 2 cases
  const { data: case1 } = await supabase.from('lawyer_cases').insert({ lawyer_id: lawyerId, client_id: (c1 as any).id, title: 'Arriendo departamento', description: 'Caso demo arriendo', status: 'in_progress', source: 'LAWYER_DIRECT' }).select('id').single();
  const { data: case2 } = await supabase.from('lawyer_cases').insert({ lawyer_id: lawyerId, client_id: (c2 as any).id, title: 'Cobro deuda', description: 'Caso demo cobro', status: 'new', source: 'LAWYER_DIRECT' }).select('id').single();

  // 3 bookings for case1, 1 for case2
  const bookings = [
    { lawyer_id: lawyerId, user_name: 'María González', user_email: 'maria.gonzalez@demo.legalup.cl', price: 0, booking_type: 'appointment', scheduled_date: now, scheduled_time: '10:00', duration: 60, status: 'confirmed', source: 'LAWYER_DIRECT', client_id: (c1 as any).id, case_id: (case1 as any).id, service_title: 'Cita inicial' },
    { lawyer_id: lawyerId, user_name: 'María González', user_email: 'maria.gonzalez@demo.legalup.cl', price: 0, booking_type: 'appointment', scheduled_date: tomorrow, scheduled_time: '15:00', duration: 60, status: 'confirmed', source: 'LAWYER_DIRECT', client_id: (c1 as any).id, case_id: (case1 as any).id, service_title: 'Revisión contrato' },
    { lawyer_id: lawyerId, user_name: 'María González', user_email: 'maria.gonzalez@demo.legalup.cl', price: 0, booking_type: 'appointment', scheduled_date: new Date(Date.now() + 2*86400000).toISOString().slice(0,10), scheduled_time: '09:00', duration: 30, status: 'confirmed', source: 'LAWYER_DIRECT', client_id: (c1 as any).id, case_id: (case1 as any).id, service_title: 'Seguimiento' },
    { lawyer_id: lawyerId, user_name: 'Pedro Soto', user_email: 'pedro.soto@demo.legalup.cl', price: 0, booking_type: 'appointment', scheduled_date: tomorrow, scheduled_time: '11:30', duration: 30, status: 'confirmed', source: 'LAWYER_DIRECT', client_id: (c2 as any).id, case_id: (case2 as any).id, service_title: 'Cita inicial' },
  ];

  for (const b of bookings) {
    await supabase.from('bookings').insert(b as any);
  }

  return { created: 6, message: 'Demo cargado: 2 clientes, 2 casos, 4 citas' };
}

export async function clearDemoData(lawyerId: string) {
  const { data: clients } = await supabase.from('lawyer_clients').select('id').eq('lawyer_id', lawyerId).ilike('email', '%@demo.legalup.cl');
  const ids = (clients || []).map((c: any) => c.id);
  if (ids.length === 0) return;
  await supabase.from('bookings').delete().in('client_id', ids);
  await supabase.from('lawyer_cases').delete().in('client_id', ids);
  await supabase.from('lawyer_clients').delete().in('id', ids);
}
