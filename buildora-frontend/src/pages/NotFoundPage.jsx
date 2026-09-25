import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you’re looking for doesn’t exist."
      action={<Button to="/">Go home</Button>}
      className="min-h-screen"
    />
  );
}
