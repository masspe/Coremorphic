import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'

const queryClient = new QueryClient()

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable. Add it to your .env file to enable Clerk.')
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </ClerkProvider>
    </React.StrictMode>
)
