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
		enabled: Boolean(chapterId),
	})

	if (chapterQuery.isLoading || pagesQuery.isLoading) return <div className="reader-state">Loading chapter...</div>
	if (chapterQuery.isError || pagesQuery.isError || !pagesQuery.data) return <div className="reader-state">Unable to load this chapter.</div>

	const { baseUrl, chapter } = pagesQuery.data
	const pageFiles = chapter.data.length ? chapter.data : chapter.dataSaver

	return (
		<main className="reader-page">
			<header className="reader-bar">
				<Link to="/" className="reader-back">← Home</Link>
				<strong>Chapter {chapterQuery.data?.attributes.chapter || '?'}</strong>
				<span>{pageFiles.length} pages</span>
			</header>
			<div className="reader-pages">
				{pageFiles.map((file, index) => (
					<img key={file} src={`${baseUrl}/data/${chapter.hash}/${file}`} alt={`Page ${index + 1}`} />
				))}
			</div>
		</main>
	)
}

export default ReaderPage
