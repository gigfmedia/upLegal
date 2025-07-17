
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'lawyer';
  profile?: LawyerProfile;
}

interface LawyerProfile {
  specialties: string[];
  hourlyRate: number;
  location: string;
  bio: string;
  verified: boolean;
  rating?: number;
  reviews?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'client' | 'lawyer') => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<LawyerProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock authentication - in a real app, this would use Supabase
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login logic
    const mockUser: User = {
      id: '1',
      email,
      name: email.split('@')[0],
      role: email.includes('lawyer') ? 'lawyer' : 'client',
    };
    
    if (mockUser.role === 'lawyer') {
      mockUser.profile = {
        specialties: ['Corporate Law'],
        hourlyRate: 300,
        location: 'New York, NY',
        bio: 'Experienced lawyer with expertise in various legal areas.',
        verified: false,
        rating: 0,
        reviews: 0,
      };
    }
    
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const signup = async (email: string, password: string, name: string, role: 'client' | 'lawyer') => {
    // Mock signup logic
    const mockUser: User = {
      id: Date.now().toString(),
      email,
      name,
      role,
    };
    
    if (role === 'lawyer') {
      mockUser.profile = {
        specialties: [],
        hourlyRate: 0,
        location: '',
        bio: '',
        verified: false,
        rating: 0,
        reviews: 0,
      };
    }
    
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = async (profile: Partial<LawyerProfile>) => {
    if (user && user.role === 'lawyer') {
      const updatedUser = {
        ...user,
        profile: { ...user.profile, ...profile } as LawyerProfile,
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
