-- Add missing columns to op_ouvriers table
ALTER TABLE public.op_ouvriers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS plan_code TEXT CHECK (plan_code IN ('FREE', 'MONTHLY', 'YEARLY')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update the trigger for automatic timestamp updates if the function doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_op_ouvriers_updated_at ON public.op_ouvriers;
CREATE TRIGGER update_op_ouvriers_updated_at
  BEFORE UPDATE ON public.op_ouvriers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policy to allow users to insert their own profile
DROP POLICY IF EXISTS "op_ouvriers_self_insert" ON public.op_ouvriers;
CREATE POLICY "op_ouvriers_self_insert"
  ON public.op_ouvriers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());