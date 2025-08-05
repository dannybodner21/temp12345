-- Add more time slots for Deep Tissue Massage to ensure it stays visible
-- First, let's add slots for the next 14 days starting from today

-- Get the service ID for Deep Tissue Massage
DO $$
DECLARE
    deep_tissue_service_id UUID;
    slot_date DATE;
    slot_time TIME;
    slot_times TIME[] := ARRAY['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'];
    i INTEGER;
    day_offset INTEGER;
BEGIN
    -- Get the Deep Tissue Massage service ID
    SELECT id INTO deep_tissue_service_id 
    FROM services 
    WHERE name = 'Deep Tissue Massage' 
    LIMIT 1;
    
    -- Only proceed if the service exists
    IF deep_tissue_service_id IS NOT NULL THEN
        -- Add time slots for the next 14 days
        FOR day_offset IN 0..13 LOOP
            slot_date := CURRENT_DATE + day_offset;
            
            -- Add multiple time slots per day
            FOREACH slot_time IN ARRAY slot_times LOOP
                -- Check if this time slot already exists
                IF NOT EXISTS (
                    SELECT 1 FROM time_slots 
                    WHERE service_id = deep_tissue_service_id 
                    AND date = slot_date 
                    AND start_time = slot_time
                ) THEN
                    INSERT INTO time_slots (
                        service_id,
                        date,
                        start_time,
                        end_time,
                        is_available
                    ) VALUES (
                        deep_tissue_service_id,
                        slot_date,
                        slot_time,
                        slot_time + INTERVAL '90 minutes',  -- 90 minute sessions
                        true
                    );
                END IF;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Added time slots for Deep Tissue Massage service';
    ELSE
        RAISE NOTICE 'Deep Tissue Massage service not found';
    END IF;
END $$;