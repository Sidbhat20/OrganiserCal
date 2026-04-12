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
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    if (!apiKey || !endpoint) {
      res.status(500).json({
        error: 'Azure OpenAI is not configured',
        hint: 'Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in Vercel environment variables.'
      });
      return;
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: context },
          ...messages
        ],
        max_completion_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const details = await response.text();
      res.status(response.status).json({
        error: `Azure OpenAI API error: ${response.status}`,
        details
      });
      return;
    }

    const data = await response.json();
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
