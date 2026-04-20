-- Tabela de promoções/avisos enviados pelo admin
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active promotions"
ON public.promotions FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage promotions"
ON public.promotions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de leituras por usuário
CREATE TABLE public.promotion_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, promotion_id)
);

ALTER TABLE public.promotion_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reads"
ON public.promotion_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users mark own reads"
ON public.promotion_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reads"
ON public.promotion_reads FOR DELETE
USING (auth.uid() = user_id);

-- Realtime para atualização instantânea
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;