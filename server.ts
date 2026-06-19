import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini SDK securely on the server-side
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for calling Gemini with backoff retry and fallback model robustness
async function callGemini(prompt: string, systemInstruction?: string, responseSchema?: any, temperature?: number) {
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not set up correctly in Settings > Secrets.');
  }

  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (temperature !== undefined) {
    config.temperature = temperature;
  }
  if (responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = responseSchema;
  }

  // Sequentially try models under high demand conditions
  const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    // Try up to 2 attempts per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI Lab] Calling Gemini using model: ${modelName} (attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config
        });
        
        if (response && response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || '';
        const is503 = errMsg.includes('503') || errMsg.includes('temporary') || errMsg.includes('overloaded') || errMsg.includes('demand');
        
        console.warn(`[AI Lab] Attempt ${attempt} failed for model ${modelName}. Error: ${errMsg}`);
        
        if (attempt === 2 || !is503) {
          // If this was the last attempt, or if it's a non-retriable error, break to fall back to the next model
          break;
        }
        
        // Wait briefly (exponential backoff) before second attempt on same model
        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError || new Error('All model generation attempts failed.');
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// General Prompt Generator
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction, temperature } = req.body;
    const text = await callGemini(prompt, systemInstruction, null, temperature);
    res.json({ text });
  } catch (error: any) {
    console.error('Error generating general prompt:', error);
    res.status(500).json({ error: error.message || 'Error occurred during generation' });
  }
});

// Document Editor Enhancer
app.post('/api/editor/enhance', async (req, res) => {
  try {
    const { text, action, tone } = req.body;
    let prompt = '';
    let systemInstruction = 'You are an elite, professional content editor. Return ONLY the edited/enhanced text. Do not add conversational intro, markdown container block headers, or extra meta feedback.';

    if (action === 'expand') {
      prompt = `Expand the following text to add rich details, examples, and clarity. Keep the original core meaning:\n\n"${text}"`;
    } else if (action === 'rewrite') {
      prompt = `Rewrite and rephrase the following text elegantly, improving the flow, vocabulary, and readability. Keep the length similar:\n\n"${text}"`;
    } else if (action === 'summarize') {
      prompt = `Provide a concise, high-impact summary of the following text:\n\n"${text}"`;
    } else if (action === 'action_items') {
      prompt = `Extract a structured checklist of action items, deliverables, and tasks from the following text as clear bullet points:\n\n"${text}"`;
    } else if (action === 'change_tone') {
      prompt = `Adjust the tone of the following text to sound extremely ${tone || 'professional'} and polished:\n\n"${text}"`;
    } else {
      prompt = `Polish and clean up this text:\n\n"${text}"`;
    }

    const result = await callGemini(prompt, systemInstruction);
    res.json({ text: result });
  } catch (error: any) {
    console.error('Error in editor enhance:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance document text' });
  }
});

// Plan & Subtasks Generator
app.post('/api/generator/plan', async (req, res) => {
  try {
    const { goal } = req.body;
    const systemInstruction = 'You are an advanced strategic organizer and project planner. You breakdown large ambitions into realistic steps and actionable milestones.';
    
    // Structured Schema for detailed plan
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'The title of the plan' },
        description: { type: 'STRING', description: 'A structured overview or summary of the goal' },
        timeline: { type: 'STRING', description: 'Suggested timeline/duration' },
        milestones: {
          type: 'ARRAY',
          description: 'High level phases or chapters of the plan',
          items: {
            type: 'OBJECT',
            properties: {
              phase: { type: 'STRING', description: 'Phase number or name' },
              title: { type: 'STRING', description: 'Title of the phase' },
              tasks: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Specific actionable steps in this phase'
              }
            },
            required: ['phase', 'title', 'tasks']
          }
        }
      },
      required: ['title', 'description', 'timeline', 'milestones']
    };

    const text = await callGemini(
      `Create a structural subtask plan to accomplish the following goal:\n\n"${goal}"`,
      systemInstruction,
      responseSchema
    );

    res.json(JSON.parse(text || '{}'));
  } catch (error: any) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate goal plan' });
  }
});

// Storyboard Generator
app.post('/api/generator/storyboard', async (req, res) => {
  try {
    const { script } = req.body;
    const systemInstruction = 'You are an creative director and visual designer. You conceptualize screen stories into a highly visual storyboard sequence of cards.';

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        storyTitle: { type: 'STRING', description: 'The overall storyboard title' },
        scenes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              sceneNumber: { type: 'INTEGER', description: 'Scene index starting from 1' },
              visualPrompt: { type: 'STRING', description: 'Detailed visual prompt describing the scene for an image generator (lighting, setting, characters, action)' },
              caption: { type: 'STRING', description: 'Dialogue, text overlay, or narrative description accompanying this scene' },
              mood: { type: 'STRING', description: 'The dominant color, emotional, or visual mood of the frame (e.g. moody sunset, clinical white, warm retro)' }
            },
            required: ['sceneNumber', 'visualPrompt', 'caption', 'mood']
          }
        }
      },
      required: ['storyTitle', 'scenes']
    };

    const text = await callGemini(
      `Break down the following story outline/script into a 4-card detailed storyboard:\n\n"${script}"`,
      systemInstruction,
      responseSchema
    );

    res.json(JSON.parse(text || '{}'));
  } catch (error: any) {
    console.error('Error generating storyboard:', error);
    res.status(500).json({ error: error.message || 'Failed to generate storyboard schema' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
const PORT = 3000;

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Production serving of built assets
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Lab & Workspace] Server starts on port ${PORT}`);
});
