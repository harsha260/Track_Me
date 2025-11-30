const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(express.static('public'));

// DATA STORAGE (In memory - resets if server restarts)
let status = {
  message: "Waiting for updates...",
  sender: "System",
  distance: "Unknown",
  isAlert: false,
  timestamp: new Date().toLocaleTimeString()
};

// 1. ENDPOINT: Receive Data from your Phone
// You will trigger this via iPhone Shortcuts or Android Tasker
app.post('/update', (req, res) => {
  const { msg, dist, alert } = req.body;
  
  if (msg) status.message = msg;
  if (dist) status.distance = dist;
  if (alert === "true") {
      status.isAlert = true;
      status.message = "🚨 ATTENTION 🚨";
  } else if (alert === "false") {
      status.isAlert = false;
  }
  
  status.timestamp = new Date().toLocaleTimeString();
  status.sender = "Mobile";
  
  console.log("Update received:", status);
  res.send("Updated");
});

// 2. ENDPOINT: Give Data to iPad
app.get('/status', (req, res) => {
  res.json(status);
});

// Start
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
