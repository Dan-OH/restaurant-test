import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Seasonal food, made with care</h1>
          <p>A neighbourhood restaurant serving honest, local ingredients every day.</p>
          <Link to="/menu" className="button">
            View the menu
          </Link>
        </div>
      </section>

      <section className="container page info-grid">
        <div>
          <h2>Hours</h2>
          <p>
            Tue – Thu: 5pm – 10pm
            <br />
            Fri – Sat: 5pm – 11pm
            <br />
            Sun: 10am – 3pm (brunch)
          </p>
        </div>
        <div>
          <h2>Location</h2>
          <p>
            123 Main Street
            <br />
            Your City
          </p>
        </div>
        <div>
          <h2>Reservations</h2>
          <p>
            Call us at (555) 123-4567
            <br />
            Walk-ins always welcome
          </p>
        </div>
      </section>
    </>
  )
}
