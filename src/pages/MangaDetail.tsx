import { useQuery } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMangaById, getMangaAggregate } from '../services/manga'
import type { AggregateChapter, Manga } from '../types/manga'

const getTitle = (manga?: Manga) => {
	const titles = manga?.attributes.title || {}
	return titles.en || Object.values(titles)[0] || 'Untitled'
}

const getCoverUrl = (manga?: Manga) => {
	const cover = manga?.relationships.find((item) => item.type === 'cover_art')
	return cover?.attributes?.fileName
		? `https://uploads.mangadex.org/covers/${manga?.id}/${cover.attributes.fileName}.512.jpg`
		: 'https://placehold.co/240x340/1c1c1c/ffffff?text=MANGA'
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

const MangaDetail = () => {
	const { mangaId } = useParams<{ mangaId: string }>()
	const [page, setPage] = useState(1)
	const [language, setLanguage] = useState('en')
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
			<section className="detail-layout">
				<aside className="manga-info-panel">
					<img className="manga-info-cover" src={getCoverUrl(manga)} alt={getTitle(manga)} />
					<h1>{getTitle(manga)}</h1>
					<p className="manga-info-description">{description || 'No description available for this manga.'}</p>
					<div className="manga-info-group"><strong>Author</strong><span>{getAuthors(manga) || 'Unknown author'}</span></div>
					<div className="manga-info-group"><strong>Genres</strong><div className="manga-tags">{manga?.attributes.tags?.slice(0, 10).map((tag) => <span key={tag.id}>{tag.attributes?.name?.en || 'Tag'}</span>)}</div></div>
					<div className="manga-info-group"><strong>Alternative titles</strong>{manga?.attributes.altTitles?.slice(0, 5).map((title, index) => <span className="alternative-title" key={`${index}-${Object.values(title)[0]}`}>{title.en || Object.values(title)[0]}</span>)}</div>
				</aside>

				<div className="chapter-workspace">
					<div className="detail-tabs"><button className="active">Chapters</button><button disabled>Comments</button><button disabled>Recommendations</button></div>
					<div className="chapter-workspace-head">
						<h2>Chapters</h2>
						<div className="chapter-tools">
							<label htmlFor="chapter-language">Language</label>
							<select id="chapter-language" value={language} onChange={(event) => { setLanguage(event.target.value); setPage(1) }}>
								{languages.map((item) => <option key={item} value={item}>{languageNames[item] || item.toUpperCase()}</option>)}
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
									<span className="chapter-number">EN</span>
									<span className="chapter-title"><strong>Ch. {chapter.chapter || '?'}</strong><small>{chapter.volume ? `Volume ${chapter.volume}` : 'MangaDex translation'}</small></span>
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
