import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import './globals.css';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If there is no active session, redirect to the login page
  if (!session) {
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}