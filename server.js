import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - explicitly point to .env file
config({ path: path.join(__dirname, '.env') });

console.log('🔍 Environment Check:');
console.log('  API Key present:', !!process.env.VITE_AZURE_OPENAI_API_KEY);
console.log('  Endpoint:', process.env.VITE_AZURE_OPENAI_ENDPOINT);
console.log('  Deployment:', process.env.VITE_AZURE_OPENAI_DEPLOYMENT);

const app = express();
const PORT = process.env.PORT || 3001;

const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : (isProduction
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173']);

if (allowedOrigins.length === 0) {
  console.warn('⚠️ CORS_ORIGINS is empty in production. Browser requests will be blocked.');
}

// Middleware
const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, health checks, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// Azure OpenAI config from environment variables
const AZURE_CONFIG = {
  apiKey: process.env.VITE_AZURE_OPENAI_API_KEY || '',
  endpoint: process.env.VITE_AZURE_OPENAI_ENDPOINT || '',
  deployment: process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'GPT-5.4',
  apiVersion: '2024-02-15-preview'
};

// Validate configuration
if (!AZURE_CONFIG.apiKey) {
  console.warn('❌ ERROR: VITE_AZURE_OPENAI_API_KEY is not set in .env file');
}
if (!AZURE_CONFIG.endpoint) {
  console.warn('❌ ERROR: VITE_AZURE_OPENAI_ENDPOINT is not set in .env file');
}

// Health check
app.get('/health', (req, res) => {
  const isConfigured = !!AZURE_CONFIG.apiKey && !!AZURE_CONFIG.endpoint;
  res.json({ 
    status: isConfigured ? 'ok' : 'misconfigured',
    service: 'expense-calculator-api',
    azure_configured: isConfigured
  });
});

// Chat endpoint - proxy to Azure OpenAI
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    // Validate configuration
    if (!AZURE_CONFIG.apiKey || !AZURE_CONFIG.endpoint) {
      console.error('❌ Azure credentials missing');
      return res.status(500).json({
        error: 'Azure OpenAI credentials not configured on server',
        hint: 'Make sure .env file has VITE_AZURE_OPENAI_API_KEY and VITE_AZURE_OPENAI_ENDPOINT'
      });
    }

    // Validate request
    if (!messages || !context) {
      return res.status(400).json({
        error: 'Missing messages or context in request'
      });
    }

    // Clean endpoint URL
    let endpoint = AZURE_CONFIG.endpoint;
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }

    // Build correct Azure OpenAI endpoint URL
    const url = `${endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

    console.log('📤 Proxying request to Azure OpenAI');
    console.log('   URL:', url.split('?')[0]);
    console.log('   Deployment:', AZURE_CONFIG.deployment);
    console.log('   Messages count:', messages.length);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_CONFIG.apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: context
          },
          ...messages
        ],
        max_completion_tokens: 500,
        temperature: 0.7
      })
    });

    console.log('   Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Azure API error:', response.status);
      console.error('   Response:', errorText);
      
      return res.status(response.status).json({
        error: `Azure OpenAI API error: ${response.status}`,
        details: errorText.substring(0, 200) // Limit error detail size
      });
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      console.error('❌ No response content from Azure');
      return res.status(500).json({
        error: 'No response from Azure OpenAI',
        data: data
      });
    }

    console.log('✅ Response sent to client successfully');
    res.json({ response: responseContent });

  } catch (error) {
    console.error('❌ Server error:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      error: error.message || 'Internal server error',
      type: error.constructor.name
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Expense Calculator API Server              ║
║  🚀 Running on http://localhost:${PORT}          ║
║  📡 Chat API: POST /api/chat                ║
║  💚 Health: GET /health                     ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
