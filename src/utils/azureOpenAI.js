// Azure OpenAI Configuration
const AZURE_CONFIG = {
  apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || '',
  endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '',
  deployment: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'GPT-5.4',
  apiVersion: '2024-02-15-preview'
};

export const callAzureOpenAI = async (messages, context) => {
  try {
    if (!AZURE_CONFIG.apiKey || !AZURE_CONFIG.endpoint) {
      throw new Error('Missing Azure OpenAI environment variables');
    }

    // Use the correct Azure OpenAI endpoint format
    const endpoint = AZURE_CONFIG.endpoint.replace(/\/$/, ''); // Remove trailing slash
    const url = `${endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

    console.log('🔄 Calling Azure OpenAI:', { url: url.split('?')[0], deployment: AZURE_CONFIG.deployment });

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
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Azure OpenAI API error:', response.status, errorText);
      throw new Error(`Azure API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      console.error('❌ No response content from Azure:', data);
      throw new Error('No response content from Azure OpenAI');
    }
    
    console.log('✅ Azure OpenAI response received');
    return responseContent;
  } catch (error) {
    console.error('❌ Error calling Azure OpenAI:', error);
    
    // More user-friendly error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error - check your internet connection or CORS settings');
    } else if (error.message.includes('401')) {
      throw new Error('Authentication failed - check your Azure OpenAI API key');
    } else if (error.message.includes('404')) {
      throw new Error('Deployment not found - check your deployment name and endpoint');
    }
    
    throw error;
  }
};

export default AZURE_CONFIG;
