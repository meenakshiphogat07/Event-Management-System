import { useEffect, useState } from 'react'
import './App.css'
import QRCode from 'qrcode'
import { db, auth } from './firebase.js'
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from './AuthContext'
import Login from './Login'
import Signup from './Signup'
import EventUpload from './EventUpload'

function App() {
  const { user, loading: authLoading } = useAuth()
  const [isGuest, setIsGuest] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [authMode, setAuthMode] = useState('login')
  const [registrations, setRegistrations] = useState([])
  const [uploadedEvents, setUploadedEvents] = useState([])
  const [viewRegistration, setViewRegistration] = useState(null)
  const [loadingView, setLoadingView] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [joinForm, setJoinForm] = useState({ name: '', email: '', college: '', eventId: '' })

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')
    const id = urlParams.get('id')
    if (view === 'registration' && id) {
      fetchRegistrationById(id)
    }
  }, [])

  useEffect(() => {
    loadUploadedEvents()
    if (user) {
      loadRegistrations()
    } else {
      setRegistrations([])
    }
  }, [user])

  const currentUser = isGuest
    ? { uid: 'guest', displayName: 'Guest User', isGuest: true }
    : user

  const loadRegistrations = async () => {
    if (!user) return
    try {
      const registrationQuery = query(
        collection(db, 'registrations'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(registrationQuery)
      const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      const itemsWithQr = await Promise.all(items.map(generateQrData))
      setRegistrations(itemsWithQr)
    } catch (error) {
      console.error('Firestore load failed:', error)
    }
  }

  const loadUploadedEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(eventsQuery)
      const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      setUploadedEvents(items)
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const fetchRegistrationById = async (id) => {
    setLoadingView(true)
    try {
      const docRef = doc(db, 'registrations', id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const regData = { id: docSnap.id, ...docSnap.data() }
        const withQr = await generateQrData(regData)
        setViewRegistration(withQr)
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
    setStatus('')
    setViewRegistration(null)
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    if (!joinForm.name || !joinForm.email || !joinForm.college || !joinForm.eventId) {
      setStatus('Please fill all fields and select an event.')
      return
    }
    setSaving(true)
    setStatus('')

    try {
      const eventRef = doc(db, 'events', joinForm.eventId)
      const eventSnap = await getDoc(eventRef)
      const eventData = eventSnap.data()

      const newRegistration = {
        eventId: joinForm.eventId,
        eventTitle: eventData?.title || 'Event',
        eventVenue: eventData?.venue || 'TBD',
        name: joinForm.name,
        email: joinForm.email,
        college: joinForm.college,
        userId: currentUser?.isGuest ? null : currentUser?.uid,
        attendeeType: currentUser?.isGuest ? 'guest' : 'user',
        createdAt: new Date()
      }

      const savePromise = addDoc(collection(db, 'registrations'), newRegistration)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Save took too long')), 5000))
      const docRef = await Promise.race([savePromise, timeoutPromise])
      
      const saved = { id: docRef.id, ...newRegistration }
      const savedWithQr = await generateQrData(saved)
      setRegistrations((current) => [savedWithQr, ...current])
      setJoinForm({ name: '', email: '', college: '', eventId: '' })
      setStatus('Registration successful! Your unique QR code is ready.')
      setActiveSection('wallet')
    } catch (error) {
      console.error('Registration failed:', error)
      setStatus('Unable to save registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false)
      setRegistrations([])
      setActiveSection('dashboard')
      setStatus('')
      return
    }

    await signOut(auth)
    setActiveSection('dashboard')
  }

  const handleEventUploaded = async (newEvent) => {
    setUploadedEvents(prev => [newEvent, ...prev])
    setStatus('')
  }

  if (authLoading) {
    return (
      <div className="app">
        <div className="status-screen">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="app">
        <div className="app-shell">
          <div>
            <h1>Planora</h1>
            <p className="subtitle">Your event dashboard for planning, booking, and tracking registered events.</p>
          </div>
        </div>
        {authMode === 'login' ? (
          <Login 
            onSwitchToSignup={() => setAuthMode('signup')}
            onLoginSuccess={() => setActiveSection('dashboard')}
            onContinueAsGuest={() => {
              setIsGuest(true)
              setActiveSection('dashboard')
              setStatus('')
            }}
          />
        ) : (
          <Signup 
            onSwitchToLogin={() => setAuthMode('login')}
            onContinueAsGuest={() => {
              setIsGuest(true)
              setActiveSection('dashboard')
              setStatus('')
            }}
            onSignupSuccess={() => {
              setAuthMode('login')
              setStatus('Signup successful! Please log in.')
            }}
          />
        )}
      </div>
    )
  }

  const renderDashboard = () => (
    <div className="dashboard-grid">
      <div className="section-card dashboard-intro">
        <h2>Welcome to Planora, {currentUser?.displayName?.split(' ')[0]}!</h2>
        <p>
          {currentUser?.isGuest
            ? 'Browse events and register as a guest. Log in later if you want to create and manage your own events.'
            : 'Manage your events, join curated experiences, and keep all registrations in your digital wallet.'}
        </p>
      </div>
      {!currentUser?.isGuest && (
        <button className="dashboard-card dashboard-card-manage" onClick={() => openSection('create')}>
          <div>
            <h3>Create Event</h3>
            <p>Upload your event with images and generate QR tickets.</p>
          </div>
        </button>
      )}
      <button className="dashboard-card dashboard-card-join" onClick={() => openSection('browse')}>
        <div>
          <h3>Browse Events</h3>
          <p>Join upcoming events and get instant QR tickets.</p>
        </div>
      </button>
      <button className="dashboard-card dashboard-card-registered" onClick={() => openSection('wallet')}>
        <div>
          <h3>My Wallet</h3>
          <p>
            {currentUser?.isGuest
              ? 'View tickets created in this guest session.'
              : 'View all your event tickets with QR codes.'}
          </p>
        </div>
      </button>
    </div>
  )

  const renderBrowseEvents = () => (
    <div className="section-card browse-events-card">
      <div className="section-header">
        <h2>Browse Events</h2>
        <p>Discover and join events created by other users</p>
      </div>

      {uploadedEvents.length === 0 ? (
        <p className="empty-message">No events available yet.</p>
      ) : (
        <div className="events-grid">
          {uploadedEvents.map((event) => (
            <div key={event.id} className="event-card browse-event">
              <img src={event.imageUrl} alt={event.title} />
              <div className="event-card-body">
                <strong>{event.title}</strong>
                <p><span className="event-badge">{event.category}</span></p>
                <p>{event.venue} • {new Date(event.date).toLocaleDateString()}</p>
                {event.time && <p>⏰ {event.time}</p>}
                <p>{event.description?.substring(0, 80)}...</p>
                <p className="event-capacity">Capacity: {event.capacity}</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setJoinForm(prev => ({ ...prev, eventId: event.id }))
                  openSection('join')
                }}
              >
                Join Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderJoinEvent = () => {
    const selectedEvent = uploadedEvents.find(e => e.id === joinForm.eventId)
    
    return (
      <div className="section-card join-section">
        <div className="section-header">
          <h2>Join Event</h2>
          <p>Complete your registration to get QR ticket</p>
        </div>

        {selectedEvent && (
          <div className="selected-event-preview">
            <img src={selectedEvent.imageUrl} alt={selectedEvent.title} />
            <div>
              <h3>{selectedEvent.title}</h3>
              <p>{selectedEvent.venue}</p>
              <p>{new Date(selectedEvent.date).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <form className="form-grid" onSubmit={handleJoinSubmit}>
          <div className="field-group">
            <label htmlFor="join-name">Name *</label>
            <input
              id="join-name"
              type="text"
              placeholder="Enter your name"
              value={joinForm.name}
              onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="join-email">Email *</label>
            <input
              id="join-email"
              type="email"
              placeholder="Enter your email"
              value={joinForm.email}
              onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="join-college">Organization *</label>
            <input
              id="join-college"
              type="text"
              placeholder="Enter your organization"
              value={joinForm.college}
              onChange={(e) => setJoinForm({ ...joinForm, college: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={saving} className="primary-action">
            {saving ? 'Registering...' : 'Get Ticket'}
          </button>
        </form>

        {status && <p className="status-message">{status}</p>}
      </div>
    )
  }

  const renderWallet = () => (
    <div className="section-card wallet-card">
      <div className="section-header">
        <h2>My Event Wallet</h2>
        <p>Your registered events and QR tickets</p>
      </div>

      {registrations.length === 0 ? (
        <p className="empty-message">No registered events. Browse and join events to get started!</p>
      ) : (
        <div className="ticket-list">
          {registrations.map((reg) => (
            <div key={reg.id} className="ticket-card">
              <div className="ticket-content">
                <div className="ticket-info">
                  <h3>{reg.eventTitle}</h3>
                  <p className="ticket-venue">{reg.eventVenue}</p>
                  <p className="ticket-attendee">{reg.name}</p>
                  <p className="ticket-email">{reg.email}</p>
                  <p className="ticket-date">
                    {new Date(reg.createdAt?.seconds ? reg.createdAt.seconds * 1000 : reg.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {reg.qrData && (
                  <div className="ticket-qr">
                    <img src={reg.qrData} alt="Ticket QR Code" />
                    <p className="qr-label">Scan to verify</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderMyEvents = () => {
    const myEvents = uploadedEvents.filter(e => e.creatorId === currentUser?.uid)
    
    return (
      <div className="section-card my-events-card">
        <div className="section-header">
          <h2>My Events</h2>
          <p>Manage your created events</p>
        </div>

        {myEvents.length === 0 ? (
          <p className="empty-message">You haven't created any events yet. Create one to get started!</p>
        ) : (
          <div className="events-grid">
            {myEvents.map((event) => (
              <div key={event.id} className="event-card my-event">
                <img src={event.imageUrl} alt={event.title} />
                <div className="event-card-body">
                  <strong>{event.title}</strong>
                  <p><span className="event-badge">{event.category}</span></p>
                  <p>{event.venue}</p>
                  <p>{new Date(event.date).toLocaleDateString()}</p>
                  <p className="event-capacity">Capacity: {event.capacity}</p>
                  <p className="event-status">Status: <span className={`status-${event.status}`}>{event.status}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const showBackButton = activeSection !== 'dashboard' || !!viewRegistration

  return (
    <div className="app">
      <div className="app-shell">
        <div>
          <h1>Planora</h1>
          <p className="subtitle">Your digital event management & ticketing platform</p>
        </div>
        <div className="app-actions">
          {currentUser && (
            <>
              <span className="user-name">{currentUser.displayName}</span>
              <button className="logout-button" onClick={handleLogout}>
                {currentUser?.isGuest ? 'Exit Guest Mode' : 'Logout'}
              </button>
            </>
          )}
          {showBackButton && (
            <button className="back-button" onClick={() => openSection('dashboard')}>
              Back
            </button>
          )}
        </div>
      </div>

      {loadingView ? (
        <div className="status-screen">
          <h2>Loading registration details...</h2>
        </div>
      ) : viewRegistration ? (
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
                <p><strong>Organization:</strong> {viewRegistration.college}</p>
              </div>
              <div>
                {viewRegistration.qrData && (
                  <img src={viewRegistration.qrData} alt="Event QR Code" className="qr-code-large" />
                )}
              </div>
            </div>
          )}
        </div>
      ) : activeSection === 'dashboard' ? (
        renderDashboard()
      ) : activeSection === 'create' ? (
        <EventUpload onEventUploaded={handleEventUploaded} />
      ) : activeSection === 'browse' ? (
        renderBrowseEvents()
      ) : activeSection === 'join' ? (
        renderJoinEvent()
      ) : activeSection === 'wallet' ? (
        renderWallet()
      ) : activeSection === 'my-events' ? (
        renderMyEvents()
      ) : null}

      {status && <p className="status-message">{status}</p>}
    </div>
  )
}

export default App
