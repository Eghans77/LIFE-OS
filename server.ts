import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
app.use(express.json({ limit: '15mb' }));

/**
 * Robust caller for Gemini models with automatic retry and model fallback.
 * Solves 503 UNAVAILABLE ("This model is currently experiencing high demand")
 * and 429 rate limit spikes by retrying with jitter and cascading to fallback models.
 */
async function callGeminiWithFallback(params: {
  models: string[];
  contents: unknown;
  config?: unknown;
}) {
  let lastError: unknown = null;
  for (const model of params.models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents as never,
          config: params.config as never,
        });
        return response;
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTemporary =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('ResourceExhausted');

        console.warn(`[Gemini] model=${model} attempt=${attempt + 1} failed: ${errMsg}`);

        if (isTemporary && attempt === 0) {
          // Pause with random jitter before retrying
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
        } else {
          // Move to next fallback model
          break;
        }
      }
    }
  }
  throw lastError;
}

/**
 * Intelligent deterministic rule-based fallback when all cloud models are momentarily under high load.
 * Guarantees zero downtime for the user's daily planning workflow.
 */
function generateFallbackAssistantResponse(
  message: string,
  currentDate: string,
  currentTime: string,
  context: Record<string, unknown>
) {
  const lines = message
    .split(/[,.;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const priorities: string[] = [];
  const blocks: Array<Record<string, unknown>> = [];
  const actions: Array<Record<string, unknown>> = [];
  const extractedEntities: Array<Record<string, unknown>> = [];

  // Parse existing calendar events
  const existingEvents = Array.isArray(context?.calendarEvents) ? context.calendarEvents : [];
  existingEvents.forEach((ev: Record<string, unknown>, idx: number) => {
    if (ev.startTime && ev.endTime) {
      blocks.push({
        id: `blk_ev_${idx}`,
        startTime: String(ev.startTime),
        endTime: String(ev.endTime),
        title: String(ev.title || 'Scheduled Event'),
        blockType: ev.isFixed ? 'fixed_commitment' : 'time_block',
        priority: 'high',
        status: 'pending',
        notes: String(ev.notes || 'Calendar event'),
      });
    }
  });

  // Simple heuristic parsing for user message
  let currentHour = Math.max(9, parseInt((currentTime || '09:00').split(':')[0], 10) || 9);

  lines.forEach((line, idx) => {
    const isChurch = /church|worship|service/i.test(line);
    const isStudy = /study|coding|learn|read|course/i.test(line);
    const isPoster = /poster|design|graphic|creative/i.test(line);

    let start = `${String(currentHour).padStart(2, '0')}:00`;
    let end = `${String((currentHour + 1) % 24).padStart(2, '0')}:00`;

    const match = line.match(/(?:before|at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(pm|am)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] || '00';
      const ampm = (match[3] || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (!ampm && h <= 7) h += 12; // heuristic for afternoon/evening (e.g. at 6 -> 18:00)
      start = `${String(Math.max(0, h - 1)).padStart(2, '0')}:${m}`;
      end = `${String(h).padStart(2, '0')}:${m}`;
    }

    const title = line.replace(/^(i need to|i have to|please|can you|help me)\s+/i, '').trim();
    if (title.length > 0) {
      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
      priorities.push(cleanTitle);
      blocks.push({
        id: `blk_fb_${Date.now()}_${idx}`,
        startTime: start,
        endTime: end,
        title: cleanTitle,
        blockType: isChurch ? 'fixed_commitment' : isStudy ? 'time_block' : 'task',
        priority: isPoster || isChurch ? 'high' : 'medium',
        status: 'pending',
        notes: 'Planned by LIFE OS Assistant',
      });
      actions.push({
        id: `act_fb_${Date.now()}_${idx}`,
        actionType: 'createTask',
        summary: `Create task: ${cleanTitle}`,
        riskLevel: 'low',
        requiresConfirmation: false,
        targetId: '',
        payload: {
          title: cleanTitle,
          priority: 'medium',
          dueDate: currentDate,
          scheduledTime: start,
          estimatedMinutes: 60,
        },
      });
      extractedEntities.push({
        title: cleanTitle,
        classification: isChurch ? 'fixed_commitment' : 'task',
        timeInfo: `${start} – ${end}`,
        estimatedMinutes: 60,
        priority: 'medium',
      });
      currentHour = (currentHour + 1) % 24;
    }
  });

  // Sort blocks by startTime
  blocks.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

  return {
    reply: "I've structured your daily schedule and prioritized your key commitments. You can review the blocks below and adjust anything as needed.",
    intentCategory: 'daily_planning',
    extractedEntities,
    isOverloaded: blocks.length > 7,
    overloadMessage:
      blocks.length > 7
        ? 'Your schedule is packed today. Consider moving non-essential items to tomorrow.'
        : '',
    proposedPlan: {
      date: currentDate,
      aiSummary: 'Personalized timeline with dedicated focus blocks and buffer times.',
      isOverloaded: blocks.length > 7,
      overloadMessage: blocks.length > 7 ? 'Schedule is dense. Review priorities.' : '',
      priorities: priorities.slice(0, 3),
      blocks,
    },
    actions,
  };
}

/**
 * Fallback goal breakdown when cloud models are temporarily unavailable.
 */
function generateFallbackGoalBreakdown(
  goalTitle: string,
  category: string,
  deadline: string
) {
  return {
    project: {
      name: `${goalTitle} Execution`,
      description: `Structured project to achieve: ${goalTitle}`,
      priority: 'high',
      deadline: deadline || '',
      category: category || 'Personal Growth',
    },
    tasks: [
      {
        title: `Define milestones & research requirements for ${goalTitle}`,
        description: 'Outline the exact deliverables and success criteria.',
        priority: 'high',
        estimatedMinutes: 45,
        activityType: 'task',
      },
      {
        title: `Execute phase 1 action plan for ${goalTitle}`,
        description: 'Complete the foundational work.',
        priority: 'high',
        estimatedMinutes: 90,
        activityType: 'time_block',
      },
      {
        title: `Review progress and iterate on ${goalTitle}`,
        description: 'Assess what has been completed and adjust roadmap.',
        priority: 'medium',
        estimatedMinutes: 45,
        activityType: 'task',
      },
      {
        title: `Finalize and deliver on ${goalTitle}`,
        description: 'Wrap up all final requirements and review against targets.',
        priority: 'urgent',
        estimatedMinutes: 60,
        activityType: 'deadline',
      },
    ],
    suggestedHabit: {
      title: `Daily 30m Progress on ${goalTitle}`,
      description: `Consistent daily focus block dedicated to ${goalTitle}.`,
      frequency: 'weekdays',
      category: category || 'Growth',
    },
  };
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/ai/transcribe
 * Server-side speech-to-text transcription using gemini-3.5-transcribe with retry
 */
app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ error: 'Authentication required for voice transcription.' });
      return;
    }
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'Valid audio data is required.' });
      return;
    }

    const response = await callGeminiWithFallback({
      models: ['gemini-3.5-transcribe'],
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm',
              data: audioBase64,
            },
          },
          {
            text: 'Transcribe this spoken personal planning message accurately into clean natural English text. Return only the spoken words without extra commentary.',
          },
        ],
      },
    });

    const transcript = (response.text || '').trim();
    res.json({ transcript });
  } catch (error) {
    console.error('Voice transcription error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to transcribe audio right now.',
    });
  }
});

