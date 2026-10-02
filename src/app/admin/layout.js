'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Star,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { selectUser, clearUser } from '@/lib/store/authSlice';
import { cn } from '@/lib/cn';
import Logo from '@/components/common/Logo';
import Container from '@/components/common/Container';
import Avatar from '@/components/ui/Avatar';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Banners', href: '/admin/banners', icon: ImageIcon },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const isActivePath = (pathname, href) =>
  href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function AdminLayout({ children }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // non-admin ko storefront par bhejo
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  // page badalte hi mobile sidebar band
  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    dispatch(clearUser());
    router.push('/');
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-dvh items-center justify-center bg-warm-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-warm-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-warm-50 text-warm-900 antialiased">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-50 flex-col bg-warm-900 text-white transition-transform duration-300',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
        <div className="flex shrink-0 items-center justify-between border-b border-warm-800 px-4 py-4">
          <div className="flex items-center gap-2">
            <Logo tone="dark" href="/admin" />
            <Badge className="bg-brand-500/20 uppercase text-[9px] tracking-wide text-brand-300">Admin</Badge>
          </div>
          <IconButton
            label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 text-warm-400 hover:bg-warm-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
            >
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-warm-800 p-3">
          <NavItem href="/" icon={Store}>
            View storefront
          </NavItem>
          <NavItem icon={LogOut} danger onClick={handleLogout}>
            Sign out
          </NavItem>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content: desktop par yahi scroll hota hai */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-warm-200 bg-white/90 backdrop-blur-md">
          <Container className="flex h-14 items-center justify-between">
            <IconButton
              label="Open menu"
              onClick={() => setSidebarOpen(true)}
              className="-ml-2 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </IconButton>

            <p className="hidden text-sm font-medium text-warm-500 lg:block">Admin management portal</p>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold leading-tight text-warm-900">{user.name}</p>
                <p className="text-[14px] text-warm-500">{user.email}</p>
              </div>
              <Avatar user={user} size="sm" />
            </div>
          </Container>
        </header>

        <main className="flex-1 py-6">
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
}


function NavItem({ href, icon: Icon, active, danger, onClick, children }) {
  const classes = cn(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
    active
      ? 'bg-brand-600 text-white shadow-sm'
      : danger
        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
        : 'text-warm-300 hover:bg-warm-800 hover:text-white'
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-left">{children}</span>
      {active && <ChevronRight className="h-4 w-4 text-white/70" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}