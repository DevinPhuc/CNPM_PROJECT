CREATE TABLE IF NOT EXISTS public.goods_receipt_workflow (
  gr_id bigint PRIMARY KEY REFERENCES public.goods_receipt(gr_id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'received', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.goods_receipt_workflow TO service_role;

ALTER TABLE public.goods_receipt_workflow
  DROP CONSTRAINT IF EXISTS goods_receipt_workflow_status_check;

UPDATE public.goods_receipt_workflow
SET status = 'pending',
    updated_at = now()
WHERE status = 'approved';

ALTER TABLE public.goods_receipt_workflow
  ADD CONSTRAINT goods_receipt_workflow_status_check
  CHECK (status IN ('pending', 'received', 'cancelled'));

INSERT INTO public.goods_receipt_workflow (gr_id, status)
SELECT gr_id, 'received'
FROM public.goods_receipt
ON CONFLICT (gr_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.transition_goods_receipt(
  p_gr_id bigint,
  p_target_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
BEGIN
  SELECT status
  INTO current_status
  FROM public.goods_receipt_workflow
  WHERE gr_id = p_gr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goods receipt % was not found', p_gr_id;
  END IF;

  IF p_target_status <> 'received' OR current_status <> 'pending' THEN
    RAISE EXCEPTION 'Invalid goods receipt status transition: % to %', current_status, p_target_status;
  END IF;

  IF p_target_status = 'received' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.gr_details
      WHERE gr_id = p_gr_id
    ) THEN
      RAISE EXCEPTION 'Goods receipt % has no items', p_gr_id;
    END IF;

    UPDATE public.product_variants AS variant
    SET stock_quantity = COALESCE(variant.stock_quantity, 0) + receipt_items.quantity,
        updated_at = now()
    FROM (
      SELECT variant_id, SUM(quantity)::integer AS quantity
      FROM public.gr_details
      WHERE gr_id = p_gr_id
      GROUP BY variant_id
    ) AS receipt_items
    WHERE variant.variant_id = receipt_items.variant_id;
  END IF;

  UPDATE public.goods_receipt_workflow
  SET status = p_target_status,
      updated_at = now()
  WHERE gr_id = p_gr_id;

  RETURN jsonb_build_object('id', p_gr_id, 'status', p_target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_goods_receipt(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_goods_receipt(bigint, text) TO service_role;

NOTIFY pgrst, 'reload schema';
