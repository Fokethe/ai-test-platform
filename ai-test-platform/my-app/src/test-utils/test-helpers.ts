/**
 * 测试辅助函数 - 减少测试重复代码
 */
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { signIn } from 'next-auth/react';

/**
 * 用户凭证类型
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * 默认测试用户
 */
export const defaultUser: UserCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

/**
 * 填充登录表单
 */
export function fillLoginForm(credentials: UserCredentials = defaultUser): void {
  const emailInput = screen.getByPlaceholderText(/your@email\.com/i);
  const passwordInput = screen.getByPlaceholderText(/••••••••/i);

  fireEvent.change(emailInput, { target: { value: credentials.email } });
  fireEvent.change(passwordInput, { target: { value: credentials.password } });
}

/**
 * 获取登录表单元素（使用 findBy 等待元素出现）
 */
export async function getLoginFormElements() {
  return {
    emailInput: await screen.findByPlaceholderText(/your@email\.com/i),
    passwordInput: await screen.findByPlaceholderText(/••••••••/i),
    rememberCheckbox: await screen.findByRole('checkbox', { name: /记住邮箱/i }),
    submitButton: await screen.findByRole('button', { name: /登录/i }),
  };
}

/**
 * 等待加载状态消失
 */
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
}

/**
 * 等待错误消息出现
 */
export async function waitForErrorMessage(messagePattern: RegExp) {
  return await screen.findByText(messagePattern, { exact: false });
}

/**
 * 提交登录表单（使用用户事件更真实的交互）
 */
export async function submitLoginForm(
  credentials: UserCredentials = defaultUser,
  options: { remember?: boolean } = {}
): Promise<void> {
  const { emailInput, passwordInput, rememberCheckbox, submitButton } = await getLoginFormElements();

  // 使用 user-event 更真实的交互（推荐）
  // 这里使用 fireEvent 作为兼容性方案
  fireEvent.change(emailInput, { target: { value: credentials.email } });
  fireEvent.change(passwordInput, { target: { value: credentials.password } });

  if (options.remember) {
    fireEvent.click(rememberCheckbox);
  }

  fireEvent.click(submitButton);

  // 等待表单提交完成
  await waitFor(() => {
    expect(signIn).toHaveBeenCalled();
  }, { timeout: 3000 });
}

/**
 * 等待重定向完成
 */
export async function waitForRedirect(routerPush: jest.Mock) {
  await waitFor(() => {
    expect(routerPush).toHaveBeenCalled();
  }, { timeout: 3000 });
}

/**
 * 模拟登录成功
 */
export function mockSignInSuccess(): void {
  (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });
}

/**
 * 模拟登录失败
 */
export function mockSignInError(error: string = 'Invalid credentials'): void {
  (signIn as jest.Mock).mockResolvedValue({ ok: false, error });
}
