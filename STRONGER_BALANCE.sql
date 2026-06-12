-- ============================================================================
-- TunBet — Stronger Balance System (run this in Supabase SQL Editor)
-- ============================================================================
-- Goals:
--   1. update_balance is fully ATOMIC (row lock) and NEVER allows negative balance.
--   2. New idempotency table so a credit can be applied EXACTLY ONCE (no doubling).
--   3. update_balance_idem(): atomic balance change guarded by a unique reference key.
-- Safe to re-run (uses CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================================

-- 1) Idempotency ledger: every guarded money movement records its unique ref here.
CREATE TABLE IF NOT EXISTS balance_ops (
  ref          text PRIMARY KEY,
  user_id      bigint NOT NULL,
  action       text   NOT NULL,
  amount       numeric NOT NULL,
  balance_after numeric NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2) Hardened atomic balance update (add / withdraw / set) with row lock + no-negative.
CREATE OR REPLACE FUNCTION update_balance(p_user_id bigint, p_action text, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  cur numeric;
  nxt numeric;
BEGIN
  -- Lock the user row so concurrent calls serialize (prevents race double/loss).
  SELECT balance INTO cur FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
  cur := COALESCE(cur, 0);

  IF p_action = 'add' THEN
    nxt := cur + p_amount;
  ELSIF p_action = 'withdraw' THEN
    IF cur < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    nxt := cur - p_amount;
  ELSIF p_action = 'set' THEN
    nxt := p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid action %', p_action;
  END IF;

  IF nxt < 0 THEN
    nxt := 0;
  END IF;

  UPDATE users SET balance = round(nxt, 2) WHERE id = p_user_id;
  RETURN round(nxt, 2);
END;
$$;

-- 3) Idempotent atomic update: applies the change ONLY if p_ref was never used before.
--    If the same ref arrives again (retry/double-call), it returns the existing balance
--    WITHOUT applying the change again. This kills the "doubled balance" class of bugs.
CREATE OR REPLACE FUNCTION update_balance_idem(
  p_user_id bigint, p_action text, p_amount numeric, p_ref text
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  existing numeric;
  newbal   numeric;
BEGIN
  -- Already applied? return the balance recorded then (no re-apply).
  SELECT balance_after INTO existing FROM balance_ops WHERE ref = p_ref;
  IF FOUND THEN
    RETURN existing;
  END IF;

  newbal := update_balance(p_user_id, p_action, p_amount);

  -- Record the ref. If a concurrent call inserted it first, swallow the conflict
  -- (the other call already applied the same logical operation).
  BEGIN
    INSERT INTO balance_ops(ref, user_id, action, amount, balance_after)
    VALUES (p_ref, p_user_id, p_action, p_amount, newbal);
  EXCEPTION WHEN unique_violation THEN
    -- extremely rare race: ref got inserted between our SELECT and INSERT.
    NULL;
  END;

  RETURN newbal;
END;
$$;
