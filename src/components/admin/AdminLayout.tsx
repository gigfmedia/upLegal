import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';

export default function AdminLayout() {
  return (
    <div className="w-full">
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <Outlet />
      </main>
    </div>
  );
}