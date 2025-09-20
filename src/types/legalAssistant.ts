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
