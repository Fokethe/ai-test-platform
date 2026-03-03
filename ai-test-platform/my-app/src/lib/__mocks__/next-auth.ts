// Mock for next-auth
export const getServerSession = jest.fn(() => 
  Promise.resolve({ user: { email: 'test@example.com', id: 'test-user' } })
);

export default jest.fn();
