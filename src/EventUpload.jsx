import { useState } from 'react'
import { storage, db, auth } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection } from 'firebase/firestore'

export default function EventUpload({ onEventUploaded }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    capacity: '',
    category: 'other'
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const categories = [
    { id: 'other', label: 'Other Cultural Event' },
    { id: 'birthday', label: 'Birthday Party' },
    { id: 'wedding', label: 'Wedding' },
    { id: 'conference', label: 'Conference' },
    { id: 'concert', label: 'Concert' },
    { id: 'seminar', label: 'Seminar' },
    { id: 'festival', label: 'Festival' }
  ]

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.title || !formData.date || !formData.venue || !formData.capacity) {
      setError('Please fill all required fields.')
      return
    }

    if (!imageFile) {
      setError('Please select an event image.')
      return
    }

    setLoading(true)

    try {
      let imageUrl = ''

      if (imageFile) {
        const storageRef = ref(storage, `events/${Date.now()}-${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      const eventData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        imageUrl,
        creatorId: auth.currentUser?.uid,
        creatorName: auth.currentUser?.displayName || 'Anonymous',
        createdAt: new Date(),
        registrations: 0,
        status: 'active'
      }

      const docRef = await addDoc(collection(db, 'events'), eventData)

      const newEvent = {
        id: docRef.id,
        ...eventData
      }

      setSuccess(`Event "${formData.title}" created successfully!`)
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        capacity: '',
        category: 'other'
      })
      setImageFile(null)
      setImagePreview('')

      if (onEventUploaded) {
        onEventUploaded(newEvent)
      }

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error uploading event:', err)
      setError(err.message || 'Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-card event-upload-card">
      <div className="section-header">
        <h2>Create New Event</h2>
        <p>Upload event details and image to get started</p>
      </div>

      <form className="form-grid event-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="title">Event Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="Enter event title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe your event (optional)"
            value={formData.description}
            onChange={handleInputChange}
            rows="4"
          />
        </div>

        <div className="form-row">
          <div className="field-group">
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="time">Time</label>
            <input
              id="time"
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label htmlFor="venue">Venue *</label>
            <input
              id="venue"
              type="text"
              name="venue"
              placeholder="Event location"
              value={formData.venue}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="capacity">Capacity *</label>
            <input
              id="capacity"
              type="number"
              name="capacity"
              placeholder="Expected attendees"
              value={formData.capacity}
              onChange={handleInputChange}
              required
              min="1"
            />
          </div>
        </div>

        <div className="field-group image-upload">
          <label htmlFor="image">Event Image *</label>
          <div className="image-input-wrapper">
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              required
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Event preview" />
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="primary-action">
          {loading ? 'Creating Event...' : 'Create Event'}
        </button>
      </form>

      {error && <p className="status-message error-message">{error}</p>}
      {success && <p className="status-message success-message">{success}</p>}
    </div>
  )
}
