import FeishuLayout from '@/components/navigation/feishu-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <FeishuLayout>{children}</FeishuLayout>;
}
