import Link from 'next/link'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Welcome to Montessori Home
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link 
          href="/children"
          className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Child Profiles</h2>
          <p className="text-gray-600">Manage your children's profiles and track their progress</p>
        </Link>
        <Link 
          href="/activities"
          className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Weekly Activities</h2>
          <p className="text-gray-600">View and manage personalized activities</p>
        </Link>
        <Link 
          href="/progress"
          className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Progress Tracking</h2>
          <p className="text-gray-600">Log observations and track milestones</p>
        </Link>
      </div>
    </main>
  )
}