import './index.css'
import './styles/browse.css'
import './styles/auth.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // MangaDex may temporarily block a proxy IP after rate limiting.
      // Retrying 403/429 automatically can extend that block.
      retry: (failureCount, error) => {
        const status = (
          error as { response?: { status?: number } } | null
        )?.response?.status

        if ([400, 401, 403, 404, 405, 410, 422, 429].includes(status ?? 0)) {
          return false
        }

        // One retry is enough for transient network/5xx failures.
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 8_000),
    },
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
)
