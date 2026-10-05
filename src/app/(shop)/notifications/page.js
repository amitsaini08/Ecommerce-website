'use client';

import { useSelector } from 'react-redux';
import { Bell } from 'lucide-react';
import { selectUser } from '@/lib/store/authSlice';
import Section from '@/components/common/Section';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import EmptyState from '@/components/common/EmptyState';
import NotificationsView from '@/components/common/NotificationView';
import Button from '@/components/ui/Button';

export default function NotificationsPage() {
  const user = useSelector(selectUser);

  return (
    <Section>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Notifications' }]} />
        {user ? (
          <NotificationsView forRole="customer" />
        ) : (
          <EmptyState
            icon={Bell}
            title="Sign in to see notifications"
            description="Order updates and alerts will show up here."
            action={<Button href="/login" variant="dark">Sign in</Button>}
          />
        )}
      </div>
    </Section>
  );
}