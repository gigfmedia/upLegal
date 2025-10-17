export interface Rating {
  id: string;
  lawyer_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CreateRatingInput {
  lawyerId: string;
  rating: number;
  comment?: string;
}

export interface UpdateRatingInput {
  rating?: number;
  comment?: string;
}
