-- MASAR · reference data (categories). Demo businesses are NOT seeded in production.
insert into public.service_categories (id, slug, name_en, name_ar, icon, default_queue_type, sort) values
  ('cat_food', 'restaurants', 'Restaurants & Cafes', 'مطاعم ومقاهي', 'coffee', 'standard', 1),
  ('cat_salon', 'salons', 'Salons & Barbershops', 'صالونات وحلاقة', 'scissors', 'standard', 2),
  ('cat_clinic', 'clinics', 'Clinics', 'عيادات', 'stethoscope', 'healthcare', 3),
  ('cat_hospital', 'hospitals', 'Hospitals & Medical Centers', 'مستشفيات ومراكز طبية', 'hospital', 'healthcare', 4),
  ('cat_car', 'car', 'Car Repair & Car Wash', 'صيانة وغسيل السيارات', 'car', 'standard', 5),
  ('cat_fun', 'entertainment', 'Entertainment Venues', 'أماكن الترفيه', 'ticket', 'timed_entry', 6),
  ('cat_events', 'events', 'Events & Activities', 'فعاليات وأنشطة', 'calendar', 'timed_entry', 7),
  ('cat_gov', 'government', 'Government Service Centers', 'مراكز الخدمات الحكومية', 'landmark', 'standard', 8),
  ('cat_market', 'markets', 'Central Markets & Supermarkets', 'الجمعيات والأسواق', 'basket', 'walk_in', 9),
  ('cat_bank', 'banks', 'Banks', 'البنوك', 'bank', 'standard', 10),
  ('cat_retail', 'retail', 'Retail Stores', 'متاجر التجزئة', 'bag', 'standard', 11),
  ('cat_museum', 'museums', 'Museums', 'المتاحف', 'museum', 'timed_entry', 12)
on conflict (id) do nothing;
