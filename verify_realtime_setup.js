
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlnmbdtamysppydnqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_CY6b9B1r3mQRWZjnPSDr7g_SdoSEIzP';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
    console.log('--- Starting Realtime Verification ---');

    // 1. Login as Jwu6
    console.log('Logging in as Jwu6...');
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'Jwu6@jelly.chat', // Assuming email format used in AppContext login
        password: '123456'
    });

    if (loginError) {
        console.error('Login failed:', loginError);
        // Try simple username just in case, though signInWithPassword usually requires email
        // But AppContext handles "username" by appending @jelly.chat or looking up profile.
        // If Jwu6 is a username, we might need to find the email first?
        // Let's assume Jwu6@jelly.chat based on AppContext.
        return;
    }

    console.log('Logged in as:', user.id, user.email);

    // 2. Subscribe to ALL messages (to see if we get ANY event)
    // In AppContext, it subscribes to `room-${conversationId}-${Date.now()}`.
    // Ideally we should subscribe to the specific conversation channel if we knew it, 
    // but for debugging, we want to know if *Postgres Changes* are broadcasting.
    // Supabase Realtime allows subscribing to the table globally if policy permits.

    console.log('Setting up subscription...');

    const channel = supabase.channel('test-monitor')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                console.log('🔥 RECEIVED REALTIME EVENT:', payload);
                console.log('New Message:', payload.new.content);
            }
        )
        .subscribe((status) => {
            console.log('Subscription status:', status);
        });

    console.log('Listening for messages... (Press Ctrl+C to stop)');

    // Keep alive
    setInterval(() => { }, 1000);
}

testRealtime();
