import { Link, useRouter, useNavigate } from '@tanstack/react-router'

import { useState } from 'react'
import { Home, Menu, X } from 'lucide-react'
import { useAuth } from '@/auth'
import IconExit from '../icons/arrow-right-start-on-rectangle.svg?react'


export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const auth = useAuth()
  const router = useRouter()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.logout().then(() => {
        router.invalidate().finally(() => {
          navigate({ to: '/' })
        })
      })
    }
  }

  return (
    <>
      <header className="p-4 flex items-center bg-white-800 text-white shadow-lg">
        {auth.isAuthenticated &&
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 bg-black hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>}
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/">
            <img
              src="./logo.png"
              alt="klimkalender logo"
              className="h-10"
            />
          </Link>
        </h1>
        <div className="ml-4 text-2xl font-bold text-black">
          CMS
        </div>
        <div className="ml-auto text-black align-right flex items-center gap-1">
          {auth.isAuthenticated ? (
            <><span className="text-sm">
              <strong>{auth.user?.user?.email}</strong>
            </span>
              <button
                type="button"
                className="hover:underline"
                onClick={handleLogout}
              >
                <IconExit />
              </button>
            </>
          ) : (
            <span className="text-sm">Not logged in</span>
          )}
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-black text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>
          <Link
            to="/invoices"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Invoices</span>
          </Link>

          {/* Demo Links Start */}

          {/* Demo Links End */}
        </nav>
      </aside>
    </>
  )
}
