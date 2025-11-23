import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { z } from 'zod'

import { useAuth } from '../auth'
import { sleep } from '../utils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function signInWithEmail(username: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username,
    password: password,
  })
  console.log('data', data);
  console.log('error', error);
  return { data, error };
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const fallback = '/events' as const

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect || fallback })
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  const auth = useAuth()
  const router = useRouter()
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const navigate = Route.useNavigate()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const search = Route.useSearch()

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true)
    try {
      evt.preventDefault()
      const data = new FormData(evt.currentTarget)
      const userNameValue = data.get('username')
      const passwordValue = data.get('password')

      if (!userNameValue || !passwordValue) return

      const userData = await signInWithEmail(userNameValue.toString(), passwordValue.toString());
      if (userData.error) {
        alert('Error logging in: ' + userData.error.message);
        setIsSubmitting(false);
        return;
      }

      await auth.login(userData.data)

      await router.invalidate()

      // This is just a hack being used to wait for the auth state to update
      // in a real app, you'd want to use a more robust solution
      await sleep(1)

      await navigate({ to: search.redirect || fallback })
    } catch (error) {
      console.error('Error logging in: ', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoggingIn = isLoading || isSubmitting

  return (
    <div className="p-2 grid gap-2 place-items-center">
      {search.redirect ? (
        <p className="text-red-500">You need to login to access this page.</p>
      ) : (
        <p>Login into the Klimkalender CMS</p>
      )}
      <form className="mt-4 max-w-lg" onSubmit={onFormSubmit}>
        <fieldset disabled={isLoggingIn} className="w-full grid gap-2">
          <div className="grid gap-2 items-center min-w-[300px]">
            <label htmlFor="username-input" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username-input"
              name="username"
              placeholder="Enter your name"
              type="text"
              className="border rounded-md p-2 w-full"
              required
            />
          </div>
          <div className="grid gap-2 items-center min-w-[300px]">
            <label htmlFor="password-input" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password-input"
              name="password"
              placeholder="Enter your password"
              type="password"
              className="border rounded-md p-2 w-full"
              autoComplete='current-password'
              required
            />
          </div>
          <button
            type="submit"
            className="bg-black text-white py-2 px-4 rounded-md w-full disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isLoggingIn ? 'Loading...' : 'Login'}
          </button>
        </fieldset>
      </form>
    </div>
  )
}
