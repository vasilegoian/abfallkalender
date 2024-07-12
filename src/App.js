import './App.css';
import Calendar from './components/Calendar';
import Impressum from './components/Impressum';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
        <img src='/recycling-truck.png' alt='Abfallkalender Ebersbach' /> <h1>Abfallkalender Ebersbach</h1>
        </header>
        <main>
          <Routes>
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/" element={<Calendar />} />
          </Routes>
        </main>
        <footer>
          <Link to="/">Kalender</Link>&nbsp;&bull;&nbsp;
          <Link to="/impressum">Impressum</Link>
        </footer>
      </div>
    </Router>
  );
}

export default App;
