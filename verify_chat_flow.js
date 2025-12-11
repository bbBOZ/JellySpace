
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlnmbdtamysppydnqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_CY6b9B1r3mQRWZjnPSDr7g_SdoSEIzP';

// Create two clients for two users
const clientA = createClient(supabaseUrl, supabaseAnonKey); // Sender (Jwu)
const clientB = createClient(supabaseUrl, supabaseAnonKey); // Receiver (Jwu6)

async function runTest() {
    console.log('--- Starting Chat Flow Verification ---');

    console.log('1. Logging in Users...');

    // Login User A (Jwu)
    const { data: { user: userA }, error: errA } = await clientA.auth.signInWithPassword({
        email: 'Jwu@jelly.chat',
        password: '123456'
    });
    if (errA) { console.error('Login Jwu failed:', errA); return; }
    console.log('✅ Jwu Logged in:', userA.id);

    // Login User B (Jwu6)
    const { data: { user: userB }, error: errB } = await clientB.auth.signInWithPassword({
        email: 'Jwu6@jelly.chat',
        password: '123456'
    });
    if (errB) { console.error('Login Jwu6 failed:', errB); return; }
    console.log('✅ Jwu6 Logged in:', userB.id);

    // 2. Find or Create Conversation
    // In the app, conversation creation logic is complex. For testing, we just need ANY common conversation.
    // Or we can just insert a message if we know the conversation ID.
    // Let's try to list conversations for Jwu and find one with Jwu6.

    console.log('2. Finding Conversation...');
    const { data: members, error: memErr } = await clientA
        .from('conversation_members')
        .select('conversation_id, user_id');

    // Logic to find common conversation (this is a bit simpler than app logic)
    // We need a conversation where BOTH are members.
    // Since we can't easily query that with simple helper, we'll just query conversations.

    // Alternative: We know the structure. 'private' conversation between 2 users.
    // Let's just create a new message in a NEW conversation if needed, or find existing.
    // Actually, to test Realtime, we need to subscribe to the SAME channel or table.

    // Let's setup Receiver (Jwu6) subscription first.
    console.log('3. Setting up Jwu6 Receiver Subscription...');

    const receivedMessages = [];

    const channelB = clientB.channel(`test-room-${Date.now()}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                // Check if message is for a conversation Jwu6 is in? 
                // The client doesn't filter by RLS here, the SERVER does.
                // If Jwu6 receives it, it means RLS allowed it.
                console.log('🔥 [Jwu6] RECEIVED EVENT:', payload.eventType);
                console.log('   Content:', payload.new.content);
                console.log('   Sender:', payload.new.sender_id);
                receivedMessages.push(payload.new);
            }
        )
        .subscribe((status) => {
            console.log('   [Jwu6] Subscription status:', status);
        });

    // Short wait for subscription to be active
    await new Promise(r => setTimeout(r, 2000));

    // 4. Jwu Sends a Message
    // We need a valid conversation ID. 
    // Let's find one where Jwu and Jwu6 are members.
    // We'll use a raw query or just pick the first conversation of Jwu for now and hope Jwu6 is in it, 
    // OR create one.

    // Create a temporary conversation for testing?
    console.log('4. Creating/Finding Conversation...');
    // Try to find existing private chat
    // This SQL query is tricky in client.

    // Simple approach: Create a new private conversation.
    const { data: newConv, error: newConvError } = await clientA
        .from('conversations')
        .insert({ type: 'private', created_by: userA.id })
        .select()
        .single();

    if (newConvError) {
        console.error('Failed to create conv:', newConvError);
        // Maybe try to fetch existing?
    } else {
        console.log('Created test conversation:', newConv.id);
        // Add members
        await clientA.from('conversation_members').insert([
            { conversation_id: newConv.id, user_id: userA.id },
            { conversation_id: newConv.id, user_id: userB.id }
        ]);
        console.log('Added members.');

        // 5. Send Message
        const msgContent = `Test Message ${Date.now()}`;
        console.log(`5. Jwu Sending Message: "${msgContent}" to Conv ${newConv.id}...`);

        const { data: msgData, error: msgError } = await clientA
            .from('messages')
            .insert({
                conversation_id: newConv.id,
                sender_id: userA.id,
                content: msgContent
            })
            .select()
            .single();

        if (msgError) {
            console.error('❌ Send failed:', msgError);
        } else {
            console.log('✅ Message Sent DB ID:', msgData.id);
        }
    }

    // Wait for receive
    console.log('6. Waiting for reception...');
    await new Promise(r => setTimeout(r, 5000));

    if (receivedMessages.length > 0) {
        console.log('SUCCESS: Jwu6 received the message!');
    } else {
        console.log('FAILURE: Jwu6 did NOT receive the message within 5s.');
        console.log('Possible causes: RLS policies, Realtime quota, Connection issues.');
    }

    process.exit(0);
}

runTest();
