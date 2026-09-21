import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMangaById, getMangaAggregate, getMangaPage } from '../services/manga'
import { followManga, getMangaReadingStatus, setMangaReadingStatus } from '../services/user'
import type { AggregateChapter, Manga } from '../types/manga'

const getTitle = (manga?: Manga) => {
	const titles = manga?.attributes.title || {}
	return titles.en || Object.values(titles)[0] || 'Untitled'
}

const fallbackCover = 'https://placehold.co/240x340/1c1c1c/ffffff?text=MANGA'

const getCoverUrl = (manga?: Manga) => {
	const cover = manga?.relationships.find((item) => item.type === 'cover_art')
	return cover?.attributes?.fileName
		? `https://uploads.mangadex.org/covers/${manga?.id}/${cover.attributes.fileName}.512.jpg`
		: fallbackCover
}

const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
	event.currentTarget.onerror = null
	event.currentTarget.src = fallbackCover
}

const getAuthors = (manga?: Manga) => manga?.relationships
	.filter((item) => item.type === 'author' || item.type === 'artist')
	.map((item) => item.attributes?.name)
	.filter(Boolean)
	.join(', ')

const languageNames: Record<string, string> = {
	en: 'English',
	vi: 'Vietnamese',
	ja: 'Japanese',
	ko: 'Korean',
	zh: 'Chinese',
	es: 'Spanish',
	fr: 'French',
	pt: 'Portuguese',
	de: 'German',
}

const languageFlags: Record<string, string> = {
	en: '🇬🇧', vi: '🇻🇳', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', es: '🇪🇸', fr: '🇫🇷', pt: '🇵🇹', de: '🇩🇪',
}

const getTitleLanguage = (title: Record<string, string>) => Object.keys(title)[0] || 'en'

