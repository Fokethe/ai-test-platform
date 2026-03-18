// Mock for next-auth/react
export const signIn = jest.fn();
export const signOut = jest.fn();
export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
}));
export const getSession = jest.fn();
export const getCsrfToken = jest.fn();
export const getProviders = jest.fn();
