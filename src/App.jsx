import { useEffect, useState } from 'react'
import './App.css'
import QRCode from 'qrcode'
import { db } from './firebase.js'
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'

const manageEventTypes = [
  { id: 'birthday', label: 'Birthday Party' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'other', label: 'Other Cultural Event' }
]

const exploreEvents = [
  {
    id: 'technophilia-2026',
    title: 'Technophilia 2026',
    venue: 'DVSIET',
    date: '2026',
    description: 'A technical festival full of workshops, showcases, and networking.',
    imageUrl: 'https://source.unsplash.com/featured/400x250/?technology,event'
  },
  {
    id: 'melody-mania',
    title: 'Melody Mania',
    venue: 'City Auditorium',
    date: '2026',
    description: 'A live music experience with top local artists and new acts.',
    imageUrl: 'https://source.unsplash.com/featured/400x250/?music,concert'
  },
  {
    id: 'art-connect',
    title: 'Art Connect',
    venue: 'Expo Hall',
    date: '2026',
    description: 'A cultural event to explore art, crafts, and creative workshops.',
    imageUrl: 'https://source.unsplash.com/featured/400x250/?art,exhibition'
  }
]

function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [manageType, setManageType] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [viewRegistration, setViewRegistration] = useState(null)
  const [loadingView, setLoadingView] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [joinForm, setJoinForm] = useState({ name: '', email: '', college: '', eventId: 'technophilia-2026' })

  useEffect(() => {
    loadRegistrations()
  }, [])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    const id = urlParams.get('id')
    if (view === 'registration' && id) {
      fetchRegistrationById(id)
    }
  }, [])

  const fetchRegistrationById = async (id) => {
    setLoadingView(true)
    try {
      const docRef = doc(db, 'registrations', id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setViewRegistration({ id: docSnap.id, ...docSnap.data() })
      } else {
        setViewRegistration('not-found')
      }
    } catch (error) {
      console.error('Error fetching registration:', error)
      setViewRegistration('error')
    } finally {
      setLoadingView(false)
    }
  }

  const loadRegistrations = async () => {
    try {
      const registrationQuery = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(registrationQuery)
      const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      const itemsWithQr = await Promise.all(items.map(generateQrData))
      setRegistrations(itemsWithQr)
    } catch (error) {
      console.error('Firestore load failed:', error)
      setStatus('Unable to load registrations from Firebase.')
    }
  }

  const generateQrData = async (registration) => {
    try {
      const url = `${window.location.origin}/?view=registration&id=${registration.id}`
      const qrData = await QRCode.toDataURL(url, { margin: 2, width: 180 })
      return { ...registration, qrData, qrUrl: url }
    } catch (error) {
      console.error('QR generation failed:', error)
      return registration
    }
  }

  const openSection = (section) => {
    setActiveSection(section)
    setManageType('')
    setStatus('')
    setViewRegistration(null)
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!joinForm.name || !joinForm.email || !joinForm.college) {
      setStatus('Please enter your name, email, and college name.')
      return
    }
    setSaving(true)
    setStatus('')

    try {
      const selectedEvent = exploreEvents.find((event) => event.id === joinForm.eventId)
      const newRegistration = {
        eventId: selectedEvent?.id || 'technophilia-2026',
        eventTitle: selectedEvent?.title || 'Technophilia 2026',
        eventVenue: selectedEvent?.venue || 'DVSIET',
        name: joinForm.name,
        email: joinForm.email,
        college: joinForm.college,
        createdAt: new Date()
      }
      const savePromise = addDoc(collection(db, 'registrations'), newRegistration)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Save took too long')), 5000))
      const docRef = await Promise.race([savePromise, timeoutPromise])
      const saved = { id: docRef.id, ...newRegistration }
      const savedWithQr = await generateQrData(saved)
      setRegistrations((current) => [savedWithQr, ...current])
      setJoinForm({ name: '', email: '', college: '', eventId: 'technophilia-2026' })
      setStatus('Registration successful! Your unique QR code is ready below.')
      setActiveSection('registered')
    } catch (error) {
      console.error('Registration failed:', error)
      setStatus('Unable to save registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = exploreEvents.find((event) => event.id === joinForm.eventId)
  const showBackButton = activeSection !== 'dashboard' || !!viewRegistration

  const renderDashboard = () => (
    <div className="dashboard-grid">
      <div className="section-card dashboard-intro">
        <h2>Welcome to Planora</h2>
        <p>Manage your events, join curated experiences, and keep all registrations in one polished dashboard.</p>
      </div>
      <button className="dashboard-card dashboard-card-manage" onClick={() => openSection('manage')}>
        <div>
          <h3>Manage Event</h3>
          <p>Choose an event type to configure plans, guests, and timelines.</p>
        </div>
      </button>
      <button className="dashboard-card dashboard-card-join" onClick={() => openSection('join')}>
        <div>
          <h3>Join Event</h3>
          <p>Browse upcoming events with personalized registration and QR access.</p>
        </div>
      </button>
      <button className="dashboard-card dashboard-card-registered" onClick={() => openSection('registered')}>
        <div>
          <h3>Registered Events</h3>
          <p>Review past registrations and access QR codes instantly.</p>
        </div>
      </button>
    </div>
  )

  const renderJoin = () => (
    <div className="section-card join-section">
      <div className="section-header">
        <h2>Book My Show</h2>
        <p>Select an event, then complete the registration form below.</p>
      </div>
      <div className="events-grid">
        {exploreEvents.map((event) => (
          <div key={event.id} className={`event-card ${event.id === selectedEvent?.id ? 'active' : ''}`}>
            <img src={event.imageUrl} alt={event.title} />
            <div className="event-card-body">
              <strong>{event.title}</strong>
              <p>{event.venue} • {event.date}</p>
              <p>{event.description}</p>
            </div>
            <button type="button" onClick={() => setJoinForm((current) => ({ ...current, eventId: event.id }))}>
              {event.id === selectedEvent?.id ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>
      <form className="form-grid" onSubmit={handleJoinSubmit}>
        <div className="field-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={joinForm.name}
            onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={joinForm.email}
            onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="college">College Name</label>
          <input
            id="college"
            type="text"
            placeholder="Enter your college"
            value={joinForm.college}
            onChange={(e) => setJoinForm({ ...joinForm, college: e.target.value })}
          />
        </div>
        <button type="submit" disabled={saving} className="primary-action">
          {saving ? 'Joining...' : `Join ${selectedEvent?.title}`}
        </button>
      </form>
      {status && <p className="status-message">{status}</p>}
    </div>
  )

  const renderRegistered = () => (
    <div className="section-card registered-section">
      <div className="section-header">
        <h2>Registered Events</h2>
        <p>All your event registrations are listed below with QR codes for easy access.</p>
      </div>
      {registrations.length === 0 ? (
        <p className="empty-message">No registrations yet. Join an event to get started.</p>
      ) : (
        <ul className="registered-list">
          {registrations.map((reg) => (
            <li key={reg.id} className="registration-item">
              <div className="registration-text">
                <strong>{reg.eventTitle}</strong>
                <p>{reg.eventVenue} • {new Date(reg.createdAt?.seconds ? reg.createdAt.seconds * 1000 : reg.createdAt).toLocaleDateString()}</p>
                <p>{reg.name} • {reg.college}</p>
              </div>
              {reg.qrData ? (
                <img className="qr-code" src={reg.qrData} alt={`QR code for ${reg.name}`} />
              ) : (
                <span className="badge">QR generating...</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const renderRegistrationDetails = () => (
    <div className="section-card registration-details-card">
      <div className="section-header">
        <h2>Registration Details</h2>
      </div>
      {viewRegistration === 'not-found' && (
        <p className="empty-message">The registration you're looking for doesn't exist.</p>
      )}
      {viewRegistration === 'error' && (
        <p className="empty-message">There was an error loading the registration details.</p>
      )}
      {viewRegistration && viewRegistration !== 'not-found' && viewRegistration !== 'error' && (
        <div className="detail-grid">
          <div>
            <p><strong>Event:</strong> {viewRegistration.eventTitle}</p>
            <p><strong>Venue:</strong> {viewRegistration.eventVenue}</p>
            <p><strong>Name:</strong> {viewRegistration.name}</p>
            <p><strong>Email:</strong> {viewRegistration.email}</p>
            <p><strong>College:</strong> {viewRegistration.college}</p>
          </div>
          <div>
            <p><strong>Registered At:</strong></p>
            <p>{viewRegistration.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="app">
      <div className="app-shell">
        <div>
          <h1>Planora</h1>
          <p className="subtitle">Your event dashboard for planning, booking, and tracking registered events.</p>
        </div>
        {showBackButton && (
          <button className="back-button" onClick={() => openSection('dashboard')}>
            Back to Dashboard
          </button>
        )}
      </div>

      {loadingView ? (
        <div className="status-screen">
          <h2>Loading registration details...</h2>
        </div>
      ) : viewRegistration ? (
        renderRegistrationDetails()
      ) : activeSection === 'dashboard' ? (
        renderDashboard()
      ) : activeSection === 'manage' ? (
        <ManageEvent manageType={manageType} setManageType={setManageType} />
      ) : activeSection === 'join' ? (
        renderJoin()
      ) : activeSection === 'registered' ? (
        renderRegistered()
      ) : null}
    </div>
  )
}

function ManageEvent({ manageType, setManageType }) {
  const selectedType = manageEventTypes.find((item) => item.id === manageType)

  return (
    <div className="section-card manage-event-card">
      <div className="section-header">
        <h2>Manage Event</h2>
        <p>Choose an event type to see the next steps for planning and execution.</p>
      </div>
      {!manageType ? (
        <div className="event-selection grid-two">
          {manageEventTypes.map((type) => (
            <button key={type.id} onClick={() => setManageType(type.id)}>
              {type.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="section-card inner-card">
          <h3>{selectedType?.label}</h3>
          <p>Ready to manage your {selectedType?.label.toLowerCase()}.</p>
          <div className="manage-details">
            <p><strong>What to do next</strong></p>
            <ul>
              <li>Define your event goals and theme.</li>
              <li>Plan the guest list, budget, and logistics.</li>
              <li>Choose vendors, catering, and entertainment.</li>
            </ul>
          </div>
          <button className="secondary" onClick={() => setManageType('')}>
            Choose another event
          </button>
        </div>
      )}
    </div>
  )
}

export default App