const MangaDetail = () => {
	const { mangaId } = useParams<{ mangaId: string }>()
	const [page, setPage] = useState(1)
	const [language, setLanguage] = useState('en')
	const [token] = useState(() => localStorage.getItem('mangadex-access-token') || '')
	const queryClient = useQueryClient()
	const pageSize = 20
	const mangaQuery = useQuery({
		queryKey: ['manga', mangaId],
		queryFn: () => getMangaById(mangaId as string),
		enabled: Boolean(mangaId),
	})
	const aggregateQuery = useQuery({
		queryKey: ['chapters', mangaId, language],
		queryFn: () => getMangaAggregate(mangaId as string, { 'translatedLanguage[]': [language] }),
		enabled: Boolean(mangaId),
	})
	const recommendationQuery = useQuery({
		queryKey: ['manga-recommendations', mangaId, mangaQuery.data?.attributes.tags?.map((tag) => tag.id)],
		queryFn: () => getMangaPage({ 'includedTags[]': (mangaQuery.data?.attributes.tags ?? []).slice(0, 3).map((tag) => tag.id) }, 6, 0),
		enabled: Boolean(mangaId && mangaQuery.data?.attributes.tags?.length),
	})
	const statusQuery = useQuery({
		queryKey: ['manga-status', mangaId, token],
		queryFn: () => getMangaReadingStatus(mangaId as string, token),
		enabled: Boolean(mangaId && token),
	})
	const readingMutation = useMutation({
		mutationFn: async () => {
			if (!token) throw new Error('Connect a MangaDex access token first.')
			await setMangaReadingStatus(mangaId as string, 'reading', token)
			await followManga(mangaId as string, token)
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manga-status', mangaId, token] }),
	})
	if (mangaQuery.isLoading || aggregateQuery.isLoading) return <div className="state-message">Loading manga details...</div>
	if (mangaQuery.isError) return <div className="state-message">Unable to load manga details.</div>

	const manga = mangaQuery.data
	const languages = manga?.attributes.availableTranslatedLanguages?.length ? manga.attributes.availableTranslatedLanguages : ['en']
	const chapters = Array.from(new Map(Object.values(aggregateQuery.data?.volumes ?? {})
		.flatMap((volume) => Object.values(volume.chapters))
		.map((chapter) => [`${chapter.volume ?? ''}:${chapter.chapter}`, chapter] as const)).values())
		.sort((first, second) => Number(second.chapter) - Number(first.chapter))
	const totalPages = Math.max(1, Math.ceil(chapters.length / pageSize))
	const visibleChapters = chapters.slice((page - 1) * pageSize, page * pageSize)
	const description = manga?.attributes.description?.en || Object.values(manga?.attributes.description || {})[0]

	return (
		<>
			<section className="detail-intro">
				<img className="detail-intro-cover" alt={getTitle(manga)} onError={handleImageError} src={getCoverUrl(manga)} />
				<div className="detail-intro-copy">
					<p className="eyebrow">MANGADEX TITLE</p>
					<h1>{getTitle(manga)}</h1>
					<p className="detail-intro-subtitle">{manga?.attributes.altTitles?.[0]?.en || 'English translation available'}</p>
					<p className="detail-intro-description">{description || 'No description available for this manga.'}</p>
					<div className="detail-header-meta"><span>★ 7.5</span><span>{manga?.attributes.year || 'N/A'}</span><span>{manga?.attributes.status || 'ongoing'}</span><span>{languages.length} languages</span></div>
				</div>
			</section>
			<section className="detail-layout">
				<aside className="manga-info-panel">
					<button className={`reading-action ${statusQuery.data === 'reading' ? 'active' : ''}`} disabled={readingMutation.isPending} onClick={() => readingMutation.mutate()}>{statusQuery.data === 'reading' ? 'Reading' : 'Add to reading'}</button>
					{readingMutation.isError && <p className="action-error">{readingMutation.error.message}</p>}
					<div className="manga-info-group"><strong>Author / Artist</strong><span>{getAuthors(manga) || 'Unknown author'}</span></div>
					<div className="manga-info-group"><strong>Status</strong><span>{manga?.attributes.status || 'Unknown'}</span><span>{manga?.attributes.year ? `Published ${manga.attributes.year}` : 'Publication year unavailable'}</span></div>
					<div className="manga-info-group"><strong>Genres</strong><div className="manga-tags">{manga?.attributes.tags?.slice(0, 10).map((tag) => <span key={tag.id}>{tag.attributes?.name?.en || 'Tag'}</span>)}</div></div>
					<div className="manga-info-group"><strong>Titles by language</strong>{manga?.attributes.altTitles?.slice(0, 8).map((title, index) => { const code = getTitleLanguage(title); return <span className="alternative-title" key={`${index}-${Object.values(title)[0]}`}><span className="language-flag">{languageFlags[code] || '🌐'}</span><span>{title[code] || Object.values(title)[0]}</span><small>{languageNames[code] || code.toUpperCase()}</small></span> })}</div>
					<div className="recommendations-inline">
						<div className="recommendations-inline-head"><strong>Recommendations</strong><span>Same genres</span></div>
						{recommendationQuery.isLoading ? <p className="recommendation-state">Loading recommendations...</p> : recommendationQuery.isError ? <p className="recommendation-state">Recommendations unavailable.</p> : <div className="recommendation-inline-list">{(recommendationQuery.data?.data ?? []).filter((item) => item.id !== mangaId).slice(0, 4).map((item) => <Link className="recommendation-inline-card" key={item.id} to={`/manga/${item.id}`}><img src={getCoverUrl(item)} alt={getTitle(item)} /><span>{getTitle(item)}</span></Link>)}</div>}
					</div>
				</aside>

				<div className="chapter-workspace">
					<div className="detail-tabs"><button className="active">Chapters</button><button disabled>Comments</button><button disabled>Recommendations</button></div>
					<div className="chapter-workspace-head">
						<h2>Chapters</h2>
						<div className="chapter-tools">
							<label htmlFor="chapter-language">Language</label>
							<select id="chapter-language" value={language} onChange={(event) => { setLanguage(event.target.value); setPage(1) }}>
								{languages.map((item) => <option key={item} value={item}>{languageFlags[item] || '🌐'} {languageNames[item] || item.toUpperCase()}</option>)}
							</select>
							<span className="chapter-count">{chapters.length} chapters</span>
						</div>
					</div>
					<div className="chapter-options"><label><input type="checkbox" /> Show unavailable chapters</label><button>↕ Descending</button></div>
					{aggregateQuery.isError ? <div className="state-message">Unable to load chapters.</div> : chapters.length === 0 ? <div className="state-message">No chapters available for this manga.</div> : (
					<>
					<div className="chapter-list">
						{visibleChapters.map((chapter: AggregateChapter, index) => (
							<Fragment key={chapter.id}>
								{(index === 0 || visibleChapters[index - 1].volume !== chapter.volume) && <div className="volume-heading"><span>Volume {chapter.volume || '1'}</span><span>Chapter {chapter.chapter} <b>⌃</b></span></div>}
								<Link className="chapter-item" to={`/read/${chapter.id}`}>
									<span className="chapter-title"><strong>Chapter {chapter.chapter || '?'}</strong><small>{chapter.volume ? `Volume ${chapter.volume}` : 'MangaDex translation'}</small></span>
									<span className="chapter-pages">{chapter.count || 0} pages</span>
									<span className="chapter-read">Read</span>
								</Link>
							</Fragment>
						))}
					</div>
					<div className="chapter-pagination">
						<button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>← Previous</button>
						<span>Page {page} / {totalPages}</span>
						<button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next →</button>
					</div>
					</>
					)}
				</div>
			</section>

		</>
	)
}

export default MangaDetail
