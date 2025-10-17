import { Scale } from "lucide-react";

interface AppLoadingProps {
  fullScreen?: boolean;
  className?: string;
}

export function AppLoading({ fullScreen = true, className = '' }: AppLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-white z-50' : ''} ${className}`}>
      <div className="flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center">
          <div className="mt-4 flex items-center space-x-2">
            <Scale className="h-8 w-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">LegalUp</span>
          </div>
        </div>
        
        {/* Three dots loading animation */}
        <div className="flex space-x-2">
          <div className="h-3 w-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-3 w-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-3 w-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
