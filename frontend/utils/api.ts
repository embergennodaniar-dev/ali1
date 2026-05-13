const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface ChatSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  preview: string;
  language: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: number;
  ingredients: string;
  is_group_only: boolean;
  is_game: boolean;
  is_available: boolean;
  min_group_size: number;
}

export const api = {
  // Chat
  createSession: async (language: string): Promise<{ session_id: string; greeting: string }> => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`);
    if (!res.ok) throw new Error('Failed to get sessions');
    return res.json();
  },

  getSession: async (sessionId: string): Promise<{ session: ChatSession; messages: ChatMessage[] }> => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to get session');
    return res.json();
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  sendMessage: async (
    sessionId: string,
    content: string
  ): Promise<{ user_message: ChatMessage; ai_message: ChatMessage }> => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  // Menu
  getMenu: async (): Promise<MenuItem[]> => {
    const res = await fetch(`${BASE_URL}/api/menu`);
    if (!res.ok) throw new Error('Failed to get menu');
    return res.json();
  },

  createMenuItem: async (data: Partial<MenuItem>, token: string): Promise<MenuItem> => {
    const res = await fetch(`${BASE_URL}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  updateMenuItem: async (id: string, data: Partial<MenuItem>, token: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update item');
  },

  deleteMenuItem: async (id: string, token: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/api/menu/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  // Admin
  adminLogin: async (username: string, password: string): Promise<{ token: string }> => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  // Orders
  createOrder: async (data: {
    session_id?: string;
    summary: string;
    total: number;
    language: string;
  }): Promise<{ order_id: string; payment_url: string; total: number; status: string }> => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return res.json();
  },
};
