import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-beige-50 px-4 text-center">
      <span className="font-serif text-8xl font-bold text-beige-300">404</span>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-beige-700">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-beige-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
        <Link href="/services" className="btn-outline">
          View Services
        </Link>
      </div>
    </div>
  );
}
