const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const supabase = require('./supabaseClient');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const server = http.createServer(app);
const port = 3001;

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:3000",
  "https://uber-ryde-monorepo.vercel.app"
];

app.use(cors({
  origin: allowedOrigins
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH"]
  }
});

app.use(express.json());

// --- Logger Middleware ---
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.originalUrl}`);
  next();
});

/* ------------------ RIDE ENDPOINTS ------------------ */

app.post('/api/rides', async (req, res) => {
  try {
    let { pickup_location, destination_location, rider_id, fare, driver_id } = req.body;
    if (!driver_id) {
      const { data: availableDrivers, error: driverError } = await supabase.from('profiles').select('id').eq('role', 'DRIVER').eq('driver_status', 'APPROVED').not('current_location', 'is', null).limit(1);
      if (driverError || !availableDrivers || availableDrivers.length === 0) {
        driver_id = '00000000-0000-0000-0000-000000000000'; 
        console.log('No real drivers available. Assigning to placeholder.');
      } else {
        driver_id = availableDrivers[0].id;
      }
    }
    const { data, error } = await supabase.from('rides').insert([{ pickup_location, destination_location, rider_id, fare, driver_id, status: 'REQUESTED' }]).select().single();
    if (error) throw error;
    io.to(driver_id).emit('new-ride-request', data);
    console.log(`Ride request sent to driver ${driver_id}`);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ride request.' });
  }
});

app.patch('/api/rides/:rideId/accept', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ error: 'Driver ID is required.' });
    const { data: rideData, error: rideError } = await supabase.from('rides').update({ status: 'ACCEPTED', driver_id: driver_id }).eq('id', rideId).eq('status', 'REQUESTED').select().single();
    if (rideError) throw rideError;
    if (!rideData) return res.status(404).json({ error: 'Ride not found or already accepted.' });
    const { data: driverProfile, error: profileError } = await supabase.from('profiles').select('full_name, average_rating').eq('id', driver_id).single();
    const { data: vehicleDetails, error: vehicleError } = await supabase.from('vehicles').select('make, model, license_plate, vehicle_type').eq('driver_id', driver_id).single();
    if (profileError || vehicleError) throw (profileError || vehicleError);
    const payload = { status: 'ACCEPTED', rideDetails: rideData, driverInfo: { ...driverProfile, ...vehicleDetails } };
    io.emit(`ride-update-${rideData.rider_id}`, payload);
    res.status(200).json(rideData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept ride.' });
  }
});

app.patch('/api/rides/:rideId/decline', async (req, res) => {
    try {
      const { rideId } = req.params;
      const { data, error } = await supabase.from('rides').update({ status: 'DECLINED' }).eq('id', rideId).select('rider_id').single();
      if (error) throw error;
      io.emit(`ride-update-${data.rider_id}`, { status: 'DECLINED' });
      res.status(200).json({ message: 'Ride declined.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to decline ride.' });
    }
});

app.patch('/api/rides/:rideId/start', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { data, error } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId).eq('status', 'ACCEPTED').select('rider_id, status').single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Ride not found or not in ACCEPTED state.' });
    io.emit(`ride-update-${data.rider_id}`, { status: 'IN_PROGRESS' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start ride.' });
  }
});

app.patch('/api/rides/:rideId/complete', async (req, res) => {
  try {
    const { rideId } = req.params;
    const finalFare = parseFloat((Math.random() * 300 + 100).toFixed(2));
    const { data, error } = await supabase.from('rides').update({ status: 'COMPLETED', fare: finalFare }).eq('id', rideId).eq('status', 'IN_PROGRESS').select().single();
    if (error) throw error;
    io.emit(`ride-update-${data.rider_id}`, { status: 'COMPLETED', fare: data.fare });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete ride.' });
  }
});

app.get('/api/rides/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase.from('rides').select('*').eq('rider_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ride history.' });
  }
});

/* ------------------ DRIVER & VEHICLE ENDPOINTS ------------------ */

app.post('/api/driver/vehicle', async (req, res) => {
  try {
    const { driver_id, make, model, year, license_plate, vehicle_type } = req.body;
    if (!driver_id || !make || !model || !year || !license_plate || !vehicle_type) {
      return res.status(400).json({ error: 'All vehicle fields are required.' });
    }
    const { data, error } = await supabase.from('vehicles').insert([{ driver_id, make, model, year, license_plate, vehicle_type }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This license plate or driver is already registered.' });
    res.status(500).json({ error: 'Failed to submit vehicle information.' });
  }
});

app.get('/api/drivers/available', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id, current_location').eq('role', 'DRIVER').eq('driver_status', 'APPROVED').not('current_location', 'is', null);
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available drivers.' });
  }
});

/* ------------------ REVIEW & PAYMENT ENDPOINTS ------------------ */

app.post('/api/reviews', async (req, res) => {
  try {
    const { ride_id, reviewer_id, reviewee_id, rating, comment } = req.body;
    if (!ride_id || !reviewer_id || !reviewee_id || !rating) {
      return res.status(400).json({ error: 'Missing required review information.' });
    }
    const { data, error } = await supabase.from('reviews').insert([{ ride_id, reviewer_id, reviewee_id, rating, comment }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A review for this ride already exists.' });
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required.' });
    const paymentIntent = await stripe.paymentIntents.create({ amount, currency: 'inr', automatic_payment_methods: { enabled: true } });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment intent.' });
  }
});

/* ------------------ SOCKET.IO LOGIC ------------------ */
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('join-driver-room', (driverId) => {
    socket.join(driverId);
    console.log(`Driver ${driverId} joined room.`);
  });
  socket.on('update-driver-location', async (data) => {
    if (data.driverId && data.location) {
      await supabase.from('profiles').update({ current_location: data.location }).eq('id', data.driverId);
    }
  });
  socket.on('driver-location-update', (data) => {
    if (data.rideId && data.location) {
      io.emit(`ride-update-${data.rideId}`, { driverLocation: data.location });
    }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/* ------------------ START SERVER ------------------ */
server.listen(port, () => {
  console.log(`uberRyde server and WebSocket listening on port ${port}`);
});