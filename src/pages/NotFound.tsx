import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl">That page is not <span className="serif-accent text-ink-3">here</span></h1>
      <p className="mt-2 text-sm text-ink-3">Check the link, or head back to the dashboard.</p>
      <Button to="/" className="mt-6" size="sm">Go to dashboard</Button>
    </div>
  );
}
