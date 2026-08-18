import { createContext, useContext, useState, ReactNode } from 'react';

interface StickyBottomBarContextType {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

const StickyBottomBarContext = createContext<StickyBottomBarContextType | undefined>(undefined);

export function StickyBottomBarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <StickyBottomBarContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </StickyBottomBarContext.Provider>
  );
}

export function useStickyBottomBar() {
  const context = useContext(StickyBottomBarContext);
  if (context === undefined) {
    throw new Error('useStickyBottomBar must be used within a StickyBottomBarProvider');
  }
  return context;
}