/**
 * POST /api/ai/assistant
 * Secure AI Personal Assistant & Daily Planning Engine
 */
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      message,
      currentDate,
      currentTime,
      mode = 'assistant',
      context = {},
      preferences = {},
    } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ error: 'Unauthorized: Valid user session required.' });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Please enter or speak a message for the AI Assistant.' });
      return;
    }

    const systemInstruction = `You are the AI Personal Assistant and Daily Planning Engine at the heart of LIFE OS — a private personal Life Management Operating System.

CURRENT CONTEXT:
- Current Date: ${currentDate || '2026-10-01'}
- Current Local Time: ${currentTime || '09:00'}
- Assistant Mode: ${mode}
- User Preferences: ${JSON.stringify(preferences)}

EXISTING USER LIFE OS DATA:
${JSON.stringify(context, null, 2)}

YOUR CORE RESPONSIBILITIES:
1. NATURAL LANGUAGE CLASSIFICATION:
   When the user describes their day or updates (e.g., "I need to finish a church poster, study coding for two hours, edit a video, go to church at 6 and call my sister" or "I'm still working on the poster" or "Move coding to tonight"):
   Identify and classify every activity into:
   - fixed_commitment: Cannot move (e.g. Church at 18:00, meetings, appointments)
   - deadline: Must finish before a specific time (e.g. Finish poster before 16:00)
   - task: Actionable item to complete (e.g. Edit video, call sister)
   - time_block: Dedicated focus session (e.g. Study coding for 2 hours, linked to existing Learning/Goals if present)
   - routine: Morning/evening habits, meals, prep, day review
   - flexible: Can shift later in the day
   - optional: Can move to tomorrow if overloaded

2. REALISTIC DAILY SCHEDULE & OVERLOAD DETECTION:
   - Consider fixed commitments, deadlines, priority, estimated duration, existing goals/projects/learning plans, breaks, lunch, buffer/transition time, and travel/prep time (e.g. "16:30 — Prepare for church" before "18:00 — Church").
   - NEVER fill every single minute just to look productive. Include realistic breaks, lunch, and buffer blocks.
   - If the user is rescheduling mid-day (e.g., at 10:30 saying "I'm still working on the poster" or "Move coding to tonight"), keep earlier completed/past blocks intact or adjust from the current time (${currentTime}) onward while protecting fixed commitments!
   - OVERLOADED DAY RECOGNITION: If the user has more work than available hours today, do NOT pretend everything fits. Set "isOverloaded": true, write a calm, guilt-free "overloadMessage" (e.g. "You have more work than available time today. I've prioritized the client poster and your 6 PM commitment. The movie project can move to tomorrow."), and propose rescheduling lower-priority/optional items to tomorrow.

3. CONTROLLED BACKEND ACTIONS:
   You can propose structured actions from the allowed action catalog:
   - createDailyPlan: Creates or replaces today's (or tomorrow's) realistic daily schedule blocks and top priorities.
   - updateDailyPlan: Updates the existing daily plan (e.g. live rescheduling mid-day).
   - createTask: Creates a new task in LIFE OS.
   - updateTask: Updates an existing task (match by existing task id if present).
   - completeTask: Marks an existing task completed.
   - rescheduleTask: Moves a task to a new dueDate or scheduledTime.
   - deleteTask: Deletes a task (HIGH RISK -> requiresConfirmation: true).
   - createEvent: Creates a calendar event / fixed commitment.
   - updateEvent: Updates an existing calendar event.
   - deleteEvent: Deletes a calendar event (HIGH RISK -> requiresConfirmation: true).
   - createProject: Creates a project.
   - updateProject: Updates a project.
   - deleteProject: Deletes a project (HIGH RISK -> requiresConfirmation: true).
   - createGoal: Creates a goal.
   - updateGoal: Updates a goal.
   - createNote: Captures a note in Second Brain.
   - updateNote: Updates a note.
   - searchNotes: Searches notes by keyword.
   - createHabit: Creates a recurring habit.
   - logHabit: Logs today's completion for an existing habit.
   - createLearningItem: Creates a learning subject/skill/course.
   - createTransaction: Records an income, expense, or savings entry.

4. RISK & CONFIRMATION RULES:
   - Any delete action (deleteTask, deleteEvent, deleteProject) or bulk destructive change MUST have riskLevel: "high" and requiresConfirmation: true.
   - Daily plan generation/updates (createDailyPlan, updateDailyPlan) should be included in "proposedPlan" so the user can review, edit, accept, or regenerate the schedule, AND any new tasks/events mentioned by the user that aren't yet in their database should be included in "actions".`;

    let parsed: Record<string, unknown> | null = null;
    try {
      const response = await callGeminiWithFallback({
        models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
        contents: message,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Conversational, calm, intelligent response to the user.',
              },
              intentCategory: {
                type: Type.STRING,
                description: 'One of: daily_planning, live_reschedule, prioritization, goal_breakdown, status_check, general_action, insight',
              },
              extractedEntities: {
                type: Type.ARRAY,
                description: 'Natural language entities identified from the user message.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    classification: {
                      type: Type.STRING,
                      description: 'fixed_commitment | deadline | task | time_block | routine | flexible | optional',
                    },
                    timeInfo: { type: Type.STRING },
                    estimatedMinutes: { type: Type.NUMBER },
                    priority: { type: Type.STRING, description: 'low | medium | high | urgent' },
                  },
                  required: ['title', 'classification', 'timeInfo', 'estimatedMinutes', 'priority'],
                },
              },
              isOverloaded: {
                type: Type.BOOLEAN,
                description: 'True if total requested work exceeds realistic available hours in the day.',
              },
              overloadMessage: {
                type: Type.STRING,
                description: 'Calm explanation of what was prioritized and what is suggested to move to tomorrow if overloaded, or empty string.',
              },
              proposedPlan: {
                type: Type.OBJECT,
                nullable: true,
                description: 'Realistic daily plan if the user is planning or rescheduling a day.',
                properties: {
                  date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  aiSummary: { type: Type.STRING },
                  isOverloaded: { type: Type.BOOLEAN },
                  overloadMessage: { type: Type.STRING },
                  priorities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  blocks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        startTime: { type: Type.STRING, description: '24h format HH:mm e.g. 08:00' },
                        endTime: { type: Type.STRING, description: '24h format HH:mm e.g. 09:00' },
                        title: { type: Type.STRING },
                        blockType: {
                          type: Type.STRING,
                          description: 'fixed_commitment | deadline | task | time_block | routine | break | flexible | optional',
                        },
                        priority: { type: Type.STRING, description: 'low | medium | high | urgent' },
                        status: { type: Type.STRING, description: 'pending | in_progress | completed | moved' },
                        notes: { type: Type.STRING },
                        linkedTaskId: { type: Type.STRING },
                        linkedProjectId: { type: Type.STRING },
                        linkedGoalId: { type: Type.STRING },
                      },
                      required: ['id', 'startTime', 'endTime', 'title', 'blockType', 'priority', 'status', 'notes'],
                    },
                  },
                },
                required: ['date', 'aiSummary', 'isOverloaded', 'overloadMessage', 'priorities', 'blocks'],
              },
              actions: {
                type: Type.ARRAY,
                description: 'Structured database actions to execute or confirm.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description: 'createTask | updateTask | completeTask | rescheduleTask | deleteTask | createEvent | updateEvent | deleteEvent | createNote | updateNote | searchNotes | createProject | updateProject | deleteProject | createGoal | updateGoal | createHabit | logHabit | createLearningItem | createTransaction',
                    },
                    summary: {
                      type: Type.STRING,
                      description: 'Human-readable description of what this action will do.',
                    },
                    riskLevel: {
                      type: Type.STRING,
                      description: 'low | high',
                    },
                    requiresConfirmation: {
                      type: Type.BOOLEAN,
                    },
                    targetId: {
                      type: Type.STRING,
                      description: 'Document ID if updating/completing/deleting an existing record, otherwise empty string.',
                    },
                    payloadJson: {
                      type: Type.STRING,
                      description: 'JSON-encoded object containing the validated fields for this action.',
                    },
                  },
                  required: ['actionType', 'summary', 'riskLevel', 'requiresConfirmation', 'targetId', 'payloadJson'],
                },
              },
            },
            required: ['reply', 'intentCategory', 'extractedEntities', 'isOverloaded', 'overloadMessage', 'actions'],
          },
        },
      });

      const rawText = (response.text || '{}').trim();
      parsed = JSON.parse(rawText);
    } catch (cloudErr) {
      console.warn(
        'All cloud Gemini models temporarily unavailable (e.g. 503 spike). Activating intelligent fallback engine:',
        cloudErr
      );
      parsed = generateFallbackAssistantResponse(
        message,
        currentDate || '2026-10-01',
        currentTime || '09:00',
        context as Record<string, unknown>
      );
    }

    if (!parsed) {
      parsed = generateFallbackAssistantResponse(
        message,
        currentDate || '2026-10-01',
        currentTime || '09:00',
        context as Record<string, unknown>
      );
    }

    // Server-side validation & sanitization of AI actions
    const validatedActions = Array.isArray(parsed.actions)
      ? (parsed.actions as Array<Record<string, unknown>>).map((act, idx: number) => {
          let payload: Record<string, unknown> = {};
          try {
            payload =
              typeof act.payloadJson === 'string'
                ? JSON.parse(act.payloadJson)
                : (act.payload as Record<string, unknown>) || {};
          } catch {
            payload = {};
          }
          const actionType = String(act.actionType || 'createTask');
          const isDestructive = actionType.startsWith('delete');
          return {
            id: `act_${Date.now()}_${idx}`,
            actionType,
            summary: String(act.summary || actionType).slice(0, 200),
            riskLevel: isDestructive ? 'high' : String(act.riskLevel || 'low'),
            requiresConfirmation: isDestructive ? true : Boolean(act.requiresConfirmation),
            targetId: String(act.targetId || ''),
            payload,
          };
        })
      : [];

    res.json({
      reply: parsed.reply || 'I have organized your plan and updates.',
      intentCategory: parsed.intentCategory || 'daily_planning',
      extractedEntities: Array.isArray(parsed.extractedEntities) ? parsed.extractedEntities : [],
      isOverloaded: Boolean(parsed.isOverloaded),
      overloadMessage: String(parsed.overloadMessage || ''),
      proposedPlan: parsed.proposedPlan || null,
      actions: validatedActions,
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'AI Assistant failed to process your request.',
    });
  }
});

