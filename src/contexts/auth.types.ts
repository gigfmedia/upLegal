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
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, role: 'client' | 'lawyer') => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<User>;
  refreshUser: () => Promise<User>;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
