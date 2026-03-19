import { redirect } from 'next/navigation';
import FeishuLayout from '@/components/navigation/feishu-sidebar';
import { auth } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fdashboard');
  }

  return <FeishuLayout>{children}</FeishuLayout>;
}
