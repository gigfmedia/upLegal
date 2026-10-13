-- La sobrecarga legacy (date, uuid) hacía ambigua la resolución PostgREST
-- frente a (uuid, date): el RPC devolvía 300 y el frontend mostraba error
-- o slots sin filtrar. Ningún código la usa (ver BookingPage/bookingIntent).
DROP FUNCTION IF EXISTS public.get_lawyer_busy_slots(date, uuid);
