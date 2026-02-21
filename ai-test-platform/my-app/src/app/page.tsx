import { redirect } from 'next/navigation';

export default function HomePage() {
  // 重定向到工作空间页面
  redirect('/workspaces');
}
