import Link from 'next/link';

export default function VolunteerRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h1 className="text-2xl font-bold text-slate-800">Registration by Invitation Only</h1>
        <p className="text-slate-500">
          Volunteer accounts are created by HUManity administrators. Please contact your HUManity coordinator to receive your login credentials.
        </p>
        <Link href="/login" className="inline-block mt-4 text-[#3191c2] underline hover:text-[#2a7fa8]">
          Go to Login
        </Link>
      </div>
    </div>
  );
}
