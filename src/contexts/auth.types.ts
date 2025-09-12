import { Profile } from "@/hooks/useProfile";

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'lawyer';
  hasUsedFreeConsultation: boolean;
  profile?: Profile;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'client' | 'lawyer') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  refreshUser: () => Promise<User | undefined>;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
