import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import type { AuthContext } from '../auth'
import Header from '@/components/Header'
import { Container, Title, Text } from '@mantine/core'
import { WashingMachine } from 'lucide-react'

interface MyRouterContext {
  auth: AuthContext
}

function NotFound() {
  return (
    <Container py="xl center" className="flex flex-col items-center justify-center min-h-screen gap-6">
      <Title order={1} mb="md">404 - Page Not Found</Title>
      <Text>The page you're looking for doesn't exist.</Text>
      <WashingMachine size={240} />
    </Container>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Header />
      <Outlet />
      {/* <TanStackRouterDevtools position="bottom-right" initialIsOpen={false} /> */}
    </>
  ),
  notFoundComponent: NotFound,
})
