'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuthAction = async (action) => {
  setLoading(true);
  // The action is now a function that already has the email and password
  const { data, error } = await action();

  if (error) {
    alert('Error: ' + error.message);
  } else {
    // Check if the data contains a user object to determine if it was a sign-in
    if (data.user) {
        alert('Sign-in successful!');
        router.push('/');
    } else {
        alert('Sign-up successful! Please check your email to confirm your account if required, then sign in.');
    }
  }
  setLoading(false);
};

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-center text-white">uberRyde</h1>
          <p className="text-center text-gray-400">Welcome Back</p>
        </div>

        <form className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white/10 text-white rounded-lg border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/10 text-white rounded-lg border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
               onClick={(e) => { e.preventDefault(); handleAuthAction(() => supabase.auth.signInWithPassword({ email, password })); }}
              disabled={loading}
              className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-transform transform hover:scale-105"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            <button
               onClick={(e) => { e.preventDefault(); handleAuthAction(() => supabase.auth.signUp({ email, password })); }}
              disabled={loading}
              className="w-full bg-white/10 text-white font-bold p-3 rounded-lg hover:bg-white/20 disabled:opacity-50 transition"
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}