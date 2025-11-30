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

// *** SECURITY ***
const SECRET_PIN = "4321"; // CHANGE THIS to your desired PIN

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_PATH) },
  filename: function (req, file, cb) { cb(null, 'latest_msg.wav') }
})
const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(express.static('public'));

// DATA STORE
let status = {
  message: "System Online",
  lat: 0, 
  lon: 0, 
  isAlert: false,
  timestamp: new Date().toLocaleTimeString(),
  hasAudio: false
};

// --- HELPER: Send ntfy ---
async function sendNtfy(title, message, clickUrl, actions) {
    try {
        await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, message, {
            headers: {
                'Title': title, 
                'Click': clickUrl, 
                'Actions': actions
            }
        });
    } catch (error) { console.error("Notification Error", error.message); }
}

// 1. ENDPOINT: Update Status (NOW REQUIRES PIN)
app.post('/update', (req, res) => {
  const { msg, dist, alert, lat, lon, pin } = req.body;
  
  // SECURITY CHECK
  if (pin !== SECRET_PIN) {
      return res.status(401).send("WRONG PIN");
  }

  if (msg) status.message = msg;
  if (lat) status.lat = lat;
  if (lon) status.lon = lon;
  
  if (alert === "true" || alert === true) {
      status.isAlert = true;
      status.message = "🚨 ATTENTION 🚨";
  } else {
      status.isAlert = false;
  }
  
  status.timestamp = new Date().toLocaleTimeString();
  res.send("Updated");
});

// 2. ENDPOINT: Audio Upload
app.post('/upload-audio', upload.single('voiceNote'), (req, res) => {
    if (req.file) {
        status.hasAudio = true;
        status.message = "🎤 Message Sent!";
        status.timestamp = new Date().toLocaleTimeString();
        sendNtfy("New Audio from Kiosk", "Tap to listen.", `${APP_URL}/listen`, `view, Listen, ${APP_URL}/listen`);
        res.send("Audio Uploaded");
    } else { res.status(400).send("No file"); }
});

// 3. ENDPOINT: Text from iPad (NEW)
app.post('/send-text', (req, res) => {
    const { text } = req.body;
    if(text) {
        sendNtfy("Message from Home", text, APP_URL, "");
        status.message = "Message Sent!";
        res.send("Sent");
    } else {
        res.status(400).send("Empty");
    }
});

// 4. ENDPOINT: Listen
app.get('/listen', (req, res) => {
    const filePath = path.join(UPLOAD_PATH, 'latest_msg.wav');
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'audio/wav');
        res.sendFile(filePath);
    } else { res.status(404).send("No audio found"); }
});

// 5. ENDPOINT: Status
app.get('/status', (req, res) => { res.json(status); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('Server started on port ' + PORT); });
