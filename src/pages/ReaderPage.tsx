import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAtHomeServer, getChapterById } from '../services/chapter'
import { getMangaAggregate } from '../services/manga'
import { rememberChapter } from '../services/localLibrary'
import type { AggregateChapter } from '../types/manga'
import { preloadPages } from '../services/preloadPages'
import { getChapterPageImageUrl } from '../services/mangaDexImages'

type ReaderMode = 'scroll' | 'paged'

const readerModeKey = 'mgx-reader-mode'

const compareChapters = (first: AggregateChapter, second: AggregateChapter) => {
	const byVolume = (first.volume || '').localeCompare(second.volume || '', undefined, { numeric: true })
	return byVolume || first.chapter.localeCompare(second.chapter, undefined, { numeric: true })
}

const getStoredMode = (): ReaderMode => {
	try {
		return localStorage.getItem(readerModeKey) === 'paged' ? 'paged' : 'scroll'
	} catch {
		return 'scroll'
	}
}

type ChapterControlsProps = {
	previous?: AggregateChapter
	next?: AggregateChapter
	loading?: boolean
}

const ChapterControls = ({ previous, next, loading = false }: ChapterControlsProps) => (
	<nav className="reader-chapter-controls" aria-label="Chapter navigation">
		{previous ? (
			<Link to={`/read/${previous.id}`} className="reader-control-button">← Previous chapter <span>{previous.chapter || '?'}</span></Link>
		) : (
			<button type="button" className="reader-control-button" disabled>{loading ? 'Loading chapters…' : '← Previous chapter'}</button>
		)}
		{next ? (
			<Link to={`/read/${next.id}`} className="reader-control-button">Next chapter <span>{next.chapter || '?'}</span> →</Link>
		) : (
			<button type="button" className="reader-control-button" disabled>{loading ? 'Loading chapters…' : 'Next chapter →'}</button>
		)}
	</nav>
)

