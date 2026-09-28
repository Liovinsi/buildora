import { Link } from 'react-router';

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-100 py-8 text-sm text-neutral-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:gap-4 sm:px-6">
        <span>© {new Date().getFullYear()} Buildora</span>
        <span aria-hidden="true" className="hidden text-neutral-300 sm:inline">·</span>
        <Link to="/privacy-policy" className="hover:text-neutral-900">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
