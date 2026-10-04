import { Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../store/auth';

export default function NoAccess() {
  const { role } = useAuth();
  return (
    <div className="py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream"><Lock size={22} /></span>
      <h1 className="mt-5 text-2xl">You do not have access to this <span className="serif-accent text-ink-3">page</span></h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-3">Your role{role ? ` (${role.name})` : ''} does not include this permission. Ask an owner to update your role in Team & roles.</p>
      <Button to="/" className="mt-6" size="sm">Back to dashboard</Button>
    </div>
  );
}