const ReaderPage = () => {
	const { chapterId } = useParams<{ chapterId: string }>()
	const navigate = useNavigate()
	const [advanceFrom, setAdvanceFrom] = useState<string | null>(null)
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const held = useRef(false)
	const recordedChapter = useRef('')
	const [storageError, setStorageError] = useState('')
	const [readerMode, setReaderMode] = useState<ReaderMode>(getStoredMode)
	const [controlsVisible, setControlsVisible] = useState(true)
	const touchStartY = useRef<number | null>(null)
	const [pageState, setPageState] = useState({ chapterId: '', page: 0 })
	const preload = useRef<ReturnType<typeof preloadPages> | null>(null)

	const chapterQuery = useQuery({
		queryKey: ['chapter', chapterId],
		queryFn: () => getChapterById(chapterId as string),
		enabled: Boolean(chapterId),
	})
	const pagesQuery = useQuery({
		queryKey: ['chapter-pages', chapterId],
		queryFn: () => getAtHomeServer(chapterId as string),
		enabled: Boolean(chapterQuery.data && !chapterQuery.data.attributes.isUnavailable && !chapterQuery.data.attributes.externalUrl),
	})

	const mangaId = chapterQuery.data?.relationships.find((item) => item.type === 'manga')?.id
	const language = chapterQuery.data?.attributes.translatedLanguage || 'en'
	const chapterNavigationQuery = useQuery({
		queryKey: ['reader-chapter-navigation', mangaId, language],
		queryFn: () => getMangaAggregate(mangaId as string, { 'translatedLanguage[]': [language] }),
		enabled: Boolean(mangaId),
	})
	const navigationChapters = useMemo(() => Array.from(new Map(
		Object.values(chapterNavigationQuery.data?.volumes ?? {})
			.flatMap((volume) => Object.values(volume.chapters).map((item) => ({ ...item, volume: volume.volume })))
			.map((item) => [`${item.volume ?? ''}:${item.chapter}`, item] as const)
	).values()).filter((item) => !item.isUnavailable).sort(compareChapters), [chapterNavigationQuery.data])
	const currentChapterIndex = navigationChapters.findIndex((item) => item.id === chapterId || item.others?.includes(chapterId || '') || (item.chapter === chapterQuery.data?.attributes.chapter && (item.volume || 'none') === (chapterQuery.data?.attributes.volume || 'none')))
	const previousChapter = currentChapterIndex > 0 ? navigationChapters[currentChapterIndex - 1] : undefined
	const nextChapter = currentChapterIndex >= 0 ? navigationChapters[currentChapterIndex + 1] : undefined
	const pageFiles = pagesQuery.data ? (pagesQuery.data.chapter.data.length ? pagesQuery.data.chapter.data : pagesQuery.data.chapter.dataSaver) : []
	const activePage = pageState.chapterId === chapterId ? pageState.page : 0
	const pageUrls = useMemo(() => {
		if (!pagesQuery.data) return []
		const { baseUrl, chapter } = pagesQuery.data
		const quality = chapter.data.length ? 'data' : 'data-saver'
		const files = chapter.data.length ? chapter.data : chapter.dataSaver
		return files.map(file => getChapterPageImageUrl(baseUrl, quality, chapter.hash, file))
	}, [pagesQuery.data])
	useEffect(() => {
		if (readerMode !== 'paged' || chapterQuery.data?.attributes.isUnavailable || chapterQuery.data?.attributes.externalUrl) return
		const session = preloadPages(pageUrls)
		preload.current = session
		return () => { session.dispose(); preload.current = null }
	}, [pageUrls, chapterId, readerMode, chapterQuery.data?.attributes.isUnavailable, chapterQuery.data?.attributes.externalUrl])
	useEffect(() => { preload.current?.prioritize(activePage) }, [activePage, pageUrls, readerMode])
	const setActivePage = useCallback((update: number | ((current: number) => number)) => setPageState((current) => {
		const currentPage = current.chapterId === chapterId ? current.page : 0
		return { chapterId: chapterId || '', page: typeof update === 'function' ? update(currentPage) : update }
	}), [chapterId])
	const movePage = useCallback((direction: -1 | 1) => {
		if (held.current) { held.current = false; return }
		if (direction === 1 && activePage >= pageFiles.length - 1) {
			setAdvanceFrom(chapterId || null)
			return
		}
		setAdvanceFrom(null)
		setActivePage((current) => Math.min(pageFiles.length - 1, Math.max(0, current + direction)))
		window.scrollTo({ top: 0, behavior: 'auto' })
	}, [activePage, chapterId, pageFiles.length, setActivePage])

	useEffect(() => {
		if (advanceFrom === chapterId && nextChapter && chapterNavigationQuery.isSuccess && readerMode === 'paged') {
			setAdvanceFrom(null)
			navigate(`/read/${nextChapter.id}`)
		}
	}, [advanceFrom, chapterId, nextChapter, chapterNavigationQuery.isSuccess, readerMode, navigate])

	useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current) }, [])
	const cancelHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current) }
	const startHold = () => {
		held.current = false
		cancelHold()
		holdTimer.current = setTimeout(() => { held.current = true; setAdvanceFrom(null); setReaderMode('scroll') }, 650)
	}

	useEffect(() => {
		try { localStorage.setItem(readerModeKey, readerMode) } catch { /* Reading mode remains session-only. */ }
	}, [readerMode])

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'auto' })
		setControlsVisible(true)
	}, [chapterId])

	// Reveal the reader toolbar when the reader moves toward the beginning of the page.
	useEffect(() => {
		let previousY = window.scrollY
		const handleScroll = () => {
			const currentY = window.scrollY
			const delta = currentY - previousY
			if (Math.abs(delta) > 4) setControlsVisible(delta < 0)
			previousY = currentY
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const handleReaderTouchStart = (event: React.TouchEvent<HTMLElement>) => {
		touchStartY.current = event.touches[0]?.clientY ?? null
	}

	const handleReaderTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
		const startY = touchStartY.current
		const endY = event.changedTouches[0]?.clientY
		touchStartY.current = null
		if (startY === null || endY === undefined) return

		const delta = endY - startY
		if (delta > 44) setControlsVisible(true)
		else if (delta < -44) setControlsVisible(false)
	}

	useEffect(() => {
		if (readerMode !== 'paged' || !pageFiles.length) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey || event.altKey) return
			const target = event.target as HTMLElement | null
			if (target?.closest('input, textarea, select, a')) return
			if (event.key === 'Escape') { setAdvanceFrom(null); setReaderMode('scroll'); return }
			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				movePage(-1)
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault()
				movePage(1)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [pageFiles.length, readerMode, movePage])

	const back = <Link to={mangaId ? `/manga/${mangaId}` : '/search'}>← Back to manga</Link>
	if (chapterQuery.isLoading) return <div className="reader-state" role="status">Loading chapter...</div>
	if (chapterQuery.isError) return <div className="reader-state" role="alert">Could not load chapter details. <button onClick={() => chapterQuery.refetch()}>Try again</button>{back}</div>
	if (chapterQuery.data?.attributes.isUnavailable) return <div className="reader-state unavailable-notice"><h1>Chapter unavailable</h1><p>MangaDex has marked this chapter unavailable. Its pages cannot be read here; the API does not specify the removal reason.</p>{back}</div>
	if (chapterQuery.data?.attributes.externalUrl) {
		const url = chapterQuery.data.attributes.externalUrl
		return <div className="reader-state"><h1>Read on the publisher’s website</h1>{/^https?:\/\//i.test(url) && <a href={url} target="_blank" rel="noopener noreferrer">Open external chapter ↗</a>}{back}</div>
	}
	if (pagesQuery.isLoading) return <div className="reader-state" role="status">Loading pages...</div>
	if (pagesQuery.isError || !pagesQuery.data) return <div className="reader-state" role="alert">Unable to load chapter pages. <button onClick={() => pagesQuery.refetch()}>Try again</button>{back}</div>

	const { baseUrl, chapter } = pagesQuery.data
	const quality = chapter.data.length ? 'data' : 'data-saver'
	if (!pageFiles.length) return <div className="reader-state"><h1>No readable pages</h1><p>MangaDex returned no pages for this chapter.</p>{back}</div>

	const imageUrl = (file: string) => getChapterPageImageUrl(baseUrl, quality, chapter.hash, file)
	const markChapterRead = () => {
		if (!mangaId || !chapterId || recordedChapter.current === chapterId) return
		recordedChapter.current = chapterId
		try {
			rememberChapter(mangaId, chapterId, chapterQuery.data?.attributes.chapter || '?')
			setStorageError('')
		} catch {
			setStorageError('Could not save reading progress in this browser.')
		}
	}
	const shownFile = pageFiles[Math.min(activePage, pageFiles.length - 1)]

	return (
		<main
			className={`reader-page reader-mode-${readerMode}`}
			onTouchStart={handleReaderTouchStart}
			onTouchEnd={handleReaderTouchEnd}
		>
			<header className={`reader-bar reader-floating-bar${controlsVisible ? ' is-visible' : ''}`}>
				<Link to={mangaId ? `/manga/${mangaId}` : '/'} className="reader-back" aria-label="Back to manga">
					<span aria-hidden="true">←</span><span>Back</span>
				</Link>
				<div className="reader-toolbar-chapter">
					<strong>Chapter {chapterQuery.data?.attributes.chapter || '?'}</strong>
					<select
						aria-label="Choose chapter"
						value={chapterId || ''}
						onChange={(event) => { if (event.target.value) navigate(`/read/${event.target.value}`) }}
					>
						<option value={chapterId || ''}>Chapter {chapterQuery.data?.attributes.chapter || '?'}</option>
						{navigationChapters.filter((item) => item.id !== chapterId).map((item) => (
							<option key={item.id} value={item.id}>
								{item.volume ? `Vol. ${item.volume} · ` : ''}Ch. {item.chapter || '?'}
							</option>
						))}
					</select>
				</div>
				<div className="reader-mode-switch" role="group" aria-label="Reader mode">
					<button type="button" className={readerMode === 'scroll' ? 'active' : ''} onClick={() => { setReaderMode('scroll'); setControlsVisible(true) }}>Scroll</button>
					<button type="button" className={readerMode === 'paged' ? 'active' : ''} onClick={() => { setReaderMode('paged'); setControlsVisible(true) }}>Click</button>
				</div>
				<button type="button" className="reader-toolbar-hide" aria-label="Hide reader controls" onClick={() => setControlsVisible(false)}>×</button>
			</header>}

			{storageError && <p className={readerMode === 'paged' ? 'reader-sr-only' : 'save-error'} role="alert">{storageError}</p>}
			{readerMode === 'scroll' ? (
				<div className="reader-pages">
					{pageFiles.map((file, index) => <img key={file} src={imageUrl(file)} alt={`Page ${index + 1}`} loading="lazy" decoding="async" onLoad={markChapterRead} />)}
				</div>
			) : (
				<section className="reader-paged" aria-label={`Page ${activePage + 1} of ${pageFiles.length}`}>
					<div className="reader-image-stage" onPointerDown={startHold} onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerMove={cancelHold} onContextMenu={event => event.preventDefault()}>
						<button type="button" className="reader-page-zone reader-page-zone-prev" aria-label="Previous page" onClick={() => movePage(-1)} />
						<img key={shownFile} className="reader-single-page" src={imageUrl(shownFile)} alt={`Page ${activePage + 1}`} onLoad={markChapterRead} />
						<button type="button" className="reader-page-zone reader-page-zone-next" aria-label={activePage === pageFiles.length - 1 ? 'Next chapter' : 'Next page'} onClick={() => movePage(1)} />
					</div>
					<p className="reader-sr-only" aria-live="polite">{advanceFrom === chapterId && !nextChapter ? (chapterNavigationQuery.isLoading ? 'Loading chapters' : chapterNavigationQuery.isError ? 'Unable to load chapter navigation' : 'No next readable chapter') : `Page ${activePage + 1} of ${pageFiles.length}`}. Hold the image or press Escape to return to scroll mode.</p>
				</section>
			)}

			{readerMode === 'scroll' && <footer className="reader-footer-controls">
				<ChapterControls previous={previousChapter} next={nextChapter} loading={chapterNavigationQuery.isLoading} />
			</footer>}
		</main>
	)
}

export default ReaderPage
