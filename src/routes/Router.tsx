import { Route, Routes } from 'react-router-dom'
import LayoutCLient from '../layouts/LayoutCLient'
import Home from '../pages/Home'
import Search from '../pages/Search'
import MangaDetail from '../pages/MangaDetail'
import Library from '../pages/Library'
import ReaderPage from '../pages/ReaderPage'
import Browse from '../pages/Browse'
import Login from '../pages/Login'
import Register from '../pages/Register'

const Router = () => {
  return (
    <Routes>
      <Route path="/search" element={<LayoutCLient><Search /></LayoutCLient>} />
      <Route path="/" element={<LayoutCLient><Home /></LayoutCLient>} />
      <Route path="/browse/:collection" element={<LayoutCLient><Browse /></LayoutCLient>} />
      <Route path="/manga/:mangaId" element={<LayoutCLient><MangaDetail /></LayoutCLient>} />
      <Route path="/library" element={<LayoutCLient><Library /></LayoutCLient>} />
      <Route path="/read/:chapterId" element={<ReaderPage />} />
      <Route path="/login" element={<LayoutCLient><Login /></LayoutCLient>} />
      <Route path="/register" element={<LayoutCLient><Register /></LayoutCLient>} />
      <Route path="*" element={<LayoutCLient><Home /></LayoutCLient>} />
    </Routes>
  )
}

export default Router
