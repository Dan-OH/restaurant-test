import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/seo'

export default function NotFound() {
  usePageMeta('Page not found')

  return (
    <div className="container page not-found">
      <h1>Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="button">
        Back to the homepage
      </Link>
    </div>
  )
}
