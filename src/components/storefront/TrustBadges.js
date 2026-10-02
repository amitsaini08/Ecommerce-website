import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi';
import Section from '@/components/ui/Section';

const badges = [
  { icon: FiTruck, title: 'Free Shipping', desc: 'On orders over 100' },
  { icon: FiShield, title: 'Secure Payments', desc: '100% secure checkout' },
  { icon: FiRefreshCw, title: 'Easy Returns', desc: '30-day return policy' },
  { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help' },
];

export default function TrustBadges() {
  return (
    <Section padding="sm" className="border-y border-warm-100">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
        {badges.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warm-50">
              <Icon className="h-5 w-5 text-warm-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-warm-900">{title}</h3>
              <p className="text-xs text-warm-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}