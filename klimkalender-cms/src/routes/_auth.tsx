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
      <ul className="py-2 flex gap-2">
        <li>
          <Link
            to="/dashboard"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link
            to="/invoices"
            className="hover:underline data-[status='active']:font-semibold"
          >
            Invoices
          </Link>
        </li>
      </ul>
      <hr />
      <Outlet />
    </div>
  )
}
