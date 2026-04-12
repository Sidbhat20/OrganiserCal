export default function handler(req, res) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.VITE_AZURE_OPENAI_API_KEY || '';
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.VITE_AZURE_OPENAI_ENDPOINT || '';

  res.status(200).json({
    status: apiKey && endpoint ? 'ok' : 'misconfigured',
    service: 'expense-calculator-api',
    azure_configured: Boolean(apiKey && endpoint)
  });
}
