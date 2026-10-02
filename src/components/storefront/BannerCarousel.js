'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import Section from '@/components/common/Section';
import Button from '@/components/ui/Button';

import { bannersApi } from '@/lib/apiClient/banners';

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchActiveBanners() {
      try {
        const data = await bannersApi.getAll();
        setBanners(data?.banners || []);
      } catch {
        setBanners([]);
      }
    }
    fetchActiveBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  if (!banners.length) return null;

  const banner = banners[currentIndex];
  const prev = () => setCurrentIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setCurrentIndex((i) => (i + 1) % banners.length);

  return (
    <Section padding="sm">
      <div
        className="relative flex min-h-[180px] items-center overflow-hidden rounded-xl shadow-sm transition-colors duration-500 sm:min-h-[240px] lg:min-h-[280px]"
        style={{ backgroundColor: banner.bgColor || '#18181b' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}>
        {banner.imageUrl && (
          <div className="absolute inset-0 z-0">
            <Image src={banner.imageUrl} alt={banner.title} fill className="object-cover opacity-35" sizes="1280px" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>
        )}

        <div className="relative z-10 max-w-xl space-y-2 p-6 text-white sm:p-10">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="line-clamp-2 text-sm leading-relaxed text-warm-200">{banner.subtitle}</p>
          )}
          {banner.linkUrl && (
            <div className="pt-2">
              <Button href={banner.linkUrl} variant="light">
                <span>Shop Now</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {banners.length > 1 && (
          <>
            {[
              { onClick: prev, label: 'Previous slide', side: 'left-3', Icon: ChevronLeft },
              { onClick: next, label: 'Next slide', side: 'right-3', Icon: ChevronRight },
            ].map(({ onClick, label, side, Icon }) => (
              <button  key={label} type="button"  onClick={onClick} aria-label={label}
                className={cn('absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full',
                  'bg-black/40 text-white backdrop-blur-xs transition-colors hover:bg-black/60',
                  side
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i} type="button" onClick={() => setCurrentIndex(i)}  aria-label={`Go to slide ${i + 1}`}
                  className={cn(  'h-2 rounded-full transition-all', currentIndex === i ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80' )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}