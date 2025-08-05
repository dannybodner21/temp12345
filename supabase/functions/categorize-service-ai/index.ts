import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== AI Categorization Started ===');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Parse request
    const { serviceName, serviceDescription } = await req.json();
    console.log('Categorizing service:', serviceName);

    if (!serviceName) {
      throw new Error('Service name is required');
    }

    // Step 2: Check environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Step 3: Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 4: Get existing categories
    console.log('Fetching existing categories...');
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('service_categories')
      .select('name, description');

    if (categoriesError) {
      throw new Error(`Database error: ${categoriesError.message}`);
    }

    const existingCategoryList = existingCategories?.map(cat => 
      `- ${cat.name}${cat.description ? ': ' + cat.description : ''}`
    ).join('\n') || 'No existing categories found.';

    console.log(`Found ${existingCategories?.length || 0} existing categories`);

    // Step 5: Call OpenAI for categorization
    console.log('Calling OpenAI API...');
    
    const systemPrompt = `You are an expert at categorizing wellness and personal care services. Your task is to categorize a service into one of the existing categories, or suggest a new category if none fit well.

EXISTING CATEGORIES:
${existingCategoryList}

IMPORTANT RULES:
- If a service clearly fits an existing category, use that category (set "isNew": false)
- Only create a new category if the service doesn't fit any existing ones
- For massage services, use "Massage" if it exists
- For fitness/yoga services, use "Fitness" if it exists
- Be specific but practical with category names

Respond with a JSON object containing:
- "category": The exact name of the existing category OR a new category name
- "isNew": boolean (false if using existing category, true if creating new)
- "description": Only needed if isNew is true
- "confidence": Number 0-1 for how confident you are
- "reasoning": Brief explanation of your choice`;

    const userPrompt = `Service Name: ${serviceName}
${serviceDescription ? `Service Description: ${serviceDescription}` : ''}

Please categorize this service.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const aiData = await openAIResponse.json();
    const aiResult = JSON.parse(aiData.choices[0].message.content);
    console.log('AI Result:', aiResult);

    // Step 6: Handle the categorization result
    let categoryId = null;

    if (aiResult.isNew) {
      // Create new category
      console.log('Creating new category:', aiResult.category);
      const { data: newCategory, error: createError } = await supabase
        .from('service_categories')
        .insert({
          name: aiResult.category,
          description: aiResult.description
        })
        .select('id')
        .maybeSingle();

      if (createError || !newCategory) {
        throw new Error(`Failed to create category: ${createError?.message || 'No data returned'}`);
      }

      categoryId = newCategory.id;
    } else {
      // Find existing category
      console.log('Looking for existing category:', aiResult.category);
      const { data: existingCategory, error: findError } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', aiResult.category)
        .maybeSingle();

      if (findError) {
        throw new Error(`Database error: ${findError.message}`);
      }

      if (existingCategory) {
        categoryId = existingCategory.id;
        console.log('Found existing category with ID:', categoryId);
      } else {
        throw new Error(`Category "${aiResult.category}" not found in database`);
      }
    }

    const result = {
      categoryId,
      categoryName: aiResult.category,
      isNewCategory: aiResult.isNew,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      description: aiResult.description
    };

    console.log('Returning result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to categorize service using AI'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});