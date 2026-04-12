export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      messages = [],
      context = 'You are a helpful assistant.'
    } = req.body || {};

    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.VITE_AZURE_OPENAI_API_KEY || '';
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || process.env.VITE_AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'GPT-5.4';
    const modelName = process.env.AZURE_OPENAI_MODEL || process.env.VITE_AZURE_OPENAI_MODEL || deployment;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    if (!apiKey || !endpoint) {
      res.status(500).json({
        error: 'Azure OpenAI is not configured',
        hint: 'Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in Vercel environment variables.'
      });
      return;
    }

    const baseMessages = [
      { role: 'system', content: context },
      ...messages
    ];

    const candidates = [
      {
        label: 'azure-openai-deployment',
        url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        payload: {
          messages: baseMessages,
          max_completion_tokens: 500,
          temperature: 0.7
        }
      },
      {
        label: 'azure-foundry-models',
        url: `${endpoint}/models/chat/completions?api-version=${apiVersion}`,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        payload: {
          model: modelName,
          messages: baseMessages,
          max_tokens: 500,
          temperature: 0.7
        }
      },
      {
        label: 'azure-openai-v1',
        url: `${endpoint}/openai/v1/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          Authorization: `Bearer ${apiKey}`
        },
        payload: {
          model: modelName,
          messages: baseMessages,
          max_completion_tokens: 500,
          temperature: 0.7
        }
      }
    ];

    let data = null;
    const attemptErrors = [];

    for (const candidate of candidates) {
      const response = await fetch(candidate.url, {
        method: 'POST',
        headers: candidate.headers,
        body: JSON.stringify(candidate.payload)
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      const details = await response.text();
      attemptErrors.push({
        route: candidate.label,
        status: response.status,
        details
      });
    }

    if (!data) {
      const all404 = attemptErrors.length > 0 && attemptErrors.every((e) => e.status === 404);
      res.status(all404 ? 404 : 502).json({
        error: all404 ? 'Azure OpenAI API error: 404 Resource not found' : 'Azure OpenAI API request failed',
        attempts: attemptErrors,
        hint: 'Endpoint/key may be valid but deployment or model does not exist on that Azure resource. Verify AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT (deployment id), AZURE_OPENAI_MODEL, and API version in Vercel Production env.'
      });
      return;
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      res.status(502).json({ error: 'No valid response from Azure OpenAI' });
      return;
    }

    res.status(200).json({ response: reply });
  } catch (error) {
    res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
