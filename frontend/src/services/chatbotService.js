import { apiRequest } from '../api/apiClient';

export const chatbotService = {
  /**
   * Send user prompt to RAG Chatbot service with JWT Authorization header
   * @param {string} message - User query (e.g., "Show me spicy biryani")
   * @returns {Promise<Object>} - { success: true, message: "...", results: [...] }
   */
  async sendMessage(message) {
    try {
      return await apiRequest('/rag/api/rag/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
    } catch (err) {
      console.warn('[chatbotService] Gateway proxy fallback to direct service:', err.message);
      const token = localStorage.getItem('foogo_token');
      const response = await fetch('http://localhost:3020/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message })
      });
      if (!response.ok) {
        throw new Error(err.message || 'Failed to get response from AI Food Assistant');
      }
      return await response.json();
    }
  }
};
