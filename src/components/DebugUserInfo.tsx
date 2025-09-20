'use client';

import { useAuth } from '@/contexts/AuthContext/clean/useAuth';

export function DebugUserInfo() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="fixed bottom-0 right-0 bg-yellow-100 p-4 border border-yellow-300 rounded-tl-lg z-50">
        <div className="font-bold">No user logged in</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 bg-yellow-100 p-4 border border-yellow-300 rounded-tl-lg z-50 max-w-xs text-xs">
      <div className="font-bold mb-2">User Debug Info</div>
      <div className="grid grid-cols-2 gap-1">
        <div className="font-medium">Email:</div>
        <div className="truncate">{user.email}</div>
        
        <div className="font-medium">ID:</div>
        <div className="truncate">{user.id}</div>
        
        <div className="font-medium">Role:</div>
        <div>{user.role || 'No role'}</div>
        
        <div className="font-medium">User Metadata:</div>
        <div className="col-span-1">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(user.user_metadata || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
