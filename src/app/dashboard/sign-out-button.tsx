'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
          router.refresh();
        },
      },
    });
  };

  return (
    <Button
      variant="ghost"
      disabled={loading}
      onClick={handleSignOut}
      className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors gap-2 border border-white/5 hover:border-red-500/20 px-4 py-2 rounded-xl"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Se déconnecter
    </Button>
  );
}
