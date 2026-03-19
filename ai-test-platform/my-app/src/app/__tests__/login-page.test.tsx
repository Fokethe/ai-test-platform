import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import LoginPage from '../(auth)/login/page';
import {
  getLoginFormElements,
  submitLoginForm,
  mockSignInSuccess,
  defaultUser,
} from '@/test-utils/test-helpers';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

jest.mock('@/components/system-language-provider', () => ({
  useSystemLanguage: () => ({
    language: 'zh-CN',
    setLanguage: jest.fn(),
    toggleLanguage: jest.fn(),
    t: (zh: string) => zh,
  }),
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
    // @ts-ignore - mocked function
    useRouter.mockReturnValue(mockRouter);
    // @ts-ignore - mocked function
    useSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
    localStorage.clear();
  });

  describe('Remember Email Checkbox @p0', () => {
    it('should render remember email checkbox', () => {
      render(<LoginPage />);
      const { rememberCheckbox } = getLoginFormElements();
      expect(rememberCheckbox).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      render(<LoginPage />);
      const { rememberCheckbox } = getLoginFormElements();
      expect(rememberCheckbox).toHaveAttribute('data-state', 'unchecked');
    });

    it('should toggle checkbox when clicked', () => {
      render(<LoginPage />);
      const { rememberCheckbox } = getLoginFormElements();

      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox).toHaveAttribute('data-state', 'checked');

      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox).toHaveAttribute('data-state', 'unchecked');
    });
  });

  describe('Save Email to LocalStorage @p0 @smoke', () => {
    it('should save email to localStorage when remember is checked and login succeeds', async () => {
      mockSignInSuccess();
      render(<LoginPage />);

      await submitLoginForm(defaultUser, { remember: true });

      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBe(defaultUser.email);
      });
    });

    it('should NOT save email to localStorage when remember is NOT checked', async () => {
      mockSignInSuccess();
      render(<LoginPage />);

      await submitLoginForm(defaultUser, { remember: false });

      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBeNull();
      });
    });

    it('should remove email from localStorage when remember is unchecked on login', async () => {
      localStorage.setItem('rememberedEmail', 'old@example.com');
      mockSignInSuccess();
      render(<LoginPage />);

      const { rememberCheckbox } = getLoginFormElements();
      fireEvent.click(rememberCheckbox); // Uncheck
      await submitLoginForm();

      await waitFor(() => {
        expect(localStorage.getItem('rememberedEmail')).toBeNull();
      });
    });
  });

  describe('Load Email from LocalStorage', () => {
    it('should auto-fill email from localStorage on page load', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      render(<LoginPage />);

      expect(screen.getByDisplayValue('saved@example.com')).toBeInTheDocument();
    });

    it('should check remember checkbox when email is loaded from localStorage', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      render(<LoginPage />);

      const { rememberCheckbox } = getLoginFormElements();
      expect(rememberCheckbox).toHaveAttribute('data-state', 'checked');
    });

    it('should leave email empty when no saved email in localStorage', () => {
      render(<LoginPage />);

      const { emailInput } = getLoginFormElements();
      expect((emailInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Clear Remembered Email', () => {
    it('should clear localStorage when user unchecks remember me', () => {
      localStorage.setItem('rememberedEmail', 'saved@example.com');
      render(<LoginPage />);

      const { rememberCheckbox } = getLoginFormElements();
      fireEvent.click(rememberCheckbox);

      expect(localStorage.getItem('rememberedEmail')).toBeNull();
    });
  });

  describe('Redirect after Login @p0 @smoke', () => {
    it('should redirect to /dashboard after successful login', async () => {
      mockSignInSuccess();
      render(<LoginPage />);

      await submitLoginForm();

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect to callbackUrl from search params when provided', async () => {
      const mockUseSearchParams = useSearchParams as jest.Mock;
      mockUseSearchParams.mockReturnValue({
        get: jest.fn().mockReturnValue('/custom-page'),
      });
      mockSignInSuccess();
      render(<LoginPage />);

      await submitLoginForm();

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-page');
      });
    });
  });
});
