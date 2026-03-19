import React from 'react';
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import DashboardLayout from '../layout';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

jest.mock('@/components/navigation/feishu-sidebar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="feishu-layout">{children}</div>
  ),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login with callbackUrl when session is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    await expect(
      DashboardLayout({
        children: <div>Protected content</div>,
      })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login?callbackUrl=%2Fdashboard');
  });

  it('renders protected layout when session exists', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'tester@example.com' },
    });

    const ui = await DashboardLayout({
      children: <div>Protected content</div>,
    });

    render(ui);
    expect(screen.getByTestId('feishu-layout')).toBeInTheDocument();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
