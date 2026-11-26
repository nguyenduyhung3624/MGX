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

const compareChaptersNewestFirst = (first: AggregateChapter, second: AggregateChapter) => {
	const firstVolume = first.volume?.trim() || ''
	const secondVolume = second.volume?.trim() || ''
	const firstHasVolume = Boolean(firstVolume && firstVolume.toLowerCase() !== 'none')
	const secondHasVolume = Boolean(secondVolume && secondVolume.toLowerCase() !== 'none')

	// Unnumbered/latest volume entries (often the currently serialized run) are shown first.
	if (firstHasVolume !== secondHasVolume) return firstHasVolume ? 1 : -1
	const byVolume = secondVolume.localeCompare(firstVolume, undefined, { numeric: true })
	return byVolume || second.chapter.localeCompare(first.chapter, undefined, { numeric: true })
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
	const [chapterPickerOpen, setChapterPickerOpen] = useState(false)
	const [chapterSearch, setChapterSearch] = useState('')
	const [scrollActivePage, setScrollActivePage] = useState(0)
	const [pageMotion, setPageMotion] = useState<'next' | 'previous'>('next')
	const gestureStart = useRef<{ x: number; y: number; pointerId: number } | null>(null)
	const suppressClickUntil = useRef(0)
	const readerPagesRef = useRef<HTMLDivElement | null>(null)
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
	const selectedChapter = currentChapterIndex >= 0 ? navigationChapters[currentChapterIndex] : undefined
	const chapterPickerItems = useMemo(
		() => [...navigationChapters].sort(compareChaptersNewestFirst),
		[navigationChapters]
	)
	const filteredChapterItems = useMemo(() => {
		const term = chapterSearch.trim().toLowerCase()
		if (!term) return chapterPickerItems
		return chapterPickerItems.filter((item) =>
			[item.volume, item.chapter, `chapter ${item.chapter}`, `vol ${item.volume}`]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(term))
		)
	}, [chapterPickerItems, chapterSearch])
	const chapterGroups = useMemo(() => {
		const groups = new Map<string, AggregateChapter[]>()
		filteredChapterItems.forEach((item) => {
			const volume = item.volume?.trim()
			const label = volume && volume.toLowerCase() !== 'none' ? `Volume ${volume}` : 'Other chapters'
			const items = groups.get(label) ?? []
			items.push(item)
			groups.set(label, items)
		})
		return Array.from(groups.entries())
	}, [filteredChapterItems])
	const selectedChapterLabel = selectedChapter
		? `${selectedChapter.volume && selectedChapter.volume.toLowerCase() !== 'none' ? `Vol. ${selectedChapter.volume} · ` : ''}Ch. ${selectedChapter.chapter || '?'}`
		: `${chapterQuery.data?.attributes.volume ? `Vol. ${chapterQuery.data.attributes.volume} · ` : ''}Ch. ${chapterQuery.data?.attributes.chapter || '?'}`
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
		setPageMotion(direction === 1 ? 'next' : 'previous')
		setActivePage((current) => Math.min(pageFiles.length - 1, Math.max(0, current + direction)))
	}, [activePage, chapterId, pageFiles.length, setActivePage])

	const handleReaderPointerDown = (event: React.PointerEvent<HTMLElement>) => {
		if ((event.target as HTMLElement).closest('.reader-floating-bar, .reader-progress, .reader-chapter-picker, .reader-chapter-picker-backdrop')) return
		gestureStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
	}

	const handleReaderPointerUp = (event: React.PointerEvent<HTMLElement>) => {
		const start = gestureStart.current
		gestureStart.current = null
		if (!start || start.pointerId !== event.pointerId) return

		const deltaX = event.clientX - start.x
		const deltaY = event.clientY - start.y
		if (readerMode === 'paged' && Math.abs(deltaX) >= 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
			suppressClickUntil.current = Date.now() + 450
			movePage(deltaX < 0 ? 1 : -1)
			return
		}
		if (Math.abs(deltaY) >= 44 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
			setControlsVisible(deltaY > 0)
		}
	}

	const handleReaderPointerCancel = () => {
		gestureStart.current = null
	}

	const handlePageZoneClick = (direction: -1 | 1) => {
		if (Date.now() < suppressClickUntil.current) return
		movePage(direction)
	}

	const handleProgressSelect = (index: number) => {
		if (readerMode === 'paged') {
			setAdvanceFrom(null)
			setPageMotion(index >= activePage ? 'next' : 'previous')
			setActivePage(index)
			return
		}
		readerPagesRef.current?.querySelectorAll<HTMLImageElement>('.reader-scroll-page')[index]
			?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

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
		setScrollActivePage(0)
		setChapterPickerOpen(false)
		setChapterSearch('')
	}, [chapterId])

	useEffect(() => {
		if (!chapterPickerOpen) return
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				setChapterPickerOpen(false)
			}
		}
		window.addEventListener('keydown', handleEscape)
		return () => window.removeEventListener('keydown', handleEscape)
	}, [chapterPickerOpen])

	useEffect(() => {
		const root = document.documentElement
		root.classList.add('mgx-reader-active')
		document.body.classList.add('mgx-reader-active')
		return () => {
			root.classList.remove('mgx-reader-active')
			document.body.classList.remove('mgx-reader-active')
		}
	}, [])

	useEffect(() => {
		if (readerMode !== 'scroll' || !readerPagesRef.current || typeof IntersectionObserver === 'undefined') return
		const images = readerPagesRef.current.querySelectorAll<HTMLImageElement>('.reader-scroll-page')
		const observer = new IntersectionObserver((entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
			if (visible) {
				const index = Number((visible.target as HTMLImageElement).dataset.pageIndex)
				if (Number.isInteger(index)) setScrollActivePage(index)
			}
		}, { threshold: [0.1, 0.25, 0.4, 0.6, 0.8], rootMargin: '-18% 0px -48% 0px' })
		images.forEach((image) => observer.observe(image))
		return () => observer.disconnect()
	}, [readerMode, pageFiles.length, chapterId])

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
			onPointerDown={handleReaderPointerDown}
			onPointerUp={handleReaderPointerUp}
			onPointerCancel={handleReaderPointerCancel}
		>
			<header className={`reader-bar reader-floating-bar${controlsVisible ? ' is-visible' : ''}${chapterPickerOpen ? ' has-chapter-picker' : ''}`}>
				<Link to={mangaId ? `/manga/${mangaId}` : '/'} className="reader-back" aria-label="Back to manga">
					<span aria-hidden="true">←</span><span>Back</span>
				</Link>
				<div className="reader-toolbar-chapter">
					<button
						type="button"
						className="reader-chapter-trigger"
						aria-expanded={chapterPickerOpen}
						aria-haspopup="dialog"
						aria-label={`Choose chapter, current ${selectedChapterLabel}`}
						onClick={() => {
							setControlsVisible(true)
							setChapterPickerOpen((open) => !open)
						}}
					>
						<span>{selectedChapterLabel}</span>
						<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
					</button>
				</div>
				<div className="reader-mode-switch" role="group" aria-label="Reader mode">
					<button type="button" className={readerMode === 'scroll' ? 'active' : ''} onClick={() => { setReaderMode('scroll'); setControlsVisible(true) }}>Scroll</button>
					<button type="button" className={readerMode === 'paged' ? 'active' : ''} onClick={() => { setReaderMode('paged'); setControlsVisible(true) }}>Click</button>
				</div>
				<button type="button" className="reader-toolbar-hide" aria-label="Hide reader controls" onClick={() => setControlsVisible(false)}>×</button>
			</header>

			{chapterPickerOpen && (
				<>
					<button type="button" className="reader-chapter-picker-backdrop" aria-label="Close chapter picker" onClick={() => setChapterPickerOpen(false)} />
			<section className="reader-chapter-picker" role="dialog" aria-modal="true" aria-label="Choose a chapter">
				<div className="reader-chapter-picker-heading">
					<div>
						<strong>Choose chapter</strong>
						<span>{chapterNavigationQuery.isLoading ? 'Loading chapter list…' : `${navigationChapters.length} chapters available`}</span>
					</div>
					<button type="button" aria-label="Close chapter picker" onClick={() => setChapterPickerOpen(false)}>×</button>
				</div>
				<label className="reader-chapter-search">
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
					<input
						type="search"
						value={chapterSearch}
						onChange={(event) => setChapterSearch(event.target.value)}
						placeholder="Search chapter or volume…"
						aria-label="Search chapter or volume"
					/>
					{chapterSearch && <button type="button" aria-label="Clear search" onClick={() => setChapterSearch('')}>×</button>}
				</label>
				<div className="reader-chapter-picker-list">
					{chapterNavigationQuery.isLoading ? (
						<p className="reader-chapter-picker-message">Loading chapters…</p>
					) : chapterNavigationQuery.isError ? (
						<div className="reader-chapter-picker-message">
							<p>Unable to load chapters.</p>
							<button type="button" onClick={() => chapterNavigationQuery.refetch()}>Try again</button>
						</div>
					) : chapterGroups.length === 0 ? (
						<p className="reader-chapter-picker-message">No matching chapters.</p>
					) : chapterGroups.map(([volume, items]) => (
						<section className="reader-chapter-group" key={volume}>
							<h3>{volume}</h3>
							<div>
								{items.map((item) => {
									const isCurrent = item.id === selectedChapter?.id || item.others?.includes(chapterId || '')
									return (
						<button
							type="button"
							key={item.id}
							className={`reader-chapter-option${isCurrent ? ' is-current' : ''}`}
							aria-current={isCurrent ? 'page' : undefined}
							onClick={() => {
								setChapterPickerOpen(false)
								setChapterSearch('')
								if (item.id !== chapterId) navigate(`/read/${item.id}`)
							}}
						>
							<span>Chapter {item.chapter || '?'}</span>
							<span className="reader-chapter-option-check" aria-hidden="true">{isCurrent ? '✓' : ''}</span>
						</button>
									)
								})}
							</div>
						</section>
					))}
				</div>
			</section>
				</>
			)}

			{storageError && <p className={readerMode === 'paged' ? 'reader-sr-only' : 'save-error'} role="alert">{storageError}</p>}
			{readerMode === 'scroll' ? (
				<div className="reader-pages" ref={readerPagesRef}>
					{pageFiles.map((file, index) => (
						<img
							key={file}
							className="reader-scroll-page"
							data-page-index={index}
							src={imageUrl(file)}
							alt={`Page ${index + 1}`}
							loading="lazy"
							decoding="async"
							draggable={false}
							onLoad={markChapterRead}
						/>
					))}
				</div>
			) : (
				<section className="reader-paged" aria-label={`Page ${activePage + 1} of ${pageFiles.length}`}>
					<div className="reader-image-stage" onPointerDown={startHold} onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerMove={cancelHold} onContextMenu={event => event.preventDefault()}>
						<button type="button" className="reader-page-zone reader-page-zone-prev" aria-label="Previous page" onClick={() => handlePageZoneClick(-1)} />
						<img key={shownFile} className={`reader-single-page is-moving-${pageMotion}`} src={imageUrl(shownFile)} alt={`Page ${activePage + 1}`} draggable={false} onLoad={markChapterRead} />
						<button type="button" className="reader-page-zone reader-page-zone-next" aria-label={activePage === pageFiles.length - 1 ? 'Next chapter' : 'Next page'} onClick={() => handlePageZoneClick(1)} />
					</div>
					<p className="reader-sr-only" aria-live="polite">{advanceFrom === chapterId && !nextChapter ? (chapterNavigationQuery.isLoading ? 'Loading chapters' : chapterNavigationQuery.isError ? 'Unable to load chapter navigation' : 'No next readable chapter') : `Page ${activePage + 1} of ${pageFiles.length}`}. Hold the image or press Escape to return to scroll mode.</p>
				</section>
			)}

			{readerMode === 'scroll' && <footer className="reader-footer-controls">
				<ChapterControls previous={previousChapter} next={nextChapter} loading={chapterNavigationQuery.isLoading} />
			</footer>}

			<nav className="reader-progress" aria-label="Chapter reading progress">
				{pageFiles.map((file, index) => {
					const progressPage = readerMode === 'paged' ? activePage : scrollActivePage
					const state = index === progressPage ? 'is-current' : index < progressPage ? 'is-read' : ''
					return (
						<button
							key={file}
							type="button"
							className={state}
							aria-label={`Go to page ${index + 1} of ${pageFiles.length}`}
							aria-current={index === progressPage ? 'step' : undefined}
							title={`Page ${index + 1}`}
							onClick={() => handleProgressSelect(index)}
						/>
					)
				})}
			</nav>
		</main>
	)
}

export default ReaderPage
