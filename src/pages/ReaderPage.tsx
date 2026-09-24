import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getAtHomeServer, getChapterById } from '../services/chapter'

const ReaderPage = () => {
	const { chapterId } = useParams<{ chapterId: string }>()
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
	const pageFiles = chapter.data.length ? chapter.data : chapter.dataSaver
	const quality = chapter.data.length ? 'data' : 'data-saver'
	if (!pageFiles.length) return <div className="reader-state"><h1>No readable pages</h1><p>MangaDex returned no pages for this chapter.</p>{back}</div>

	return (
		<main className="reader-page">
			<header className="reader-bar">
				<Link to="/" className="reader-back">← Home</Link>
				<strong>Chapter {chapterQuery.data?.attributes.chapter || '?'}</strong>
				<span>{pageFiles.length} pages</span>
			</header>
			<div className="reader-pages">
				{pageFiles.map((file, index) => (
					<img key={file} src={`/api/page?url=${encodeURIComponent(`${baseUrl}/${quality}/${chapter.hash}/${file}`)}`} alt={`Page ${index + 1}`} />
				))}
			</div>
		</main>
	)
}

export default ReaderPage
