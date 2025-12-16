import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import applicationsRouter from './routes/applications';
import budgetRouter from './routes/budget';
import criteriaRouter from './routes/criteria';
import { processApplicantMessage, isAIConfigured } from './services/ai';
import type { Message, ApplicationFormData } from '@dove-grants/shared';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: isAIConfigured(),
  });
});

// API Routes
app.use('/api/applications', applicationsRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/criteria', criteriaRouter);

// Create HTTP server
const server = createServer(app);

// WebSocket server for AI chat
const wss = new WebSocketServer({ server, path: '/ws' });

// Store conversation state per connection
const conversations = new Map<
  WebSocket,
  {
    history: Message[];
    formData: Partial<ApplicationFormData>;
  }
>();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Initialize conversation state
  conversations.set(ws, {
    history: [],
    formData: {},
  });

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'message',
      data: {
        message: "Hi! I'm here to help you apply for a grant. Tell me about your project!",
        fieldUpdates: [],
        isComplete: false,
      },
    })
  );

  ws.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const state = conversations.get(ws);

      if (!state) return;

      if (parsed.type === 'chat') {
        const userMessage = parsed.message;

        // Add user message to history
        state.history.push({
          id: Date.now().toString(),
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        });

        if (isAIConfigured()) {
          // Process with AI
          const response = await processApplicantMessage(userMessage, state.history, state.formData);

          // Update form data with field updates
          response.fieldUpdates.forEach((update) => {
            (state.formData as Record<string, string | number>)[update.field] =
              update.field === 'requestedAmount' ? parseFloat(update.value) : update.value;
          });

          // Add assistant message to history
          state.history.push({
            id: Date.now().toString(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            fieldUpdates: response.fieldUpdates,
          });

          ws.send(JSON.stringify({ type: 'message', data: response }));
        } else {
          // Fallback without AI
          ws.send(
            JSON.stringify({
              type: 'message',
              data: {
                message:
                  'AI is not configured. Please fill out the form manually on the right side.',
                fieldUpdates: [],
                isComplete: false,
              },
            })
          );
        }
      } else if (parsed.type === 'formUpdate') {
        // Manual form update from client
        Object.assign(state.formData, parsed.data);
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    conversations.delete(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🕊️ Dove Grants backend running on http://localhost:${PORT}`);
  console.log(`   AI configured: ${isAIConfigured()}`);
});
