export default function NoProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-700 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative text-center max-w-sm">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl mb-6">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">No Projects Assigned</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Your account is active, but you haven&apos;t been assigned to any projects yet.
          Please contact your administrator to get access.
        </p>

        <div className="mt-8 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs">
          Once assigned, refresh this page or sign out and back in.
        </div>

        <form action="/auth/signout" method="post" className="mt-6">
          <a
            href="/login"
            className="inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4"
          >
            Sign out
          </a>
        </form>
      </div>
    </div>
  );
}
