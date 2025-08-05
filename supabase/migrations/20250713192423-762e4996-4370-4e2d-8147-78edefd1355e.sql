-- Insert example massage therapy service
INSERT INTO public.services (
  name,
  description,
  price,
  original_price,
  duration_minutes,
  category_id,
  provider_id,
  is_available,
  max_bookings_per_day
) VALUES (
  'Deep Tissue Massage',
  'A therapeutic massage that targets deeper layers of muscle and connective tissue. Perfect for chronic muscle tension and sports injuries. Our licensed massage therapists use firm pressure and slow strokes to help break up scar tissue and reduce muscle knots.',
  120.00,
  150.00,
  90,
  '7e86cadc-c0fa-4d10-b2ee-6aae639fa028',
  '246e400f-679c-49fb-af38-d00056cb0c4f',
  true,
  8
);