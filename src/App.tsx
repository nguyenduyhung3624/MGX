import Router from './routes/Router'
import { useCloudLibrarySync } from './hooks/useCloudLibrarySync'

function App() {
  useCloudLibrarySync()
  return <Router />
}

export default App
