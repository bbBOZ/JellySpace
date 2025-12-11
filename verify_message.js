import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlnmbdtamysppydnqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_CY6b9B1r3mQRWZjnPSDr7g_SdoSEIzP';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log('Verifying database access...');

    // 1. Check Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(2);

    if (profileError) {
        console.error('❌ Check Profiles Failed:', JSON.stringify(profileError, null, 2));
    } else {
        console.log('✅ Profiles Table Accessible:', profiles.length, 'rows');
    }

    // 2. Check Messages
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, content, sender_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (msgError) {
        console.error('❌ Check Messages Failed:', JSON.stringify(msgError, null, 2));
        if (msgError.code === 'PGRST200') {
            console.log('💡 Tip: Schema cache might be stale. Try reloading PostgREST schema cache.');
        }
    } else {
        console.log('✅ Messages Table Accessible:', messages.length, 'rows');
        console.log('Recent Messages:');
        console.log(JSON.stringify(messages, null, 2));
    }
}

verify();
