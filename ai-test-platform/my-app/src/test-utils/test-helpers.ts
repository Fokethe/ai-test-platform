import { fireEvent, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';

export interface UserCredentials {
  email: string;
  password: string;
}

export const defaultUser: UserCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

export function getLoginFormElements() {
  const emailInput = document.querySelector<HTMLInputElement>('#email');
  const passwordInput = document.querySelector<HTMLInputElement>('#password');
  const rememberCheckbox = document.querySelector<HTMLElement>('#remember');
  const submitButton = document.querySelector<HTMLButtonElement>('button[type="submit"]');

  if (!emailInput || !passwordInput || !rememberCheckbox || !submitButton) {
    throw new Error('Login form elements not found');
  }

  return { emailInput, passwordInput, rememberCheckbox, submitButton };
}

export function fillLoginForm(credentials: UserCredentials = defaultUser): void {
  const { emailInput, passwordInput } = getLoginFormElements();
  fireEvent.change(emailInput, { target: { value: credentials.email } });
  fireEvent.change(passwordInput, { target: { value: credentials.password } });
}

export async function submitLoginForm(
  credentials: UserCredentials = defaultUser,
  options: { remember?: boolean } = {}
): Promise<void> {
  const { emailInput, passwordInput, rememberCheckbox, submitButton } = getLoginFormElements();

  fireEvent.change(emailInput, { target: { value: credentials.email } });
  fireEvent.change(passwordInput, { target: { value: credentials.password } });

  if (options.remember) {
    fireEvent.click(rememberCheckbox);
  }

  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(signIn).toHaveBeenCalled();
  }, { timeout: 3000 });
}

export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
  });
}

export async function waitForRedirect(routerPush: jest.Mock) {
  await waitFor(() => {
    expect(routerPush).toHaveBeenCalled();
  }, { timeout: 3000 });
}

export function mockSignInSuccess(): void {
  (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
}

export function mockSignInError(error: string = 'Invalid credentials'): void {
  (signIn as jest.Mock).mockResolvedValue({ ok: false, error });
}
