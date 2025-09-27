-- Create a function to get lawyer earnings summary
CREATE OR REPLACE FUNCTION public.get_lawyer_earnings(
  lawyer_id UUID
) 
RETURNS TABLE (
  total_earnings BIGINT,
  available_balance BIGINT,
  pending_transfers BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Total earnings (all successful payments to lawyer)
  earnings AS (
    SELECT COALESCE(SUM(lawyer_amount), 0) AS total
    FROM public.payments
    WHERE 
      lawyer_id = $1 
      AND status = 'succeeded'
  ),
  
  -- Available balance (earnings minus pending transfers)
  available AS (
    SELECT COALESCE(SUM(lawyer_amount), 0) AS total
    FROM public.payments
    WHERE 
      lawyer_id = $1 
      AND status = 'succeeded'
      AND (transfer_status IS NULL OR transfer_status != 'succeeded')
  ),
  
  -- Pending transfers (successful payments not yet transferred)
  pending AS (
    SELECT COALESCE(SUM(lawyer_amount), 0) AS total
    FROM public.payments
    WHERE 
      lawyer_id = $1 
      AND status = 'succeeded'
      AND (transfer_status IS NULL OR transfer_status NOT IN ('succeeded', 'failed'))
  )
  
  SELECT 
    (SELECT total FROM earnings) AS total_earnings,
    (SELECT total FROM available) AS available_balance,
    (SELECT total FROM pending) AS pending_transfers;
END;
$$;
