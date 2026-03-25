/**
 * TRACE Voice Chat — OpenAI-compatible endpoint for ElevenLabs Conversational AI
 */

module.exports = function registerVoiceChatEndpoint(app, {
  supabaseServer,
  buildTraceSystemPrompt,
  coreMemory,
  memoryStore,
  openai,
}) {
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const userId = req.headers['x-trace-user-id'];
      if (!userId) {
        return res.status(401).json({ error: 'Missing x-trace-user-id header' });
      }

      const { messages = [] } = req.body;
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

      if (!lastUserMessage) {
        return res.status(400).json({ error: 'No user message found' });
      }

      // Load user profile
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('display_name, tone_preference')
        .eq('id', userId)
        .single();

      const displayName = profile?.display_name || null;
      const tonePreference = profile?.tone_preference || 'neutral';

      // Load conversation
      const { data: conversation } = await supabaseServer
        .from('conversations')
        .select('id, current_session_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const conversationId = conversation?.id;

      // Load memory
      let memContext = '';

      if (conversationId) {
        const [storedCoreMemory, sessionSummaries, recentStored] = await Promise.all([
          memoryStore.fetchCoreMemory(supabaseServer, conversationId),
          memoryStore.fetchSessionSummaries(supabaseServer, conversationId, 3),
          memoryStore.fetchRecentMessages(supabaseServer, conversationId, 20),
        ]);

        memContext = coreMemory.buildMemoryContext(
          storedCoreMemory,
          sessionSummaries,
          recentStored.length > 0 ? recentStored : messages,
          0,
          [],
          { isMetaMemoryQuestion: false, turnCount: 0 }
        );
      }

      // Build system prompt
      const systemPrompt = buildTraceSystemPrompt({
        displayName,
        contextSnapshot: memContext || null,
        patternContext: null,
        dreamscapeHistory: null,
        tonePreference,
      });

      // Override system prompt for voice — plain text only, no JSON
      const voiceSystemPrompt = systemPrompt + `

VOICE MODE OVERRIDE: You are in a real-time voice conversation. Respond in plain conversational text only. No JSON, no markdown, no structured output. Just speak naturally as TRACE. Keep responses short — 1-3 sentences max. This is a spoken conversation.`;

      // Build messages for OpenAI
      const openaiMessages = [
        { role: 'system', content: voiceSystemPrompt },
        ...messages.filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content }))
      ];

      // Stream response in OpenAI SSE format
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: openaiMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (err) {
      console.error('[VOICE CHAT] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
};
