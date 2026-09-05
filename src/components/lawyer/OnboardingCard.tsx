import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { CheckCircle, Circle, X, ArrowRight } from 'lucide-react';

export function OnboardingCard() {
  const { user } = useAuth();
  const { completionPercentage } = useProfile(user?.id);
  const [counts, setCounts] = useState({ clients: 0, cases: 0, bookings: 0 });
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dismissedVal = localStorage.getItem('lawyer_onboarding_dismissed');
    if (dismissedVal === '1') {
      setDismissed(true);
      return;
    }
    if (!user?.id) return;
    Promise.all([
      supabase.from('lawyer_clients').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id),
      supabase.from('lawyer_cases').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', user.id).eq('source', 'LAWYER_DIRECT'),
    ]).then(([c1, c2, c3]) => {
      setCounts({ clients: c1.count ?? 0, cases: c2.count ?? 0, bookings: c3.count ?? 0 });
      setLoading(false);
    });
  }, [user?.id]);

  const profileDone = completionPercentage >= 70;
  const steps = [
    { label: 'Completa tu perfil', done: profileDone, href: '/lawyer/profile', cta: 'Completar perfil' },
    { label: 'Agrega tu primer cliente', done: counts.clients > 0, href: '/lawyer/clients', cta: 'Agregar cliente' },
    { label: 'Crea tu primer caso', done: counts.cases > 0, href: '/lawyer/cases', cta: 'Crear caso' },
    { label: 'Agenda tu primera cita', done: counts.bookings > 0, href: '/lawyer/citas', cta: 'Agendar cita' },
  ];

  const allDone = steps.every(s => s.done);
  if (dismissed || allDone) return null;
  if (loading) return null;

  const nextStep = steps.find(s => !s.done);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="font-semibold">Bienvenido a LegalUp</h3>
            <p className="text-sm text-gray-600">Empieza en 3 pasos para organizar tu práctica.</p>
            <div className="mt-3 space-y-2">
              {steps.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  {s.done ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
                  <span className={s.done ? 'text-gray-500 line-through' : 'text-gray-700'}>{s.label}</span>
                  {!s.done && s === nextStep && (
                    <Link to={s.href} className="ml-2 text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                      {s.cta} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { localStorage.setItem('lawyer_onboarding_dismissed', '1'); setDismissed(true); }} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
