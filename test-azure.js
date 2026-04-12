import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());

const AZURE_CONFIG = {
  apiKey: process.env.VITE_AZURE_OPENAI_API_KEY || '',
  endpoint: process.env.VITE_AZURE_OPENAI_ENDPOINT || '',
  deployment: process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo',
  apiVersion: '2024-02-15-preview'
};

console.log('\n🔍 AZURE CONFIGURATION DIAGNOSTIC\n');
console.log('📋 Loaded Config:');
console.log('  • API Key:', AZURE_CONFIG.apiKey.substring(0, 20) + '...');
console.log('  • Endpoint:', AZURE_CONFIG.endpoint);
console.log('  • Deployment:', AZURE_CONFIG.deployment);
console.log('  • API Version:', AZURE_CONFIG.apiVersion);

// Test endpoint validation
app.get('/test-azure', async (req, res) => {
  try {
    console.log('\n🧪 Testing Azure connection...\n');

    if (!AZURE_CONFIG.apiKey) {
      return res.status(400).json({ error: 'API_KEY is empty' });
    }

    if (!AZURE_CONFIG.endpoint) {
      return res.status(400).json({ error: 'ENDPOINT is empty' });
    }

    // Make a test request to Azure
    let endpoint = AZURE_CONFIG.endpoint;
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);

    const url = `${endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

    console.log('📤 Test Request Details:');
    console.log('   URL:', url);
    console.log('   Headers:');
    console.log('     • Content-Type: application/json');
    console.log('     • api-key: ' + AZURE_CONFIG.apiKey.substring(0, 10) + '...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_CONFIG.apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ],
        max_completion_tokens: 10
      })
    });

    console.log('📥 Response Status:', response.status);

    const responseText = await response.text();
    console.log('📄 Response Body:', responseText.substring(0, 200));

    if (!response.ok) {
      console.log('❌ ERROR - Azure rejected request\n');
      return res.status(response.status).json({
        error: `Azure API Error ${response.status}`,
        details: responseText,
        suggestion: getSuggestion(response.status, responseText)
      });
    }

    console.log('✅ SUCCESS - Azure is reachable!\n');
    res.json({ 
      success: true, 
      message: 'Azure OpenAI is working',
      config: {
        endpoint: AZURE_CONFIG.endpoint,
        deployment: AZURE_CONFIG.deployment,
        keyValid: true
      }
    });

  } catch (error) {
    console.log('❌ EXCEPTION:', error.message, '\n');
    res.status(500).json({
      error: error.message,
      type: error.constructor.name,
      suggestion: 'Check internet connection and endpoint URL'
    });
  }
});

function getSuggestion(status, body) {
  if (status === 401) {
    return 'Your API key is invalid. Check VITE_AZURE_OPENAI_API_KEY in .env';
  } else if (status === 404) {
    return 'The endpoint or deployment doesn\'t exist. Check VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_DEPLOYMENT in .env';
  } else if (status === 400) {
    return 'Bad request. The deployment name might be incorrect.';
  } else if (status === 429) {
    return 'Rate limited. You\'ve made too many requests.';
  }
  return 'Check your Azure OpenAI configuration';
}

app.listen(3002, () => {
  console.log('🔧 Diagnostic server running at http://localhost:3002');
  console.log('📡 Test endpoint: http://localhost:3002/test-azure\n');
});
