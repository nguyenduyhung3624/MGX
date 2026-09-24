
import { Route, Routes } from 'react-router-dom'
import LayoutCLient from '../layouts/LayoutCLient'
import Home from '../pages/Home'
import Search from '../pages/Search'
import MangaDetail from '../pages/MangaDetail'
import Library from '../pages/Library'
import ReaderPage from '../pages/ReaderPage'

const Router = () => {
  return (
    <Routes>
      <Route path="/search" element={<LayoutCLient><Search /></LayoutCLient>} />
      <Route path="/" element={<LayoutCLient><Home /></LayoutCLient>} />
      <Route path="/manga/:mangaId" element={<LayoutCLient><MangaDetail /></LayoutCLient>} />
      <Route path="/library" element={<LayoutCLient><Library /></LayoutCLient>} />
      <Route path="/read/:chapterId" element={<ReaderPage />} />
      <Route path="*" element={<LayoutCLient><Home /></LayoutCLient>} />
    </Routes>
  )
}

export default Router
