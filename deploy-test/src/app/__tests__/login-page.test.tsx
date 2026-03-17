import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import LoginPage from '../(auth)/login/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('LoginPage - Remember Email Feature', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as unknown as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as unknown as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    // Clear localStorage
    localStorage.clear();
  });

  describe('Remember Email Checkbox', () => {
    it('should render remember email checkbox', () => {
      render(<LoginPage />);
      
      const checkbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      render(<LoginPage />);
      
      const checkbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('should toggle checkbox when clicked', () => {
      render(<LoginPage />);
      
      const checkbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      
      fireEvent.click(checkbox);
      expect(checkbox).toHaveAttribute('data-state', 'checked');
      
      fireEvent.click(checkbox);
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    });
  });

  describe('Save Email to LocalStorage', () => {
    it('should save email to localStorage when remember is checked and login succeeds', async () => {
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const rememberCheckbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(rememberCheckbox);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBe('test@example.com');
      });
    });

    it('should NOT save email to localStorage when remember is NOT checked', async () => {
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      // Do not check remember checkbox
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBeNull();
      });
    });

    it('should remove email from localStorage when remember is unchecked on login', async () => {
      // Pre-populate localStorage
      localStorage.setItem('rememberedEmail', 'old@example.com');
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const rememberCheckbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      // Uncheck remember checkbox (it was auto-checked due to localStorage value)
      fireEvent.click(rememberCheckbox);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBeNull();
      });
    });
  });

  describe('Load Email from LocalStorage', () => {
    it('should auto-fill email from localStorage on page load', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      
      render(<LoginPage />);
      
      const emailInput = screen.getByDisplayValue('saved@example.com');
      expect(emailInput).toBeInTheDocument();
    });

    it('should check remember checkbox when email is loaded from localStorage', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      
      render(<LoginPage />);
      
      const checkbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });

    it('should leave email empty when no saved email in localStorage', () => {
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i) as HTMLInputElement;
      expect(emailInput.value).toBe('');
    });
  });

  describe('Clear Remembered Email', () => {
    it('should clear localStorage when user unchecks remember me', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      
      render(<LoginPage />);
      
      const checkbox = screen.getByRole('checkbox', { name: /记住邮箱/i });
      
      // Uncheck the checkbox
      fireEvent.click(checkbox);
      
      expect(localStorage.getItem('rememberedEmail')).toBeNull();
    });
  });

  describe('Redirect after Login', () => {
    it('should redirect to /dashboard after successful login', async () => {
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should NOT redirect to /workspaces after login', async () => {
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalledWith('/workspaces');
      });
    });

    it('should use callbackUrl from search params if provided', async () => {
      (useSearchParams as unknown as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue('/custom-page'),
      });
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
      
      render(<LoginPage />);
      
      const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-page');
      });
    });
  });
});
