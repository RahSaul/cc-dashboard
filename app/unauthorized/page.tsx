export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Access denied
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your account is not on the access list.
        </p>
      </div>
    </div>
  )
}
