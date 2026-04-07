import Link from "next/link";

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h1>
        <p className="mt-3 text-gray-500">
          Your account is being provisioned. You&apos;ll receive a welcome email shortly with your
          Account No and next steps.
        </p>
        <p className="mt-2 text-gray-500">
          Sign in with the Google account you used to subscribe.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign in now
        </Link>
      </div>
    </div>
  );
}
