import { Database } from "./types";

declare module "./types" {
  export interface Database {
    public: {
      Functions: {
        create_consultation_with_free_check: {
          Args: {
            p_client_id: string;
            p_lawyer_id: string;
            p_message: string;
            p_is_free: boolean;
            p_price: number;
          };
          Returns: {
            id: string;
            success: boolean;
            is_free: boolean;
          };
        };
        mark_free_consultation_used: {
          Args: {
            user_id: string;
          };
          Returns: void;
        };
      };
    };
  }
}
