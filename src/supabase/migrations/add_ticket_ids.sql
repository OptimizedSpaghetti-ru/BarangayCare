-- BarangayCare: Ticket IDs for complaints and assistance requests
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS ticket_id text;

ALTER TABLE public.assistance_requests
  ADD COLUMN IF NOT EXISTS ticket_id text;

CREATE OR REPLACE FUNCTION public.generate_barangaycare_ticket(
  ticket_prefix text,
  target_table text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  generated_ticket text;
  ticket_exists boolean;
  index integer;
BEGIN
  LOOP
    generated_ticket := ticket_prefix || '-';

    FOR index IN 1..6 LOOP
      generated_ticket := generated_ticket || substr(
        alphabet,
        floor(random() * length(alphabet) + 1)::integer,
        1
      );
    END LOOP;

    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE ticket_id = $1)',
      target_table
    )
    INTO ticket_exists
    USING generated_ticket;

    IF NOT ticket_exists THEN
      RETURN generated_ticket;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_complaint_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_id IS NULL OR btrim(NEW.ticket_id) = '' THEN
    NEW.ticket_id := public.generate_barangaycare_ticket('CMP', 'complaints');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_assistance_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_id IS NULL OR btrim(NEW.ticket_id) = '' THEN
    NEW.ticket_id := public.generate_barangaycare_ticket(
      'AST',
      'assistance_requests'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_complaint_ticket_id ON public.complaints;
CREATE TRIGGER trg_set_complaint_ticket_id
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_complaint_ticket_id();

DROP TRIGGER IF EXISTS trg_set_assistance_ticket_id ON public.assistance_requests;
CREATE TRIGGER trg_set_assistance_ticket_id
  BEFORE INSERT ON public.assistance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_assistance_ticket_id();

DO $$
DECLARE
  row_record record;
BEGIN
  FOR row_record IN
    SELECT id FROM public.complaints WHERE ticket_id IS NULL OR btrim(ticket_id) = ''
  LOOP
    UPDATE public.complaints
    SET ticket_id = public.generate_barangaycare_ticket('CMP', 'complaints')
    WHERE id = row_record.id;
  END LOOP;

  FOR row_record IN
    SELECT id FROM public.assistance_requests WHERE ticket_id IS NULL OR btrim(ticket_id) = ''
  LOOP
    UPDATE public.assistance_requests
    SET ticket_id = public.generate_barangaycare_ticket('AST', 'assistance_requests')
    WHERE id = row_record.id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_ticket_id
  ON public.complaints (ticket_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistance_requests_ticket_id
  ON public.assistance_requests (ticket_id);
