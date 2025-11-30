import { createFileRoute } from '@tanstack/react-router'
import { Link, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="p-2 h-full">
      {/* <ul className="py-2 flex gap-2">
        <li>
          <Link
            to="/events"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Events
          </Link>
        </li>
        <li>
          <Link
            to="/venues"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Venues
          </Link>
        </li>
        <li>
          <Link
            to="/organizers"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Organizers
          </Link>
        </li>
        <li>
          <Link
            to="/tags"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Tags
          </Link>
        </li>
                <li>
          <Link
            to="/wasmachine"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Wasmachine
          </Link>
        </li>
      </ul> */}
      <Outlet />
    </div>
  )
}
