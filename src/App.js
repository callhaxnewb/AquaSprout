import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Droplets, Sun, Cloud, CloudRain, Battery, Zap, Clock, Calendar, Power, PauseCircle } from 'lucide-react';
import './App.css'; // <-- Import the new CSS file

// Plant configurations with realistic moisture behavior
const plantConfigs = {
  'Cabbage': { optimalMin: 60, optimalMax: 80, decayRate: 0.15, waterAbsorption: 25 },
  'Jade Plant': { optimalMin: 30, optimalMax: 50, decayRate: 0.05, waterAbsorption: 15 },
  'Aloe Vera': { optimalMin: 20, optimalMax: 40, decayRate: 0.03, waterAbsorption: 12 },
  'Tomato': { optimalMin: 65, optimalMax: 85, decayRate: 0.20, waterAbsorption: 30 },
  'Mint': { optimalMin: 70, optimalMax: 90, decayRate: 0.25, waterAbsorption: 35 },
  'Rosemary': { optimalMin: 35, optimalMax: 55, decayRate: 0.08, waterAbsorption: 18 },
};

const initialPlants = [
  { id: 1, name: 'Cabbage', moisture: 72, history: [], lastWatered: Date.now() - 3600000 },
  { id: 2, name: 'Jade Plant', moisture: 38, history: [], lastWatered: Date.now() - 7200000 },
  { id: 3, name: 'Aloe Vera', moisture: 28, history: [], lastWatered: Date.now() - 10800000 },
  { id: 4, name: 'Tomato', moisture: 75, history: [], lastWatered: Date.now() - 1800000 },
  { id: 5, name: 'Mint', moisture: 82, history: [], lastWatered: Date.now() - 900000 },
  { id: 6, name: 'Rosemary', moisture: 42, history: [], lastWatered: Date.now() - 5400000 },
];

// Generate 24-hour history for each plant
initialPlants.forEach(plant => {
  let currentMoisture = plant.moisture;
  for (let i = 24; i >= 0; i--) {
    plant.history.push({
      time: `${i}h`,
      moisture: Math.max(10, Math.min(100, currentMoisture + (Math.random() - 0.3) * 5)),
      timestamp: Date.now() - i * 3600000
    });
  }
});

