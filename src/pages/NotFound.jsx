import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotFound({ homePageName = "Home" }) {
  const homeUrl = createPageUrl(homePageName);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">404</p>
        <h1 className="text-4xl font-bold text-white">Page not found</h1>
        <p className="max-w-md text-lg text-white/80">
          The page you are looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Link
        to={homeUrl}
        className="inline-flex items-center rounded-xl bg-white/90 px-6 py-3 font-semibold text-purple-600 shadow-lg transition hover:bg-white"
      >
        Go back home
      </Link>
    </div>
  );
}
