import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Simple theme context
const ThemeContext = React.createContext({
  theme: 'light',
  setTheme: (theme: string) => {}
});

// Simple theme provider
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = React.useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// Simple toaster component
const Toaster = () => {
  // This is a no-op for now
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);
