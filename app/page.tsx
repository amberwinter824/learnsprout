"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sprout, Menu, X } from 'lucide-react'

export default function Home() {
  const { currentUser, loading } = useAuth()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (!loading) {
      if (currentUser) {
        router.push('/dashboard')
      } else {
        setCheckingAuth(false)
      }
    }
  }, [currentUser, loading, router])

  if (loading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center">
            <Sprout className="h-8 w-8 md:h-10 md:w-10 text-emerald-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 ml-2 md:ml-3">
              Learn Sprout
            </h1>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:block">
            <Link 
              href="/login"
              className="px-4 py-2 text-emerald-600 font-medium mr-4 hover:bg-emerald-100 rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/signup"
              className="px-4 py-2 bg-emerald-500 text-white rounded-md font-medium hover:bg-emerald-600 transition-colors"
            >
              Sign Up
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-emerald-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? 
              <X className="h-6 w-6" /> : 
              <Menu className="h-6 w-6" />
            }
          </button>
        </header>
        
        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-white p-4">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <Sprout className="h-8 w-8 text-emerald-500" />
                <h1 className="text-2xl font-bold text-gray-900 ml-2">
                  Learn Sprout
                </h1>
              </div>
              <button 
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col space-y-4">
              <Link 
                href="/login"
                className="w-full py-3 text-center text-emerald-600 font-medium border border-emerald-500 rounded-md hover:bg-emerald-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                href="/signup"
                className="w-full py-3 text-center bg-emerald-500 text-white rounded-md font-medium hover:bg-emerald-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        <main className="mt-12 md:mt-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              Personalized Play-Based Learning at Home
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8">
              Create custom activity plans, track your child's progress, and get personalized recommendations based on their interests and development.
            </p>
            <Link
              href="/signup"
              className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-md font-medium hover:bg-emerald-600 transition-colors text-lg"
            >
              Get Started Free
            </Link>
          </div>

          <div className="grid gap-6 md:gap-8 md:grid-cols-3 mt-16 md:mt-24">
            <div className="bg-white rounded-lg shadow-sm p-5 md:p-6">
              <h3 className="text-xl font-semibold mb-3">Child Profiles</h3>
              <p className="text-gray-600">Create profiles for your children to track their unique development journey and interests.</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-5 md:p-6">
              <h3 className="text-xl font-semibold mb-3">Weekly Activities</h3>
              <p className="text-gray-600">Get age-appropriate activities tailored to your child's developmental needs.</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-5 md:p-6">
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p className="text-gray-600">Document observations and milestones to celebrate your child's growth and learning.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}