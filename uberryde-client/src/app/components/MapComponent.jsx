'use client'
import { Autocomplete, DirectionsRenderer, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import io from 'socket.io-client'
import { UserCircle, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Initialize socket
const socket = io('http://localhost:3001')

// Define libraries array outside of the component
const libraries = ['places']

const containerStyle = {
  width: '100%',
  height: '100vh'
}

// Default map center
const center = {
  lat: 28.6139,
  lng: 77.2090
}

// Haversine distance formula to calculate distance between two lat/lng points
function haversineDistance(coords1, coords2) {
  function toRad(x) {
    return x * Math.PI / 180
  }
  const R = 6371 // Earth's radius in km
  const dLat = toRad(coords2.lat - coords1.lat)
  const dLon = toRad(coords2.lng - coords1.lng)
  const lat1 = toRad(coords1.lat)
  const lat2 = toRad(coords2.lat)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function MapComponent() {
  const router = useRouter()
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  })

  // State variables
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [distance, setDistance] = useState('')
  const [activeRide, setActiveRide] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [rideStatus, setRideStatus] = useState(null)
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [assignedDriver, setAssignedDriver] = useState(null)
  const [distanceToDriver, setDistanceToDriver] = useState(null)
  const [finalFare, setFinalFare] = useState(null)

  // Refs for Autocomplete inputs
  const originRef = useRef(null)
  const destinationRef = useRef(null)

  // Handlers for location selection
  function handleOriginSelect() {
    if (originRef.current) {
      const place = originRef.current.getPlace()
      if (place && place.geometry) {
        setOrigin({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
      }
    }
  }

  function handleDestinationSelect() {
    if (destinationRef.current) {
      const place = destinationRef.current.getPlace()
      if (place && place.geometry) {
        setDestination({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
      }
    }
  }

  // Calculate and display route on map
  useEffect(() => {
    async function calculateRoute() {
      if (!origin || !destination) return
      const directionsService = new window.google.maps.DirectionsService()
      const results = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      })
      setDirectionsResponse(results)
      setDistance(results.routes[0].legs[0].distance.text)
    }
    calculateRoute()
  }, [origin, destination])

  // Fetch available drivers when pickup location is set
  useEffect(() => {
    const fetchDrivers = async () => {
      if (!origin) return
      try {
        const response = await fetch(`http://localhost:3001/api/drivers/available?lat=${origin.lat}&lng=${origin.lng}`)
        if (!response.ok) throw new Error('Failed to fetch drivers.')
        const drivers = await response.json()
        setNearbyDrivers(drivers)
      } catch (error) {
        console.error(error)
      }
    }
    fetchDrivers()
  }, [origin])

  // Listen for real-time ride updates via WebSocket
  useEffect(() => {
    if (activeRide && activeRide.rider_id) {
      const rideUpdateChannel = `ride-update-${activeRide.rider_id}`

      socket.on(rideUpdateChannel, (data) => {
        if (data.status) setRideStatus(data.status);

        if (data.status === 'ACCEPTED' && data.driverInfo) {
          setAssignedDriver(data.driverInfo)
        }
        if (data.driverLocation) {
          setDriverLocation(data.driverLocation)
        }
        if (data.status === 'COMPLETED') {
          setFinalFare(data.fare)
          setDriverLocation(null) // Clear driver marker
        }
      })

      return () => socket.off(rideUpdateChannel)
    }
  }, [activeRide])

  // Calculate real-time distance between rider and driver
  useEffect(() => {
    if (driverLocation && origin) {
      const distance = haversineDistance(origin, driverLocation)
      setDistanceToDriver(distance.toFixed(2))
    }
  }, [driverLocation, origin])

  // Handle the main ride request button click
  async function handleRequestRide() {
    if (!origin || !destination) return alert("Please select both pickup and destination.")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('You must be logged in to request a ride.')
    
    if (nearbyDrivers.length === 0) return alert("No drivers available nearby.")

    // Find nearest driver
    let nearestDriver = null
    let minDistance = Infinity
    nearbyDrivers.forEach(driver => {
      const distance = haversineDistance(origin, driver.current_location)
      if (distance < minDistance) {
        minDistance = distance
        nearestDriver = driver
      }
    })

    if (!nearestDriver) return alert("Could not determine the nearest driver.")
    
    console.log(`Nearest driver is ${nearestDriver.id}, at ${minDistance.toFixed(2)} km away.`)
    const estimatedFare = parseFloat((minDistance * 20 + 40).toFixed(2)) // Example fare calculation

    try {
      const response = await fetch('http://localhost:3001/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: origin,
          destination_location: destination,
          rider_id: user.id,
          fare: estimatedFare,
          driver_id: nearestDriver.id
        }),
      })

      if (!response.ok) throw new Error('Failed to request ride.')

      const rideData = await response.json()
      setActiveRide(rideData)
      alert(`Ride request sent to the nearest driver! Ride ID: ${rideData.id}`)
    } catch (error) {
      console.error(error)
      alert('Could not request ride.')
    }
  }

  if (!isLoaded) return <div>Loading...</div>

  return (
    <div className="relative w-full h-screen">
      {/* Show booking form ONLY when a driver has not been assigned */}
      {!assignedDriver && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-lg font-bold mb-2">Book a Ride</h2>
          <Autocomplete onLoad={(a) => (originRef.current = a)} onPlaceChanged={handleOriginSelect}>
            <input type="text" placeholder="Pickup Location" className="w-full p-2 border rounded mb-2 text-black" />
          </Autocomplete>
          <Autocomplete onLoad={(a) => (destinationRef.current = a)} onPlaceChanged={handleDestinationSelect}>
            <input type="text" placeholder="Destination" className="w-full p-2 border rounded text-black" />
          </Autocomplete>
          {distance && <p className="mt-2 text-center">Route Distance: <strong>{distance}</strong></p>}
          <button onClick={handleRequestRide} className="w-full bg-black text-white p-2 rounded mt-4 font-bold">
            Request uberRyde
          </button>
        </div>
      )}

      {/* Show driver info panel AFTER a driver is assigned */}
      {assignedDriver && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          {/* Show this panel DURING the ride */}
          {rideStatus !== 'COMPLETED' && (
            <div>
              <h2 className="text-lg font-bold">
                {rideStatus === 'ACCEPTED' ? 'Your driver is on the way!' : 'Trip in Progress'}
              </h2>
              {distanceToDriver && <p className="text-gray-600">{distanceToDriver} km away</p>}

              <div className="flex items-center mt-4 p-4 border rounded-lg">
                <UserCircle size={48} className="text-gray-600" />
                <div className="ml-4 flex-grow">
                  <p className="font-bold text-lg">{assignedDriver.full_name}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star size={16} className="text-yellow-400 fill-current" />
                    <span className="ml-1">{assignedDriver.average_rating.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-right">{assignedDriver.make} {assignedDriver.model}</p>
                  <p className="text-gray-600 text-right bg-gray-200 px-2 rounded">{assignedDriver.license_plate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show this panel AFTER the ride is completed */}
          {rideStatus === 'COMPLETED' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold">Trip Completed!</h2>
              <p className="text-gray-600 mt-2">Please pay the final fare.</p>
              <p className="text-4xl font-bold my-4">₹{finalFare}</p>
              <button
                onClick={() => router.push(`/pay?fare=${finalFare}&rideId=${activeRide.id}`)}
                className="w-full bg-green-500 text-white font-bold p-3 rounded-lg hover:bg-green-600 transition"
              >
                Proceed to Payment
              </button>
            </div>
          )}
        </div>
      )}

      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} options={{ zoomControl: false, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
        {origin && <Marker position={origin} />}
        {destination && <Marker position={destination} />}
        {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}

        {/* Live driver location (only show if a driver is assigned) */}
        {assignedDriver && driverLocation && (
          <Marker position={driverLocation} icon={{ url: '/car-icon.svg', scaledSize: new window.google.maps.Size(40, 40) }} />
        )}

        {/* Nearby drivers markers (only show if no driver is assigned yet) */}
        {!assignedDriver && nearbyDrivers.map((driver) => (
          <Marker key={driver.id} position={driver.current_location} icon={{ url: '/car-icon.svg', scaledSize: new window.google.maps.Size(40, 40) }} />
        ))}
      </GoogleMap>
    </div>
  )
}

export default MapComponent