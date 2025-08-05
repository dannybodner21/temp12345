import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getTodayInPacific, formatDateInPacific } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
  provider_id: string;
  platform: 'square' | 'vagaro' | 'zenoti' | 'boulevard';
  appointment_ids?: string[];
  sync_type?: 'full' | 'incremental';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { provider_id, platform, appointment_ids, sync_type = 'full' } = await req.json() as ProcessRequest;

    console.log(`Processing ${platform} appointments for provider ${provider_id}, sync_type: ${sync_type}`);
    console.log(`Appointment IDs filter: ${appointment_ids ? appointment_ids.join(',') : 'none (all appointments)'}`);
    
    // Debug: First check what appointments exist
    const { data: allAppointments, error: debugError } = await supabase
      .from('synced_appointments')
      .select('*')
      .eq('provider_id', provider_id)
      .eq('platform', platform);
    
    console.log(`Found ${allAppointments?.length || 0} total appointments for this provider/platform`);
    console.log('All appointments:', JSON.stringify(allAppointments, null, 2));

    // Get synced appointments to process
    let appointmentsQuery = supabase
      .from('synced_appointments')
      .select('*')
      .eq('provider_id', provider_id)
      .eq('platform', platform)
      .eq('is_available', true);

    if (appointment_ids && appointment_ids.length > 0) {
      appointmentsQuery = appointmentsQuery.in('id', appointment_ids);
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      console.log('No appointments to process');
      return new Response(
        JSON.stringify({ success: true, processed_count: 0, services_created: 0, time_slots_created: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider info and settings for service creation
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('*, default_discount_percentage, requires_service_approval')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider not found');
    }

    const defaultDiscountPercentage = provider.default_discount_percentage || 0;
    const requiresApproval = provider.requires_service_approval ?? true;

    // Group appointments by service to create unique services
    const serviceGroups = new Map<string, any[]>();
    
    for (const appointment of appointments) {
      const serviceKey = `${appointment.service_name || 'Unknown Service'}_${appointment.duration_minutes || 60}`;
      if (!serviceGroups.has(serviceKey)) {
        serviceGroups.set(serviceKey, []);
      }
      serviceGroups.get(serviceKey)!.push(appointment);
    }

    let servicesCreated = 0;
    let timeSlotsCreated = 0;

    // Process each service group
    for (const [serviceKey, serviceAppointments] of serviceGroups.entries()) {
      const firstAppointment = serviceAppointments[0];
      const serviceName = firstAppointment.service_name || 'Unknown Service';
      const duration = firstAppointment.duration_minutes || 60;
      const averagePrice = serviceAppointments.reduce((sum, app) => sum + (app.total_amount || 0), 0) / serviceAppointments.length;

      // Check if service already exists with sync source
      const { data: existingService, error: serviceCheckError } = await supabase
        .from('services')
        .select('id')
        .eq('provider_id', provider_id)
        .eq('sync_source', platform)
        .eq('platform_service_id', serviceKey)
        .maybeSingle();

      if (serviceCheckError && serviceCheckError.code !== 'PGRST116') {
        console.error('Error checking existing service:', serviceCheckError);
        continue;
      }

      // Also check for watched services (no sync_source but matching name)
      const { data: watchedService, error: watchedCheckError } = await supabase
        .from('services')
        .select('id, price, original_price, duration_minutes, category_id')
        .eq('provider_id', provider_id)
        .eq('name', serviceName)
        .is('sync_source', null)
        .maybeSingle();

      if (watchedCheckError && watchedCheckError.code !== 'PGRST116') {
        console.error('Error checking watched service:', watchedCheckError);
        continue;
      }

      let serviceId = existingService?.id;

      // If watched service exists, convert it to a synced service
      if (watchedService && !existingService) {
        console.log(`Found watched service "${serviceName}" - converting to synced service`);
        
        const { error: updateError } = await supabase
          .from('services')
          .update({
            sync_source: platform,
            platform_service_id: serviceKey,
            sync_metadata: {
              platform: platform,
              created_from_appointments: true,
              service_key: serviceKey,
              appointment_count: serviceAppointments.length,
              was_watched_service: true,
              converted_at: new Date().toISOString()
            }
          })
          .eq('id', watchedService.id);

        if (updateError) {
          console.error('Error updating watched service:', updateError);
          continue;
        }

        serviceId = watchedService.id;
        console.log(`Converted watched service "${serviceName}" to synced service (ID: ${serviceId})`);
      }

      // Create service if it doesn't exist and isn't a watched service
      if (!serviceId) {
        // Smart categorize the service
        let categoryId = await smartCategorizeService(supabase, serviceName);
        
        // Fallback to platform-specific category if no smart match
        if (!categoryId) {
          const { data: category, error: categoryError } = await supabase
            .from('service_categories')
            .select('id')
            .eq('name', getDefaultCategoryName(platform))
            .maybeSingle();

          categoryId = category?.id;

          if (!categoryId) {
            // Create default category for the platform
            const { data: newCategory, error: newCategoryError } = await supabase
              .from('service_categories')
              .insert({
                name: getDefaultCategoryName(platform),
                description: `Services synced from ${platform}`,
                icon_name: getPlatformIcon(platform)
              })
              .select('id')
              .single();

            if (newCategoryError) {
              console.error('Error creating category:', newCategoryError);
              continue;
            }
            categoryId = newCategory.id;
          }
        }

        // Apply discount to the service price
        // Adjust for platform fee: if provider sets 27% discount, customer sees 20% (27% - 7%)
        const originalPrice = averagePrice || 0;
        const platformFeePercentage = 7; // Lately keeps 7%
        const effectiveDiscountPercentage = Math.max(0, defaultDiscountPercentage - platformFeePercentage);
        const discountAmount = (originalPrice * effectiveDiscountPercentage) / 100;
        const discountedPrice = originalPrice - discountAmount;

        // Get service description from platform-specific data if available
        const firstAppointmentData = firstAppointment.platform_specific_data || {};
        const serviceDescription = firstAppointmentData.service_description || 
                                 `${serviceName} - Synced from ${platform}`;

        // Create the service
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert({
            name: serviceName,
            description: serviceDescription,
            price: discountedPrice,
            original_price: originalPrice,
            duration_minutes: duration,
            category_id: categoryId,
            provider_id: provider_id,
            is_available: !requiresApproval, // If approval required, service starts as unavailable
            sync_source: platform,
            platform_service_id: serviceKey,
            sync_metadata: {
              platform: platform,
              created_from_appointments: true,
              service_key: serviceKey,
              appointment_count: serviceAppointments.length,
              discount_applied: defaultDiscountPercentage,
              requires_approval: requiresApproval,
              has_catalog_description: !!firstAppointmentData.service_description
            }
          })
          .select('id')
          .single();

        if (serviceError) {
          console.error('Error creating service:', serviceError);
          continue;
        }

        serviceId = newService.id;
        servicesCreated++;
        console.log(`Created service: ${serviceName} (ID: ${serviceId}) - Approval required: ${requiresApproval}, Discount: ${defaultDiscountPercentage}%`);

        // If approval is required, send notification to provider
        if (requiresApproval) {
          try {
            await supabase.functions.invoke('notify-new-service', {
              body: {
                provider_id,
                service_name: serviceName,
                service_id: serviceId,
                platform,
                original_price: originalPrice,
                discounted_price: discountedPrice,
                discount_percentage: defaultDiscountPercentage
              }
            });
            console.log(`Sent approval notification for service: ${serviceName}`);
          } catch (notificationError) {
            console.error('Error sending service approval notification:', notificationError);
            // Don't fail the entire process if notification fails
          }
        }
      }

      // Create time slots for appointments (using Pacific Time)
      const todayPacific = getTodayInPacific();
      
      console.log(`Today is: ${todayPacific} (Pacific Time)`);
      console.log(`Processing ${serviceAppointments.length} appointments for time slot creation`);

      for (const appointment of serviceAppointments) {
        const appointmentDate = new Date(appointment.appointment_date);
        const appointmentDateStr = formatDateInPacific(appointmentDate);
        
        console.log(`Appointment date: ${appointmentDateStr}, Today: ${todayPacific}`);

        // Create time slots for today's and future appointments (not just today)
        if (appointmentDateStr >= todayPacific) {
          // Check if time slot already exists
          const { data: existingSlot, error: slotCheckError } = await supabase
            .from('time_slots')
            .select('id')
            .eq('service_id', serviceId)
            .eq('platform_appointment_id', appointment.platform_appointment_id)
            .maybeSingle();

          if (slotCheckError && slotCheckError.code !== 'PGRST116') {
            console.error('Error checking existing time slot:', slotCheckError);
            continue;
          }

          if (!existingSlot) {
            const startTime = appointmentDate.toTimeString().split(' ')[0].substring(0, 5);
            const endTime = new Date(appointmentDate.getTime() + duration * 60000).toTimeString().split(' ')[0].substring(0, 5);

            const { error: slotError } = await supabase
              .from('time_slots')
              .insert({
                service_id: serviceId,
                date: appointmentDateStr,
                start_time: startTime,
                end_time: endTime,
                is_available: appointment.is_available,
                sync_source: platform,
                platform_appointment_id: appointment.platform_appointment_id,
                sync_metadata: {
                  platform: platform,
                  appointment_id: appointment.id,
                  customer_name: appointment.customer_name,
                  status: appointment.status
                }
              });

            if (slotError) {
              console.error('Error creating time slot:', slotError);
              continue;
            }

            timeSlotsCreated++;
            console.log(`Created time slot for ${serviceName} at ${startTime}`);
          }
        }
      }
    }

    console.log(`Processing complete: ${servicesCreated} services created, ${timeSlotsCreated} time slots created`);

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: appointments.length,
        services_created: servicesCreated,
        time_slots_created: timeSlotsCreated
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-synced-appointments:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getDefaultCategoryName(platform: string): string {
  switch (platform) {
    case 'square':
      return 'Square Services';
    case 'vagaro':
      return 'Salon & Spa';
    case 'zenoti':
      return 'Wellness Services';
    case 'boulevard':
      return 'Beauty Services';
    default:
      return 'Platform Services';
  }
}

function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'square':
      return 'credit-card';
    case 'vagaro':
      return 'scissors';
    case 'zenoti':
      return 'flower';
    case 'boulevard':
      return 'sparkles';
    default:
      return 'calendar';
  }
}

// Smart categorization function using the same logic as the frontend
async function smartCategorizeService(supabase: any, serviceName: string): Promise<string | null> {
  const lowerServiceName = serviceName.toLowerCase();
  
  console.log(`Smart categorizing service: ${serviceName}`);
  
  // Define keyword mapping to category names
  const categoryMatches = [
    { keywords: ['massage', 'deep tissue', 'swedish', 'hot stone', 'prenatal', 'sports massage'], category: 'Massage' },
    { keywords: ['yoga', 'pilates', 'fitness', 'workout', 'exercise', 'training'], category: 'Fitness' },
    { keywords: ['facial', 'skincare', 'beauty', 'makeup', 'eyebrow', 'brow', 'lashes', 'lash', 'lamination', 'tint', 'lift'], category: 'Beauty' },
    { keywords: ['nail', 'manicure', 'pedicure'], category: 'Nail Care' },
    { keywords: ['hair', 'haircut', 'styling', 'color', 'highlights'], category: 'Hair Care' },
    { keywords: ['therapy', 'counseling', 'mental health', 'wellness'], category: 'Therapy' },
  ];

  // Check for keyword matches
  for (const match of categoryMatches) {
    if (match.keywords.some(keyword => lowerServiceName.includes(keyword))) {
      console.log(`Found keyword match for "${serviceName}" -> "${match.category}"`);
      
      // Try to find the existing category
      const { data: existingCategory, error } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', match.category)
        .maybeSingle();

      if (error) {
        console.error(`Error finding category ${match.category}:`, error);
        continue;
      }

      if (existingCategory) {
        console.log(`Using existing category: ${match.category} (ID: ${existingCategory.id})`);
        return existingCategory.id;
      } else {
        // Create the category if it doesn't exist
        console.log(`Creating new category: ${match.category}`);
        const { data: newCategory, error: createError } = await supabase
          .from('service_categories')
          .insert({
            name: match.category,
            description: `${match.category} services`,
            icon_name: getCategoryIcon(match.category)
          })
          .select('id')
          .maybeSingle();

        if (createError) {
          console.error(`Error creating category ${match.category}:`, createError);
          continue;
        }

        if (newCategory) {
          console.log(`Created new category: ${match.category} (ID: ${newCategory.id})`);
          return newCategory.id;
        }
      }
    }
  }

  console.log(`No smart category match found for: ${serviceName}`);
  return null;
}

// Get appropriate icon for each category
function getCategoryIcon(categoryName: string): string {
  switch (categoryName.toLowerCase()) {
    case 'massage':
      return 'hand';
    case 'fitness':
      return 'dumbbell';
    case 'beauty':
      return 'sparkles';
    case 'nail care':
      return 'palette';
    case 'hair care':
      return 'scissors';
    case 'therapy':
      return 'heart';
    default:
      return 'tag';
  }
}