'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { FiSearch, FiHeart, FiShoppingCart, FiMenu, FiX } from 'react-icons/fi';
import { selectCartItemCount } from '@/lib/store/cartSlice';
import { selectWishlistItemCount } from '@/lib/store/wishlistSlice';
import { NAV_LINKS } from '@/lib/constants/nav';
import { cn } from '@/lib/cn';
import Container from '@/components/ui/Container';
import IconButton from '@/components/ui/IconButton';
import NavLink from '@/components/ui/NavLink';
import CategoriesMenu from './CategoriesMenu';
import AccountMenu from './AccountMenu';
import SearchOverlay from './SearchOverlay';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const cartCount = useSelector(selectCartItemCount);
  const wishlistCount = useSelector(selectWishlistItemCount);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-warm-100 bg-white/95 backdrop-blur-md transition-shadow duration-300',
          scrolled && 'shadow-sm'
        )}
      >
        <Container>
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-warm-900">
              Nova<span className="text-brand-500">Hub</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) =>
                link.dropdown ? (
                  <CategoriesMenu key={link.label} />
                ) : (
                  <NavLink key={link.label} href={link.href}>
                    {link.label}
                  </NavLink>
                )
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <IconButton label="Search" onClick={() => setSearchOpen(true)}>
                <FiSearch className="h-5 w-5" />
              </IconButton>

              <IconButton
                href="/wishlist"
                label="Wishlist"
                count={wishlistCount}
                badgeTone="rose"
                className="hidden sm:inline-flex"
              >
                <FiHeart className="h-5 w-5" />
              </IconButton>

              <AccountMenu />

              <IconButton href="/cart" label="Cart" count={cartCount}>
                <FiShoppingCart className="h-5 w-5" />
              </IconButton>

              <IconButton
                label="Menu"
                onClick={() => setMobileOpen((o) => !o)}
                className="lg:hidden"
              >
                {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
              </IconButton>
            </div>
          </div>
        </Container>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-warm-100 bg-white lg:hidden">
            <Container>
              <nav className="flex flex-col gap-0.5 py-2">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.label}
                    href={link.href}
                    variant="mobile"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <NavLink
                  href="/wishlist"
                  variant="mobile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between sm:hidden"
                >
                  <span>Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {wishlistCount}
                    </span>
                  )}
                </NavLink>
              </nav>
            </Container>
          </div>
        )}
      </header>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}