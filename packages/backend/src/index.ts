import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join } from 'path';
import applicationsRouter from './routes/applications';
import budgetRouter from './routes/budget';
import criteriaRouter from './routes/criteria';
import { processApplicantMessage, processAdminMessage, isAIConfigured } from './services/ai';
import { loadApplications, loadBudgetConfig } from './services/data';
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

// Dev status endpoint - reads from WHAT_WE_ARE_WORKING_ON.md
app.get('/api/dev-status', (_req, res) => {
  try {
    const mdPath = join(__dirname, '../../../WHAT_WE_ARE_WORKING_ON.md');
    const content = readFileSync(mdPath, 'utf-8');
    
    // Parse the markdown table for team tasks
    const tasks: { person: string; task: string }[] = [];
    const tableMatch = content.match(/\| Person \| Current Task \|[\s\S]*?(?=\n\n|## |$)/);
    
    if (tableMatch) {
      const lines = tableMatch[0].split('\n').slice(2); // Skip header and separator
      for (const line of lines) {
        const match = line.match(/\|\s*(\w+)\s*\|\s*(.+?)\s*\|/);
        if (match) {
          tasks.push({ person: match[1], task: match[2] });
        }
      }
    }
    
    // Extract notes section
    const notesMatch = content.match(/## Notes\n([\s\S]*?)(?=\n## |$)/);
    const notes = notesMatch ? notesMatch[1].trim() : '';
    
    res.json({ success: true, tasks, notes });
  } catch (error) {
    res.json({ 
      success: true, 
      tasks: [
        { person: 'Team', task: 'Update WHAT_WE_ARE_WORKING_ON.md to show tasks' }
      ],
      notes: 'Create WHAT_WE_ARE_WORKING_ON.md in project root'
    });
  }
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
    context: 'application' | 'admin';
  }
>();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Initialize conversation state
  conversations.set(ws, {
    history: [],
    formData: {},
    context: 'application',
  });

  ws.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const state = conversations.get(ws);

      if (!state) return;

      if (parsed.type === 'setContext') {
        // Update context (admin or application)
        state.context = parsed.context || 'application';
        state.history = []; // Clear history on context switch
        console.log(`Context set to: ${state.context}`);
      } else if (parsed.type === 'chat') {
        const userMessage = parsed.message;

        // Add user message to history
        state.history.push({
          id: Date.now().toString(),
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        });

        if (isAIConfigured()) {
          let response;
          
          if (state.context === 'admin') {
            // Load current data for admin context
            const applications = await loadApplications();
            const budgetConfig = await loadBudgetConfig();
            response = await processAdminMessage(
              userMessage, 
              state.history, 
              applications, 
              budgetConfig.categories
            );
          } else {
            // Process with AI for applicant
            response = await processApplicantMessage(userMessage, state.history, state.formData);

            // Update form data with field updates
            response.fieldUpdates.forEach((update) => {
              (state.formData as Record<string, string | number>)[update.field] =
                update.field === 'requestedAmount' ? parseFloat(update.value) : update.value;
            });
          }

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