const App = () => {
  const [plants, setPlants] = useState(initialPlants);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [rainwaterLevel, setRainwaterLevel] = useState(68);
  const [solarCharge, setSolarCharge] = useState(87);
  const [waterSaved, setWaterSaved] = useState(25);
  const [autoWatering, setAutoWatering] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Kolkata&forecast_days=5'
        );
        const data = await response.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          code: data.current.weather_code
        });
        const forecastData = data.daily.time.map((date, idx) => ({
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          tempMax: Math.round(data.daily.temperature_2m_max[idx]),
          tempMin: Math.round(data.daily.temperature_2m_min[idx]),
          code: data.daily.weather_code[idx]
        }));
        setForecast(forecastData);
      } catch (error) {
        console.error('Weather fetch failed:', error);
        // Fallback data
        setWeather({ temp: 28, humidity: 45, wind: 9, code: 0 });
        setForecast([
          { day: 'Mon', tempMax: 30, tempMin: 22, code: 0 },
          { day: 'Tue', tempMax: 32, tempMin: 24, code: 1 },
          { day: 'Wed', tempMax: 29, tempMin: 21, code: 3 },
          { day: 'Thu', tempMax: 27, tempMin: 20, code: 61 },
          { day: 'Fri', tempMax: 28, tempMin: 21, code: 2 },
        ]);
      }
    };
    fetchWeather();
  }, []);

  // Realistic moisture simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      let waterUsed = 0;
      setPlants(prevPlants =>
        prevPlants.map(plant => {
          const config = plantConfigs[plant.name];
          const tempFactor = weather ? (weather.temp - 20) / 30 : 0.3;
          const humidityFactor = weather ? (100 - weather.humidity) / 100 : 0.5;
          const envFactor = (tempFactor + humidityFactor) / 2;
          const decay = config.decayRate * envFactor * 0.5;
          let newMoisture = plant.moisture - decay;

          if (autoWatering && !vacationMode && newMoisture < config.optimalMin) {
            newMoisture = Math.min(100, plant.moisture + config.waterAbsorption);
            plant.lastWatered = currentTime;
            setWaterSaved(prev => prev + 0.5);
            waterUsed += 5;
          } else if (vacationMode && newMoisture < 25) {
            newMoisture = Math.min(100, plant.moisture + config.waterAbsorption * 0.6);
            plant.lastWatered = currentTime;
            waterUsed += 3;
          }

          newMoisture = Math.max(5, Math.min(100, newMoisture));
          const newHistory = [...plant.history.slice(-23), { time: '0h', moisture: newMoisture, timestamp: currentTime }];
          
          let status = 'Healthy';
          if (newMoisture < config.optimalMin - 10) status = 'Needs Water';
          else if (newMoisture < config.optimalMin) status = 'Water Soon';
          else if (newMoisture > config.optimalMax) status = 'Too Wet';
          
          return { ...plant, moisture: newMoisture, history: newHistory, status };
        })
      );

      if (waterUsed > 0) {
        setRainwaterLevel(prev => Math.max(0, prev - waterUsed));
      }
      
      setRainwaterLevel(prev => {
        const isRaining = weather && ((weather.code >= 51 && weather.code <= 67) || (weather.code >= 80 && weather.code <= 82) || (weather.code >= 95 && weather.code <= 99));
        return isRaining ? Math.min(100, prev + 0.3) : prev;
      });

      setSolarCharge(prev => {
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour <= 18;
        const systemUsage = autoWatering ? 0.2 : 0.1;
        return isDay ? Math.max(20, Math.min(100, prev + 0.5 - systemUsage)) : Math.max(20, prev - systemUsage);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [weather, autoWatering, vacationMode]);

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun className="weather-icon" />;
    if (code <= 3) return <Cloud className="weather-icon" />;
    return <CloudRain className="weather-icon" />;
  };

  const waterAllPlants = () => {
    const totalWaterUsed = plants.length * 5;
    setPlants(prevPlants =>
      prevPlants.map(plant => {
        const config = plantConfigs[plant.name];
        return { ...plant, moisture: Math.min(100, plant.moisture + config.waterAbsorption), lastWatered: Date.now() };
      })
    );
    setWaterSaved(prev => prev + 3);
    setRainwaterLevel(prev => Math.max(0, prev - totalWaterUsed));
  };

  const waterUsageData = plants.map(plant => ({ name: plant.name.substring(0, 3), usage: Math.round((100 - plant.moisture) * 0.5) }));

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}><Droplets size={32} style={{ marginRight: '12px' }} />AquaSprout Dashboard</h1>
      </header>
      <div style={styles.mainGrid}>
        {/* LEFT SIDEBAR */}
        <aside style={styles.leftSidebar}>
          {weather && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Delhi Weather</h3>
              <div style={styles.weatherCurrent}>{getWeatherIcon(weather.code)}<div style={styles.tempLarge}>{weather.temp}°C</div></div>
              <div style={styles.weatherDetails}><div>💧 Humidity: {weather.humidity}%</div><div>💨 Wind: {weather.wind} km/h</div></div>
            </div>
          )}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>5-Day Forecast</h3>
            <div style={styles.forecastGrid}>
              {forecast.map((day, idx) => (
                <div key={idx} style={styles.forecastDay}>
                  <div style={styles.forecastDayName}>{day.day}</div>
                  {getWeatherIcon(day.code)}
                  <div style={styles.forecastTemp}>{day.tempMax}°</div>
                  <div style={styles.forecastTempMin}>{day.tempMin}°</div>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><Droplets size={18} style={{ marginRight: '8px' }} />Rainwater Tank</h3>
            <div style={styles.gaugeContainer}><div style={styles.gauge}><div style={{...styles.gaugeFill, height: `${rainwaterLevel}%`}} /></div><div style={styles.gaugeLabel}>{Math.round(rainwaterLevel)}%</div></div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><Battery size={18} style={{ marginRight: '8px' }} />Solar System</h3>
            <div style={styles.solarBar}><div style={{...styles.solarFill, width: `${solarCharge}%`}} /></div>
            <div style={styles.solarLabel}>{Math.round(solarCharge)}% Charged</div>
          </div>
          {/* Adjusted minHeight for water saved card */}
          <div style={{ ...styles.card, ...styles.waterSavedCardAdjusted }}> {/* Apply a specific style for adjustment */}
            <h3 style={styles.cardTitle}>Water Saved</h3>
            <div style={styles.metricLarge}>{Math.round(waterSaved)} L</div><div style={styles.metricSubtext}>This Month</div>
          </div>
        </aside>
        {/* CENTER CONTENT */}
        <main style={styles.centerContent}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Your Plants</h3>
            <div style={styles.plantGrid}>
              {plants.map(plant => {
                const config = plantConfigs[plant.name];
                const moistureColor = plant.moisture < config.optimalMin - 10 ? '#e74c3c' : plant.moisture < config.optimalMin ? '#f39c12' : plant.moisture > config.optimalMax ? '#3498db' : '#2ecc71';
                const circumference = 2 * Math.PI * 35;
                const offset = circumference - (plant.moisture / 100) * circumference;
                return (
                  <div key={plant.id} style={{ ...styles.plantCard, border: selectedPlant?.id === plant.id ? '2px solid #3498db' : '2px solid #2d3748' }} onClick={() => setSelectedPlant(plant)}>
                    <h4 style={styles.plantName}>{plant.name}</h4>
                    <svg width="90" height="90" style={styles.circleProgress}>
                      <circle cx="45" cy="45" r="35" fill="none" stroke="#2d3748" strokeWidth="8" />
                      <circle cx="45" cy="45" r="35" fill="none" stroke={moistureColor} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 45 45)" />
                      <text x="45" y="50" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">{Math.round(plant.moisture)}%</text>
                    </svg>
                    <div style={{ ...styles.plantStatus, color: moistureColor }}>{plant.status}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedPlant && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>{selectedPlant.name} - 24h Moisture Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={selectedPlant.history}>
                  <defs><linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/><stop offset="95%" stopColor="#3498db" stopOpacity={0.1}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" /><XAxis dataKey="time" stroke="#718096" /><YAxis stroke="#718096" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748' }} labelStyle={{ color: '#fff' }} />
                  <Area type="monotone" dataKey="moisture" stroke="#3498db" fillOpacity={1} fill="url(#moistureGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Water Needs Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={waterUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" /><XAxis dataKey="name" stroke="#718096" /><YAxis stroke="#718096" />
                <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748' }} labelStyle={{ color: '#fff' }} />
                <Bar dataKey="usage" fill="#3498db" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </main>
        {/* RIGHT SIDEBAR */}
        <aside style={styles.rightSidebar}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Quick Controls</h3>
            <div style={styles.controlRow}>
              <div style={styles.controlLabel}><Power size={18} /><span>Auto-Watering</span></div>
              <label className="switch">
                <input type="checkbox" checked={autoWatering} onChange={(e) => setAutoWatering(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            <div style={styles.controlRow}>
              <div style={styles.controlLabel}><PauseCircle size={18} /><span>Vacation Mode</span></div>
              <label className="switch">
                <input type="checkbox" checked={vacationMode} onChange={(e) => setVacationMode(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            <button style={styles.waterButton} onClick={waterAllPlants}><Droplets size={20} />Water All Now</button>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}><Zap size={18} style={{ marginRight: '8px' }} />AI Insights</h3>
            <div style={styles.aiInsight}>
              {vacationMode ? (<><div style={styles.alertIcon}>🏖️</div><p>Vacation mode active. Emergency watering only when moisture drops below 25%.</p></>) : 
               weather && weather.humidity > 70 ? (<><div style={styles.alertIcon}>⚠️</div><p>High humidity detected. Watering frequency automatically reduced to prevent root rot.</p></>) : 
               (<><div style={styles.alertIcon}>✅</div><p>All systems optimal. Your plants are thriving with smart watering schedules.</p></>)}
            </div>
          </div>
          {/* System Status - Adjusted gap and minHeight slightly */}
          <div style={{ ...styles.card, ...styles.systemStatusAdjusted }}> 
            <h3 style={styles.cardTitle}>System Status</h3>
            <div style={styles.statusGridAdjusted}> {/* Use a specific style for adjusted status grid */}
              <div style={styles.statusItem}><Clock size={16} /><div><div style={styles.statusLabel}>Next Watering</div><div style={styles.statusValue}>2.5 hrs</div></div></div>
              <div style={styles.statusItem}><Calendar size={16} /><div><div style={styles.statusLabel}>Last Maintenance</div><div style={styles.statusValue}>3 days ago</div></div></div>
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Moisture Overview</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={plants.map(p => ({ name: p.name.substring(0, 3), moisture: p.moisture }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" /><XAxis dataKey="name" stroke="#718096" /><YAxis stroke="#718096" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748' }} labelStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="moisture" stroke="#2ecc71" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </aside>
      </div>
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0f1419',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
    padding: '20px 40px',
    borderBottom: '2px solid #2d3748',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    color: '#fff',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 300px',
    gap: '20px',
    padding: '20px',
    maxWidth: '1800px',
    margin: '0 auto',
    alignItems: 'start',
  },
  leftSidebar: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' },
  centerContent: { display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' },
  rightSidebar: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' },
  card: {
    background: 'linear-gradient(135deg, #1a202c 0%, #1e2530 100%)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2d3748',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  cardTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center' },
  weatherCurrent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' },
  weatherIcon: { width: '48px', height: '48px', color: '#f39c12' },
  tempLarge: { fontSize: '42px', fontWeight: '700', color: '#fff' },
  weatherDetails: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#a0aec0' },
  forecastGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' },
  forecastDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px', background: '#0f1419', borderRadius: '8px' },
  forecastDayName: { fontSize: '12px', color: '#718096', fontWeight: '500' },
  forecastTemp: { fontSize: '14px', fontWeight: '600', color: '#fff' },
  forecastTempMin: { fontSize: '12px', color: '#718096' },
  gaugeContainer: { display: 'flex', alignItems: 'center', gap: '16px' },
  gauge: { width: '40px', height: '120px', background: '#0f1419', borderRadius: '20px', position: 'relative', overflow: 'hidden', border: '2px solid #2d3748' },
  gaugeFill: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #3498db, #2ecc71)', borderRadius: '20px', transition: 'height 0.5s ease' },
  gaugeLabel: { fontSize: '24px', fontWeight: '700', color: '#3498db' },
  solarBar: { width: '100%', height: '24px', background: '#0f1419', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px', border: '2px solid #2d3748' },
  solarFill: { height: '100%', background: 'linear-gradient(to right, #f39c12, #f1c40f)', transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(243, 156, 18, 0.5)' },
  solarLabel: { fontSize: '14px', color: '#a0aec0', textAlign: 'center' },
  metricLarge: { fontSize: '48px', fontWeight: '700', color: '#3498db', textAlign: 'center', marginBottom: '8px' },
  metricSubtext: { fontSize: '14px', color: '#718096', textAlign: 'center' },
  plantGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  plantCard: { background: '#0f1419', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid #2d3748' },
  plantName: { margin: 0, fontSize: '16px', fontWeight: '600', color: '#e2e8f0' },
  circleProgress: { transform: 'rotate(0deg)' },
  plantStatus: { fontSize: '13px', fontWeight: '500' },
  controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #2d3748' },
  controlLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#e2e8f0' },
  waterButton: {
    width: '100%',
    padding: '14px',
    marginTop: '16px',
    background: 'linear-gradient(135deg, #3498db, #2ecc71)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
  },
  aiInsight: { background: '#0f1419', borderRadius: '8px', padding: '16px', fontSize: '14px', lineHeight: '1.6', color: '#a0aec0' },
  alertIcon: { fontSize: '24px', marginBottom: '8px' },
  statusGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '120px',
  },
  statusItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0f1419', borderRadius: '8px' },
  statusLabel: { fontSize: '12px', color: '#718096' },
  statusValue: { fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  
  // New styles for alignment adjustments
  waterSavedCardAdjusted: {
    minHeight: '160px', // Adjusted to align with typical chart card height
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center', // Vertically center content
  },
  systemStatusAdjusted: {
    minHeight: '160px', // Adjusted to align with typical chart card height
  },
  statusGridAdjusted: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px', // Slightly reduced gap
    justifyContent: 'center',
    height: '100%', // Ensure it takes full height of parent to help alignment
  }
};

export default App;
