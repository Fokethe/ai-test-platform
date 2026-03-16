// Mock for @/lib/auth
export const authOptions = {};

export const auth = jest.fn(() => 
  Promise.resolve({ user: { email: 'test@example.com', id: 'test-user' } })
);
