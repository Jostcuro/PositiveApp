import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './router.tsx'

export default function App() {
  const [router] = useState(createAppRouter)
  return <RouterProvider router={router} />
}
