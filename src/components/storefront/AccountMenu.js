'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { User, LogOut, Package, Settings } from 'lucide-react';
import { selectUser, clearUser } from '@/lib/store/authSlice';
import Dropdown from '@/components/ui/Dropdown';
import MenuItem from '@/components/ui/MenuItem';
import Avatar from '@/components/ui/Avatar';
import { removePushSubscription } from '@/hooks/usePushNotifications';

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();

  const close = () => setOpen(false);

  const handleLogout = async () => {
    await removePushSubscription();
    await fetch('/api/auth/logout', { method: 'POST' });
    dispatch(clearUser());
    close();
    router.push('/');
  };

  return (
    <Dropdown
      open={open}
      onClose={close}
      align="right"
      className="w-60"
      trigger={
        <button
          type="button"
          aria-label="Account"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-warm-600 transition-colors hover:bg-warm-50 hover:text-warm-900"
        >
          {user ? <Avatar user={user} size="sm" /> : <User className="h-5 w-5" />}
        </button>
      }
    >
      {user ? (
        <>
          <div className="mb-1 flex items-center gap-2.5 border-b border-warm-100 px-2.5 pb-2.5 pt-1.5">
            <Avatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-warm-900">{user.name}</p>
              <p className="truncate text-xs text-warm-500">{user.email}</p>
            </div>
          </div>

          {user.role === 'admin' && (
            <MenuItem href="/admin" icon={Settings} onClick={close}>
              Admin Dashboard
            </MenuItem>
          )}
          <MenuItem href="/profile" icon={User} onClick={close}>
            My Profile
          </MenuItem>
          <MenuItem href="/orders" icon={Package} onClick={close}>
            My Orders
          </MenuItem>

          <div className="mt-1 border-t border-warm-100 pt-1">
            <MenuItem icon={LogOut} danger onClick={handleLogout}>
              Sign Out
            </MenuItem>
          </div>
        </>
      ) : (
        <>
          <MenuItem href="/login" onClick={close}>
            Sign In
          </MenuItem>
          <MenuItem href="/signup" onClick={close}>
            Create Account
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}