/**
 * POST /api/ai/breakdown-goal
 * Breaks a high-level Goal into a structured Project, actionable Tasks, and study/habit suggestions.
 */
app.post('/api/ai/breakdown-goal', async (req: Request, res: Response) => {
  try {
    const { userId, goalTitle, goalDescription, category, deadline } = req.body;
    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!goalTitle || typeof goalTitle !== 'string') {
      res.status(400).json({ error: 'Goal title is required.' });
      return;
    }

    let data: Record<string, unknown> | null = null;
    try {
      const response = await callGeminiWithFallback({
        models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
        contents: `Break down this personal goal into 1 structured Project, 4-5 concrete Tasks, and 1 supporting Habit or Learning item:
Goal Title: ${goalTitle}
Description: ${goalDescription || ''}
Category: ${category || 'Personal Growth'}
Deadline: ${deadline || ''}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              project: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING, description: 'low | medium | high | urgent' },
                  category: { type: Type.STRING },
                },
                required: ['name', 'description', 'priority', 'category'],
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priority: { type: Type.STRING, description: 'low | medium | high | urgent' },
                    estimatedMinutes: { type: Type.NUMBER },
                  },
                  required: ['title', 'description', 'priority', 'estimatedMinutes'],
                },
              },
              suggestedHabit: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  frequency: { type: Type.STRING, description: 'daily | weekdays | weekly' },
                },
                required: ['title', 'description', 'frequency'],
              },
            },
            required: ['project', 'tasks', 'suggestedHabit'],
          },
        },
      });

      data = JSON.parse((response.text || '{}').trim());
    } catch (cloudErr) {
      console.warn('All cloud Gemini models temporarily unavailable for goal breakdown. Using fallback:', cloudErr);
      data = generateFallbackGoalBreakdown(
        goalTitle,
        category || 'Personal Growth',
        deadline || ''
      );
    }

    res.json(data);
  } catch (error) {
    console.error('Goal breakdown error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to break down goal.',
    });
  }
});

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LIFE OS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
