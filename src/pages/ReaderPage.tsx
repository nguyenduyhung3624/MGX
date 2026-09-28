import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAtHomeServer, getChapterById } from '../services/chapter'
import { getMangaAggregate } from '../services/manga'
import { rememberChapter } from '../services/localLibrary'
import type { AggregateChapter } from '../types/manga'

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
	const recordedChapter = useRef('')
	const [storageError, setStorageError] = useState('')
	const [readerMode, setReaderMode] = useState<ReaderMode>(getStoredMode)
	const [pageState, setPageState] = useState({ chapterId: '', page: 0 })

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
	const currentChapterIndex = navigationChapters.findIndex((item) => item.id === chapterId)
	const previousChapter = currentChapterIndex > 0 ? navigationChapters[currentChapterIndex - 1] : undefined
	const nextChapter = currentChapterIndex >= 0 ? navigationChapters[currentChapterIndex + 1] : undefined
	const pageFiles = pagesQuery.data ? (pagesQuery.data.chapter.data.length ? pagesQuery.data.chapter.data : pagesQuery.data.chapter.dataSaver) : []
	const activePage = pageState.chapterId === chapterId ? pageState.page : 0
	const setActivePage = useCallback((update: number | ((current: number) => number)) => setPageState((current) => {
		const currentPage = current.chapterId === chapterId ? current.page : 0
		return { chapterId: chapterId || '', page: typeof update === 'function' ? update(currentPage) : update }
	}), [chapterId])

	useEffect(() => {
		try { localStorage.setItem(readerModeKey, readerMode) } catch { /* Reading mode remains session-only. */ }
	}, [readerMode])

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'auto' })
	}, [chapterId])

	useEffect(() => {
		if (readerMode !== 'paged' || pageFiles.length < 2) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey || event.altKey) return
			const target = event.target as HTMLElement | null
			if (target?.closest('input, textarea, select, button, a')) return
			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				setActivePage((current) => Math.max(0, current - 1))
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault()
				setActivePage((current) => Math.min(pageFiles.length - 1, current + 1))
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [pageFiles.length, readerMode, setActivePage])

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

	const imageUrl = (file: string) => `/api/page?url=${encodeURIComponent(`${baseUrl}/${quality}/${chapter.hash}/${file}`)}`
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
	const movePage = (direction: -1 | 1) => setActivePage((current) => Math.min(pageFiles.length - 1, Math.max(0, current + direction)))
	const shownFile = pageFiles[Math.min(activePage, pageFiles.length - 1)]

	return (
		<main className={`reader-page reader-mode-${readerMode}`}>
			<header className="reader-bar">
				<Link to={mangaId ? `/manga/${mangaId}` : '/'} className="reader-back">← Manga</Link>
				<div className="reader-title"><strong>Chapter {chapterQuery.data?.attributes.chapter || '?'}</strong><span>{readerMode === 'paged' ? `Page ${activePage + 1} / ${pageFiles.length}` : `${pageFiles.length} pages`}</span></div>
				<div className="reader-mode-switch" role="group" aria-label="Reader mode">
					<button type="button" className={readerMode === 'scroll' ? 'active' : ''} onClick={() => setReaderMode('scroll')}>Scroll</button>
					<button type="button" className={readerMode === 'paged' ? 'active' : ''} onClick={() => setReaderMode('paged')}>Click</button>
				</div>
			</header>

			{storageError && <p className="save-error" role="alert">{storageError}</p>}
			<div className="reader-navigation-top"><ChapterControls previous={previousChapter} next={nextChapter} loading={chapterNavigationQuery.isLoading} /></div>

			{readerMode === 'scroll' ? (
				<div className="reader-pages">
					{pageFiles.map((file, index) => <img key={file} src={imageUrl(file)} alt={`Page ${index + 1}`} onLoad={markChapterRead} />)}
				</div>
			) : (
				<section className="reader-paged" aria-label={`Page ${activePage + 1} of ${pageFiles.length}`}>
					<div className="reader-image-stage">
						<button type="button" className="reader-page-zone reader-page-zone-prev" aria-label="Previous page" disabled={activePage === 0} onClick={() => movePage(-1)}><span>‹</span></button>
						<img key={shownFile} className="reader-single-page" src={imageUrl(shownFile)} alt={`Page ${activePage + 1}`} onLoad={markChapterRead} />
						<button type="button" className="reader-page-zone reader-page-zone-next" aria-label="Next page" disabled={activePage === pageFiles.length - 1} onClick={() => movePage(1)}><span>›</span></button>
						<div className="reader-page-counter" aria-live="polite">{activePage + 1} / {pageFiles.length}</div>
					</div>
					<p className="reader-page-hint">Click either side of the image or use ← → to change pages</p>
				</section>
			)}

			<footer className="reader-footer-controls">
				<ChapterControls previous={previousChapter} next={nextChapter} loading={chapterNavigationQuery.isLoading} />
			</footer>
		</main>
	)
}

export default ReaderPage
