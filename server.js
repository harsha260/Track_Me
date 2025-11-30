const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); 

// --- CONFIGURATION ---
const UPLOAD_PATH = '/tmp/';

// 1. TOPIC
const NTFY_TOPIC = 'harsha_notefs'; 

// 2. APP URL (Removed the trailing slash to fix broken links)
const APP_URL = 'https://track-me-gvug.onrender.com'; 

// Multer Storage Engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_PATH)
  },
  filename: function (req, file, cb) {
    // We overwrite the file every time to save space
    cb(null, 'latest_msg.wav')
  }
})
const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(express.static('public'));

// DATA STORE
let status = {
  message: "Waiting for updates...",
  distance: "Unknown",
  isAlert: false,
  timestamp: new Date().toLocaleTimeString(),
  hasAudio: false
};

// --- HELPER: Send ntfy Notification ---
async function sendNtfyNotification() {
    try {
        await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
            "Tap to listen to the new voice note.", 
            {
                headers: {
                    // FIXED: Removed Emoji from Title to prevent Node.js Header Error
                    'Title': 'New Audio', 
                    'Tags': 'microphone,loudspeaker', // This adds the icons automatically
                    'Click': `${APP_URL}/listen`, 
                    'Actions': `view, Listen, ${APP_URL}/listen` 
                }
            }
        );
        console.log(`✅ Notification sent to ntfy.sh/${NTFY_TOPIC}`);
    } catch (error) {
        // Log the full error to help debugging
        console.error("❌ Notification failed:", error.response ? error.response.data : error.message);
    }
}

// 1. ENDPOINT: Receive Data from Phone
app.post('/update', (req, res) => {
  const { msg, dist, alert } = req.body;
  if (msg) status.message = msg;
  if (dist) status.distance = dist;
  
  if (alert === "true" || alert === true) {
      status.isAlert = true;
      status.message = "🚨 ATTENTION 🚨";
  } else {
      status.isAlert = false;
  }
  status.timestamp = new Date().toLocaleTimeString();
  res.send("Updated");
});

// 2. ENDPOINT: Receive Audio from iPad
app.post('/upload-audio', upload.single('voiceNote'), (req, res) => {
    console.log("🎤 Audio received!"); 
    if (req.file) {
        status.hasAudio = true;
        status.message = "🎤 Message Sent!";
        status.timestamp = new Date().toLocaleTimeString();
        
        // Trigger ntfy
        sendNtfyNotification();

        res.send("Audio Uploaded");
    } else {
        res.status(400).send("No file uploaded");
    }
});

// 3. ENDPOINT: Listen to Audio
app.get('/listen', (req, res) => {
    const filePath = path.join(UPLOAD_PATH, 'latest_msg.wav');
    
    // Check if file exists first
    if (fs.existsSync(filePath)) {
        // Set headers to ensure it plays rather than downloads
        res.setHeader('Content-Type', 'audio/wav');
        res.sendFile(filePath);
    } else {
        res.status(404).send(`
            <html>
                <body style="background:#222; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
                    <h1>No Audio Yet</h1>
                    <p>The family hasn't recorded a message since the last server restart.</p>
                </body>
            </html>
        `);
    }
});

// 4. ENDPOINT: iPad Polling
app.get('/status', (req, res) => {
  res.json(status);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
