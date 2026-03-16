import { redirect } from 'next/navigation';
import HomePage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('HomePage - Redirect to Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to /login', () => {
    HomePage();
    
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('should NOT redirect to /workspaces', () => {
    HomePage();
    
    expect(redirect).not.toHaveBeenCalledWith('/workspaces');
  });

  it('should redirect only once', () => {
    HomePage();
    
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
