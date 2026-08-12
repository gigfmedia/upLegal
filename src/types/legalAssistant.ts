export interface LegalAssistantContext {
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>;
  userPreferences: {
    location?: string;
    legalTopic?: string;
    preferredLanguage?: string;
  };
  documents: Array<{
    name: string;
    type: string;
    content: string;
    analysis?: string;
  }>;
}

export interface DocumentAnalysis {
  type: string;
  summary: string;
  relevantLaws: string[];
}

export interface LegalAssistantResponse {
  response: string;
  context: LegalAssistantContext;
  suggestedActions?: string[];
}

// ============================================================================
// Asistente comercial y de orientación (front público) — LegalUp Assistant
// ============================================================================

export type LegalCategory =
  | 'arriendo'
  | 'familia'
  | 'laboral'
  | 'civil'
  | 'consumidor'
  | 'comercial'
  | 'penal'
  | 'otros';

export type AssistantStage =
  | 'initial'
  | 'understanding'
  | 'classifying'
  | 'matching'
  | 'recommendation'
  | 'services'
  | 'booking'
  | 'help';

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type IntentLevel = 'low' | 'medium' | 'high';

export interface AssistantLawyerService {
  id: string;
  title: string;
  description: string | null;
  price_clp: number;
  delivery_time: string | null;
  requires_quote: boolean;
  display_price: number;
}

export interface AssistantLawyer {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  specialties: string[];
  rating: number | null;
  review_count: number | null;
  experience_years: number | null;
  location: string | null;
  bio: string | null;
  hourly_rate_clp: number | null;
  contact_fee_clp: number | null;
  verified: boolean;
  pjud_verified: boolean;
  matchScore: number;
  matchReasons: string[];
  explanation?: string | null;
  isTopPick: boolean;
  bestService: AssistantLawyerService | null;
}

export interface AssistantChatResponse {
  reply: string;
  category: LegalCategory;
  subcategory: string;
  summary: string;
  urgency: UrgencyLevel;
  commercialIntent: IntentLevel;
  readyToRecommend: boolean;
  stage: AssistantStage;
  question?: string | null;
  options?: string[];
  followUp?: string | null;
  lawyers?: AssistantLawyer[];
  services?: AssistantLawyerServices | null;
  usedAI?: boolean;
}

export interface AssistantLawyerServices {
  lawyer: AssistantLawyer;
  items: AssistantLawyerService[];
}

export interface QuickReplyOption {
  label: string;
  value: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  lawyers?: AssistantLawyer[];
  services?: AssistantLawyerServices | null;
  options?: QuickReplyOption[];
  followUp?: string | null;
  quickTopics?: QuickTopic[];
  createdAt: string;
}

export interface QuickTopic {
  id: string;
  label: string;
  emoji: string;
  hint: string;
  category?: LegalCategory;
}

