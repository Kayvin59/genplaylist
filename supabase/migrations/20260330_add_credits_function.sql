-- Atomic function to add credits to a user's profile.
-- Called by the Stripe webhook after a successful payment.
-- Uses atomic increment to avoid race conditions (e.g. double webhook delivery).

create or replace function public.add_credits(user_id uuid, amount integer)
returns void as $$
begin
  update public.profiles
  set credits_remaining = credits_remaining + amount,
      updated_at = now()
  where id = user_id;
end;
$$ language plpgsql security definer;
