import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';

import Breadcrumbs from '@/components/common/Breadcrumbs';
import Section from '@/components/common/Section';

export const metadata = {
  title: 'About Us — NovaHub',
  description:
    'Learn more about NovaHub, our mission, and our curated catalog of modern products.',
};

const VALUES = [
  {
    icon: Sparkles,
    title: 'Curated Quality',
    description:
      'Every product in our storefront is carefully selected to meet our standards for quality, authenticity, and value.',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description:
      'We work with trusted logistics partners to make sure your orders reach you quickly and safely.',
  },
  {
    icon: ShieldCheck,
    title: 'Customer First',
    description:
      'From secure checkout to hassle-free returns, we put your experience and security first.',
  },
];

export default function AboutPage() {
  return (
    <Section background="warm" padding="none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumbs */}
        <div className="py-4">
          <Breadcrumbs items={[{ label: 'About Us' }]} />
        </div>

        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Our Story
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-warm-950 leading-tight">
            Curating Quality for
            <span className="text-brand-600"> Modern Lifestyles</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-warm-600 leading-7 max-w-2xl mx-auto">
            NovaHub was founded with a clear goal: to make discovering and
            purchasing high-quality, authentic products effortless, reliable,
            and enjoyable.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 pb-12 sm:pb-16">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group bg-white  rounded-xl  border border-warm-200 p-5 sm:p-6 text-center transition-all duration-20 hover:-translate-y-1 hover:border-brand-200 hover:shadow-sm "
            >
              <div className=" w-11 h-11 mx-auto  rounded-lg  bg-brand-50 border border-brand-100  flex items-center justify-center  text-brand-600  mb-4  transition-transform duration-200 group-hover:scale-105">
                <Icon className="w-5 h-5" />
              </div>

              <h3 className="text-sm sm:text-base font-bold text-warm-900 mb-2">
                {title}
              </h3>

              <p className="text-xs sm:text-sm text-warm-500 leading-6">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="pb-12 sm:pb-16">
          <div className=" relative overflow-hidden bg-warm-900    rounded-2xl px-6 py-10 sm:px-10 sm:py-12 text-center " >
            {/* Decorative background */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brand-600/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-brand-500/10 blur-2xl" />

            <div className="relative">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Ready to explore our collection?
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-warm-300 max-w-lg mx-auto leading-6">
                Browse our latest arrivals and discover products carefully
                selected for your everyday lifestyle.
              </p>

              <Link
                href="/products"
                className=" inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-brand-600 text-white  text-xs sm:text-sm  font-semibold  rounded-lg  shadow-sm  hover:bg-brand-700  transition-all duration-200 hover:-translate-y-0.5" >
                Explore Catalog
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </Section>
  );
}