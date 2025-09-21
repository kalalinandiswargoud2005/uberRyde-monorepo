import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // This logic should be in a component that wraps the protected content,
  // not directly in the root layout if you have unprotected pages like /login.
  // For now, we assume all pages except /login are protected.
  // If the user is not logged in, and the current path is not /login, redirect.
  // We need to read the path from the request headers via Next's headers() API.
  const reqHeaders = await headers();
  const pathname = reqHeaders.get('next-url') || '';

  if (!session && !pathname.startsWith('/login')) {
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}