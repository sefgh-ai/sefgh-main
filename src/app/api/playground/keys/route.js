import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Generate a secure API key
 */
function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sk_${hex}`;
}

/**
 * POST /api/playground/keys
 * Create a new API key for the authenticated user
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to create API keys.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    // Generate unique key with retry logic
    let attempts = 0;
    let newKey = null;
    let data = null;
    
    while (attempts < 3) {
      try {
        newKey = generateApiKey();
        
        const { data: insertedData, error: insertError } = await supabase
          .from('api_keys')
          .insert([
            {
              user_id: user.id,
              name: name.trim(),
              key: newKey,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (insertError) {
          // If unique constraint violation, retry with new key
          if (insertError.code === '23505') {
            attempts++;
            continue;
          }
          throw insertError;
        }

        data = insertedData;
        break;
      } catch (error) {
        if (attempts >= 2) throw error;
        attempts++;
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to generate unique API key after multiple attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
    });

  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
