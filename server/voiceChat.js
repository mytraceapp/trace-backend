/**
 * TRACE Voice Chat — OpenAI-compatible endpoint for ElevenLabs Conversational AI
 * Receives OpenAI-format requests, runs TRACE brain, streams back in OpenAI SSE format
 */

module.exports = function registerVoiceChatEndpoint(app, {
  supabaseServer,
  buildTraceSystemPrompt,
  coreMemory,
  memoryStore,
  Anthropic,
}) {
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const userId = req.headers['x-trace-user-id'];
      if (!userId) {
        return res.status(401).json({ error: 'Missing x-trace-user-id header' });
      }

      const { messages = [], stream = true } = req.body;
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
      let patternContext = null;
      let dreamscapeHistory = null;

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
        patternContext,
        dreamscapeHistory,
        tonePreference,
      });

      // Build messages for Claude
      const claudeMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      // Stream response in OpenAI SSE format
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const anthropic = new Anthropic();
      const stream_response = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: claudeMessages,
      });

      stream_response.on('text', (text) => {
        const chunk = {
          choices: [{ delta: { content: text }, index: 0 }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });

      stream_response.on('finalMessage', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      stream_response.on('error', (err) => {
        console.error('[VOICE CHAT] Stream error:', err);
        res.end();
      });

    } catch (err) {
      console.error('[VOICE CHAT] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
};
