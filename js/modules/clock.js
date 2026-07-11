const Clock = {
  init() {
    this.update();
    setInterval(() => this.update(), 1000);
    this.fetchWeather();
  },

  update() {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('clock-time').textContent = time;
    document.getElementById('clock-date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
  },

  async fetchWeather() {
    const savedCity = Settings.get('weatherCity');
    if (savedCity) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(savedCity)}&limit=1`);
        const geoData = await geoRes.json();
        if (geoData.length) {
          const { lat, lon } = geoData[0];
          await this.fetchForecast(lat, lon, savedCity);
          return;
        }
      } catch {}
    }

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      const { latitude, longitude } = pos.coords;
      await this.fetchForecast(latitude, longitude);
      this.fetchCity(latitude, longitude);
    } catch {
      try {
        const ipRes = await fetch('https://ip-api.com/json/?fields=lat,lon,city');
        const ipData = await ipRes.json();
        if (ipData.lat) {
          await this.fetchForecast(ipData.lat, ipData.lon, ipData.city);
          return;
        }
      } catch {}
      document.getElementById('weather-temp').textContent = '--°C';
      document.getElementById('weather-desc').textContent = 'Clima indisponível';
      document.getElementById('weather-forecast').innerHTML = '';
    }
  },

  async fetchForecast(lat, lon, city) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
    if (!res.ok) throw new Error('Falha no clima');
    const data = await res.json();

    // Current weather
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;
    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-desc').textContent = this.weatherCodeToDesc(code);
    document.getElementById('weather-icon').textContent = this.weatherCodeToIcon(code);
    if (city) document.getElementById('weather-city').textContent = city;

    // Forecast
    this.renderForecast(data.daily);
  },

  renderForecast(daily) {
    const container = document.getElementById('weather-forecast');
    if (!daily || !daily.time) { container.innerHTML = ''; return; }

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const today = new Date().getDay();
    const weekday = (i) => days[(today + i) % 7];

    container.innerHTML = daily.time.map((dateStr, i) => {
      if (i === 0) return '';
      if (i > 5) return '';
      const max = Math.round(daily.temperature_2m_max[i]);
      const min = Math.round(daily.temperature_2m_min[i]);
      const wc = daily.weathercode[i];
      return `
        <div class="forecast-day">
          <span class="forecast-name">${weekday(i)}</span>
          <span class="forecast-icon">${this.weatherCodeToIcon(wc)}</span>
          <span class="forecast-temps">
            <span class="forecast-max">${max}°</span>
            <span class="forecast-min">${min}°</span>
          </span>
        </div>
      `;
    }).join('');
  },

  async fetchCity(lat, lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || 'Local desconhecido';
      document.getElementById('weather-city').textContent = city;
    } catch {
      document.getElementById('weather-city').textContent = 'Local desconhecido';
    }
  },

  weatherCodeToDesc(code) {
    if (code === 0) return 'Céu limpo';
    if (code <= 3) return 'Parcialmente nublado';
    if (code <= 48) return 'Nevoa';
    if (code <= 57) return 'Garoa';
    if (code <= 67) return 'Chuva';
    if (code <= 77) return 'Neve';
    if (code <= 82) return 'Pancadas de chuva';
    if (code <= 86) return 'Pancadas de neve';
    return 'Trovoadas';
  },

  weatherCodeToIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌦️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '🌨️';
    return '⛈️';
  },
};
