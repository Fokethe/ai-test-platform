import { redirect } from 'next/navigation';

export default function AiKeysRedirectPage() {
  redirect('/settings/ai?tab=ops');
}
