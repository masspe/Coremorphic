import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'
import { CoremorphicClerkProvider } from '@/lib/clerk'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <CoremorphicClerkProvider>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </CoremorphicClerkProvider>
    </React.StrictMode>
)
