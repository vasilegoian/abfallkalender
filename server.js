const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

const app = express();

// Replace with your own VAPID keys
const REACT_APP_PUBLIC_KEY = process.env.REACT_APP_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const MAILTO = process.env.MAIL

webpush.setVapidDetails(
  'mailto:' + MAILTO,
  REACT_APP_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const mongodb_uri = process.env.MONGODB_URI;

mongoose.connect(mongodb_uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


const subscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

app.use(bodyParser.json());

// Use CORS middleware
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// API route to subscribe to push notifications
app.post('/subscribe', async (req, res) => {
  let subscription = await Subscription.find({
    endpoint: req.body.endpoint,
    keys: {
      p256dh: req.body.keys.p256dh,
      auth: req.body.keys.auth
    }
  });

  if (subscription.length) {
    return res.status(200).json({ message: 'Already subscribed' });
  }
  subscription = new Subscription(req.body);
  await subscription.save();
  res.status(201).json({ message: 'Subscription successful' });
});

// API route to send notifications
app.get('/send-notification', async (req, res) => {

  const notificationTypes = ['pt', 'bio', 'gm', 'hm', 'gs'];
  
  let type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
  
  if (req.query.type) {
    type = req.query.type;
  }

  const subscriptions = await Subscription.find();
  const promises = subscriptions.map(async subscription => {
    await sendNotification(subscription, generateNotification({ className: type, date: 'TEST NOTIFICATION' }));
  });

  Promise.all(promises).then(() => res.sendStatus(200));
});

// The "catchall" handler: for any request that doesn't match an API route or static file, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});



function generateNotification(event) {
  const notification = {};
  switch (event.className) {
    case 'pt':
      notification.icon = '/Blau.svg';
      notification.title = 'Papiertonne';
      notification.body = 'Papiertonne';
      break;
    case 'bio':
      notification.icon = '/Braun.svg';
      notification.title = 'Bioabfall';
      notification.body = 'Bioabfall';
      break;
    case 'gm':
      notification.icon = '/Grün.svg';
      notification.title = 'Grüngutsammlung';
      notification.body = 'Grüngutsammlung';
      break;
    case 'gs':
      notification.icon = '/Gelb.svg';
      notification.title = 'Gelber Sack';
      notification.body = 'Gelber Sack';
      break;
    case 'hm':
      notification.icon = '/Schwarz.svg';
      notification.title = 'Hausmüll';
      notification.body = 'Hausmüll';
      break;
    default:
      notification.icon = '/trash-bin.png';
      notification.title = 'Abfall';
      notification.body = 'Abfall';   
  }


  notification.body += ' • ' + event.date;
  notification.data = {
    url: '/'
  };
  return JSON.stringify(notification);
}

const loadEvents = async () => {
  try {
    const eventsPath = path.join(__dirname, 'build', 'trash-pickup-dates.json');
    const eventsBuffer = await fs.readFile(eventsPath);
    const eventsData = eventsBuffer.toString('utf8');
    return JSON.parse(eventsData);
  } catch (error) {
    console.error('Error loading events:', error);
    return [];
  }
};

const sendNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      console.log('Subscription expired or no longer valid:', subscription.endpoint);
      await Subscription.findOneAndDelete({ endpoint: subscription.endpoint });
    } else {
      console.error('Error sending notification:', error);
    }
  }
};

// Function to send notifications
async function sendScheduledNotifications() {
  const events = await loadEvents();
  
  if (events.length == 0) {
    console.log('No events found');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const notifications = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === tomorrow.toDateString();
  });

  if (notifications.length == 0) {
    console.log('No events tomorrow');
  }

  const promises = [];

  const subscriptions = await Subscription.find();

  subscriptions.forEach(subscription => {
    notifications.forEach(event => {
      sendNotification(subscription, generateNotification(event));
    });
  });

  Promise.all(promises).then(() => console.log('Notifications sent'));
}

// Schedule task to run every day at 20:00
cron.schedule('0 20 * * *', () => {
  console.log('Running scheduled task');
  sendScheduledNotifications();
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
