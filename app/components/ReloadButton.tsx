"use client";

export default function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
    >
      Try Again
    </button>
  );
} 