'use client';

import { signout } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{email}</span>
      <form action={signout}>
        <Button variant="outline" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
