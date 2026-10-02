import { cn } from '@/lib/cn';
import Container from './Container';

const backgrounds = {
  white: 'bg-white',
  warm: 'bg-warm-50',
  dark: 'bg-warm-900 text-white',
};

const paddings = {
  sm: 'py-4 sm:py-6',
  md: 'py-8 sm:py-12',
  lg: 'py-12 sm:py-16',
};

export default function Section({
  background = 'white',
  padding = 'md',
  className,
  children,
  ...props
}) {
  return (
    <section className={cn(backgrounds[background], paddings[padding], className)} {...props}>
      <Container>{children}</Container>
    </section>
  );
}