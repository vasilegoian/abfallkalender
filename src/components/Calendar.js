import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import deLocale from '@fullcalendar/core/locales/de';

const REACT_APP_PUBLIC_KEY = process.env.REACT_APP_PUBLIC_KEY;

const Calendar = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch the events from a JSON file or API
    fetch('/trash-pickup-dates.json')
      .then(response => response.json())
      .then(data => setEvents(data));
  }, []);

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(swReg => {
        swReg.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setIsSubscribed(true);
          }
        }).catch(error => {
          console.error('Error checking subscription status:', error);
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        console.log(REACT_APP_PUBLIC_KEY);
        const swReg = await navigator.serviceWorker.register('/serviceWorker.js');
        console.log('Service Worker is registered', swReg);

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(REACT_APP_PUBLIC_KEY)
          });
          console.log('User is subscribed:', subscription);

          await fetch('/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
          });

          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('Failed to subscribe the user: ', error);
      }
    } else {
      console.error('Service Worker or Push Manager not supported in this browser.');
    }
  };

  return (
    <div>
        {!isSubscribed && (
            <button onClick={handleSubscribe} className='enable-notifications'>
            🔔 Enable Notifications
            </button>
        )}
        <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        locales={[deLocale]}
        locale='de'
        />
        <div className='legend-wrap'>
            <table className='legend'>
                <tr>
                    <th className='bio'>BIO</th>
                    <td>Bioabfall</td>
                </tr>
                <tr>
                    <th className='gm'>GM</th>
                    <td>Grüngutsammlung</td>
                </tr>
                <tr>
                    <th className='gs'>GS</th>
                    <td>Gelber Sack</td>
                </tr>
                <tr>
                    <th className='hm'>HM</th>
                    <td>Hausmüll</td>
                </tr>
                <tr>
                    <th className='pt'>PT</th>
                    <td>Papiertonne</td>
                </tr>
            </table>
            <div>Die mit * markierten Daten wurden aufgrund eines Urlaubs verschoben.</div>
        </div>
    </div>
  );
};

export default Calendar;

function urlBase64ToUint8Array(base64String) {
const padding = '='.repeat((4 - base64String.length % 4) % 4);
const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

const rawData = window.atob(base64);
const outputArray = new Uint8Array(rawData.length);

for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
}
return outputArray;
}