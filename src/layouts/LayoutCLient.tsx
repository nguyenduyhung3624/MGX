
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/layouts/Header'
import Sidebar from '../components/layouts/Sidebar'
import Footer from './Footer'


type LayoutCLientProps = {
    children: ReactNode
}

const LayoutCLient = ({ children }: LayoutCLientProps) => {
    const location = useLocation()
    useEffect(() => {
        const root = document.documentElement
        const savedTheme = localStorage.getItem('manga-theme')

        const devicePrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
        const initialTheme = savedTheme || (devicePrefersLight ? 'light' : 'dark')
        root.setAttribute('data-theme', initialTheme)

        const themeToggle = document.getElementById('themeToggle')
        const sideNav = document.getElementById('sideNav')
        const backdrop = document.getElementById('sideNavBackdrop')
        const navToggle = document.getElementById('navToggle')

        themeToggle?.addEventListener('click', () => {
            const isLight = root.getAttribute('data-theme') === 'light'
            root.setAttribute('data-theme', isLight ? 'dark' : 'light')
            localStorage.setItem('manga-theme', isLight ? 'dark' : 'light')
        })

        navToggle?.addEventListener('click', () => {
            sideNav?.classList.add('open')
            backdrop?.classList.add('open')
        })

        backdrop?.addEventListener('click', () => {
            sideNav?.classList.remove('open')
            backdrop?.classList.remove('open')
        })

        return () => {
            themeToggle?.removeEventListener('click', () => { })
            navToggle?.removeEventListener('click', () => { })
            backdrop?.removeEventListener('click', () => { })
        }
    }, [])

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-area">
                {location.pathname !== '/' && <Header />}
                <main className="content">{children}</main>

                <Footer />
            </div>
        </div>
    )
}

export default LayoutCLient
