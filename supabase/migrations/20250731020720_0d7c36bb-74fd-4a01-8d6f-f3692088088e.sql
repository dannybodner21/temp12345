INSERT INTO time_slots (service_id, date, start_time, end_time, is_available)
VALUES (
  '0137cccb-8100-490f-a8a7-3eeafcdff456',
  (NOW() AT TIME ZONE 'America/Los_Angeles')::date,
  '10:00:00',
  '11:00:00',
  true
);