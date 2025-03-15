
-- Create a table for QR login tokens
CREATE TABLE IF NOT EXISTS public.qr_login_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'used', 'expired'))
);

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_qr_login_states_token ON public.qr_login_states(token);
CREATE INDEX IF NOT EXISTS idx_qr_login_states_user_id ON public.qr_login_states(user_id);

-- Enable RLS
ALTER TABLE public.qr_login_states ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to select their own tokens
CREATE POLICY select_own_tokens ON public.qr_login_states
  FOR SELECT USING (auth.uid() = user_id);

-- Create a policy to allow functions to insert tokens
CREATE POLICY insert_tokens ON public.qr_login_states
  FOR INSERT WITH CHECK (true);

-- Create a policy to allow functions to update tokens
CREATE POLICY update_tokens ON public.qr_login_states
  FOR UPDATE USING (true);

-- Add a trigger to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.qr_login_states 
  WHERE expires_at < NOW() - INTERVAL '1 day';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up expired tokens
CREATE TRIGGER trigger_cleanup_expired_qr_tokens
  AFTER INSERT ON public.qr_login_states
  EXECUTE FUNCTION public.cleanup_expired_qr_tokens();
