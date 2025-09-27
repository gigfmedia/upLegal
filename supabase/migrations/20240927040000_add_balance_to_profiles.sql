-- Add balance column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 0;

-- Create a function to safely update lawyer balance
CREATE OR REPLACE FUNCTION public.increment_lawyer_balance(
  p_lawyer_id UUID,
  p_amount BIGINT
) 
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_lawyer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_lawyer_balance(UUID, BIGINT) TO authenticated;

-- Update RLS policy to allow users to view balances
DROP POLICY IF EXISTS "Users can view their own balance" ON public.profiles;
CREATE POLICY "Users can view their own balance" 
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
