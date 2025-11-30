const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); 

// --- CONFIGURATION ---
const UPLOAD_PATH = '/tmp/';
const NTFY_TOPIC = 'harsha_notefs'; 
const APP_URL = 'https://track-me-gvug.onrender.com'; 

// Multer Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_PATH) },
  filename: function (req, file, cb) { cb(null, 'latest_msg.wav') }
})
const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(express.static('public'));

// DATA STORE (Now includes Location)
let status = {
  message: "System Online",
  distance: "Unknown", // You can keep this or remove it if using the map
  lat: 0, // Default Latitude
  lon: 0, // Default Longitude
  isAlert: false,
  timestamp: new Date().toLocaleTimeString(),
  hasAudio: false
};

// --- HELPER: Send ntfy ---
async function sendNtfyNotification() {
    try {
        await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, "Tap to listen.", {
            headers: {
                'Title': 'New Audio', 
                'Tags': 'microphone,loudspeaker', 
                'Click': `${APP_URL}/listen`, 
                'Actions': `view, Listen, ${APP_URL}/listen` 
            }
        });
    } catch (error) { console.error("Notification Error", error.message); }
}

// 1. ENDPOINT: Receive Data (Updated for Location)
app.post('/update', (req, res) => {
  const { msg, dist, alert, lat, lon } = req.body;
  
  if (msg) status.message = msg;
  if (dist) status.distance = dist;
  if (lat) status.lat = lat;
  if (lon) status.lon = lon;
  
  // Alert Logic
  if (alert === "true" || alert === true) {
      status.isAlert = true;
      status.message = "🚨 ATTENTION 🚨";
  } else {
      status.isAlert = false;
  }
  
  status.timestamp = new Date().toLocaleTimeString();
  console.log(`Update: ${status.message} (${status.lat}, ${status.lon})`);
  res.send("Updated");
});

// 2. ENDPOINT: Audio Upload
app.post('/upload-audio', upload.single('voiceNote'), (req, res) => {
    if (req.file) {
        status.hasAudio = true;
        status.message = "🎤 Message Sent!";
        status.timestamp = new Date().toLocaleTimeString();
        sendNtfyNotification();
        res.send("Audio Uploaded");
    } else { res.status(400).send("No file"); }
});

// 3. ENDPOINT: Listen
app.get('/listen', (req, res) => {
    const filePath = path.join(UPLOAD_PATH, 'latest_msg.wav');
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'audio/wav');
        res.sendFile(filePath);
    } else { res.status(404).send("No audio found"); }
});

// 4. ENDPOINT: Status
app.get('/status', (req, res) => { res.json(status); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('Server started on port ' + PORT); });
