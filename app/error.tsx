"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <button
          onClick={() => reset()}
          className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
} 