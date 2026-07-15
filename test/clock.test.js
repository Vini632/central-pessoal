"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

/**
 * Setup the Clock module with mocked DOM elements for update/render methods.
 * @param {object} extraMocks - Extra sandbox mocks (for document, fetch, Settings, etc.)
 */
function setupClock(extraMocks = {}) {
  const Clock = loadModule("js/modules/clock.js", extraMocks);

  // Replace the timer to avoid side effects
  Clock.init = function () {
    this.update();
  };

  return Clock;
}

describe("Clock Module - weatherCodeToDesc", () => {
  let c;
  beforeEach(() => {
    c = setupClock();
  });

  it('returns "Céu limpo" for code 0', () => {
    assert.strictEqual(c.weatherCodeToDesc(0), "Céu limpo");
  });

  it('returns "Parcialmente nublado" for codes 1-3', () => {
    assert.strictEqual(c.weatherCodeToDesc(1), "Parcialmente nublado");
    assert.strictEqual(c.weatherCodeToDesc(2), "Parcialmente nublado");
    assert.strictEqual(c.weatherCodeToDesc(3), "Parcialmente nublado");
  });

  it('returns "Nevoa" for codes 4-48', () => {
    assert.strictEqual(c.weatherCodeToDesc(4), "Nevoa");
    assert.strictEqual(c.weatherCodeToDesc(10), "Nevoa");
    assert.strictEqual(c.weatherCodeToDesc(48), "Nevoa");
  });

  it('returns "Garoa" for codes 50-57', () => {
    assert.strictEqual(c.weatherCodeToDesc(50), "Garoa");
    assert.strictEqual(c.weatherCodeToDesc(55), "Garoa");
    assert.strictEqual(c.weatherCodeToDesc(57), "Garoa");
  });

  it('returns "Chuva" for codes 60-67', () => {
    assert.strictEqual(c.weatherCodeToDesc(60), "Chuva");
    assert.strictEqual(c.weatherCodeToDesc(65), "Chuva");
    assert.strictEqual(c.weatherCodeToDesc(67), "Chuva");
  });

  it('returns "Neve" for codes 70-77', () => {
    assert.strictEqual(c.weatherCodeToDesc(70), "Neve");
    assert.strictEqual(c.weatherCodeToDesc(75), "Neve");
    assert.strictEqual(c.weatherCodeToDesc(77), "Neve");
  });

  it('returns "Pancadas de chuva" for codes 80-82', () => {
    assert.strictEqual(c.weatherCodeToDesc(80), "Pancadas de chuva");
    assert.strictEqual(c.weatherCodeToDesc(82), "Pancadas de chuva");
  });

  it('returns "Pancadas de neve" for codes 85-86', () => {
    assert.strictEqual(c.weatherCodeToDesc(85), "Pancadas de neve");
    assert.strictEqual(c.weatherCodeToDesc(86), "Pancadas de neve");
  });

  it('returns "Trovoadas" for codes >= 95', () => {
    assert.strictEqual(c.weatherCodeToDesc(95), "Trovoadas");
    assert.strictEqual(c.weatherCodeToDesc(99), "Trovoadas");
  });

  it("handles negative codes as partially cloudy (code <= 3)", () => {
    // -1 <= 3 is true, so it returns the first matching range
    assert.strictEqual(c.weatherCodeToDesc(-1), "Parcialmente nublado");
  });
});

describe("Clock Module - weatherCodeToIcon", () => {
  let c;
  beforeEach(() => {
    c = setupClock();
  });

  it("returns ☀️ for code 0", () => {
    assert.strictEqual(c.weatherCodeToIcon(0), "☀️");
  });

  it("returns ⛅ for codes 1-3", () => {
    assert.strictEqual(c.weatherCodeToIcon(1), "⛅");
    assert.strictEqual(c.weatherCodeToIcon(3), "⛅");
  });

  it("returns 🌫️ for codes 4-48", () => {
    assert.strictEqual(c.weatherCodeToIcon(10), "🌫️");
    assert.strictEqual(c.weatherCodeToIcon(48), "🌫️");
  });

  it("returns 🌦️ for codes 50-57", () => {
    assert.strictEqual(c.weatherCodeToIcon(55), "🌦️");
  });

  it("returns 🌧️ for codes 60-67", () => {
    assert.strictEqual(c.weatherCodeToIcon(65), "🌧️");
  });

  it("returns ❄️ for codes 70-77", () => {
    assert.strictEqual(c.weatherCodeToIcon(75), "❄️");
  });

  it("returns 🌦️ for codes 80-82", () => {
    assert.strictEqual(c.weatherCodeToIcon(80), "🌦️");
  });

  it("returns 🌨️ for codes 85-86", () => {
    assert.strictEqual(c.weatherCodeToIcon(85), "🌨️");
  });

  it("returns ⛈️ for codes >= 95", () => {
    assert.strictEqual(c.weatherCodeToIcon(95), "⛈️");
    assert.strictEqual(c.weatherCodeToIcon(100), "⛈️");
  });
});

describe("Clock Module - renderForecast", () => {
  let c;
  let containerHtml;

  beforeEach(() => {
    containerHtml = "";
    c = setupClock({
      document: {
        getElementById: (id) => {
          if (id === "weather-forecast") {
            return {
              _html: "",
              set innerHTML(v) {
                containerHtml = v || "";
                containerHtml = v;
              },
              get innerHTML() {
                return containerHtml;
              },
            };
          }
          // For update() calls that may also access clock-time/clock-date
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
  });

  it("renders nothing when daily is null", () => {
    c.renderForecast(null);
    assert.strictEqual(containerHtml, "");
  });

  it("renders nothing when daily has no time", () => {
    c.renderForecast({});
    assert.strictEqual(containerHtml, "");
  });

  it("skips day 0 (today) and renders up to 5 days", () => {
    const daily = {
      time: ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"],
      temperature_2m_max: [30, 31, 29, 28, 27, 26],
      temperature_2m_min: [20, 21, 19, 18, 17, 16],
      weathercode: [0, 1, 2, 3, 61, 80],
    };
    c.renderForecast(daily);
    // Today is skipped, so we should have 5 forecast-day divs
    const dayCount = (containerHtml.match(/forecast-day/g) || []).length;
    assert.strictEqual(dayCount, 5);
    // Check that temps are rendered
    assert.ok(containerHtml.includes("31°"), "should include max temp for day 1");
    assert.ok(containerHtml.includes("21°"), "should include min temp for day 1");
  });

  it("handles fewer than 5 days gracefully", () => {
    const daily = {
      time: ["2026-07-14", "2026-07-15"],
      temperature_2m_max: [30, 31],
      temperature_2m_min: [20, 21],
      weathercode: [0, 1],
    };
    c.renderForecast(daily);
    const dayCount = (containerHtml.match(/forecast-day/g) || []).length;
    assert.strictEqual(dayCount, 1); // only day 1 (today skipped)
  });

  it("includes weather icons in forecast", () => {
    const daily = {
      time: ["2026-07-14", "2026-07-15", "2026-07-16"],
      temperature_2m_max: [30, 31, 29],
      temperature_2m_min: [20, 21, 19],
      weathercode: [0, 1, 95],
    };
    c.renderForecast(daily);
    // Day 0 (today) is skipped — code 0 (☀️) won't appear
    // Day 1 has code 1 (⛅), Day 2 has code 95 (⛈️)
    assert.ok(containerHtml.includes("⛅"), "should have partly cloudy icon");
    assert.ok(containerHtml.includes("⛈️"), "should have thunderstorm icon");
  });

  it("shows weekday names in Portuguese abbreviation", () => {
    const daily = {
      time: ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"],
      temperature_2m_max: [30, 31, 29, 28],
      temperature_2m_min: [20, 21, 19, 18],
      weathercode: [0, 0, 0, 0],
    };
    c.renderForecast(daily);
    // renderForecast uses new Date().getDay() for weekday labels,
    // so the actual names vary by current day. Just check that
    // SOME Portuguese weekday abbreviation appears.
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    assert.ok(
      weekdays.some((d) => containerHtml.includes(d)),
      "should include a Portuguese weekday abbreviation",
    );
    assert.ok(containerHtml.includes("forecast-name"), "should have forecast-name class");
  });
});

describe("Clock Module - update", () => {
  let c;
  let domElements;

  beforeEach(() => {
    domElements = {
      "clock-time": { textContent: "" },
      "clock-date": { textContent: "" },
    };
    c = setupClock({
      document: {
        getElementById: (id) => domElements[id] || null,
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
  });

  it("sets clock-time with formatted time", () => {
    c.update();
    // Should be HH:MM format (Brazilian 24h format)
    const match = /^\d{2}:\d{2}$/.test(domElements["clock-time"].textContent);
    assert.ok(match, `time should be HH:MM format, got: "${domElements["clock-time"].textContent}"`);
  });

  it("sets clock-date with capitalized weekday, day, month, year", () => {
    c.update();
    const dateStr = domElements["clock-date"].textContent;
    assert.ok(dateStr.length > 10, `date should be a long formatted string, got: "${dateStr}"`);
    // Should start with uppercase letter (capitalized weekday)
    assert.ok(/^[A-ZÀ-Ú]/.test(dateStr), `date should start with uppercase, got: "${dateStr}"`);
    // Should contain a 4-digit year
    assert.ok(/\d{4}/.test(dateStr), `date should contain 4-digit year, got: "${dateStr}"`);
  });
});

describe("Clock Module - fetchWeather with saved city", () => {
  let c;
  let fetchCalls;

  beforeEach(() => {
    fetchCalls = [];
    c = setupClock({
      Settings: {
        get: (key) => (key === "weatherCity" ? "São Paulo" : null),
      },
      document: {
        getElementById: (_id) => ({
          textContent: "",
          set innerHTML(v) {},
          get innerHTML() {
            return "";
          },
        }),
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async (url) => {
        fetchCalls.push(url);
        // Return different data based on URL
        if (url.includes("nominatim.openstreetmap.org/search")) {
          return {
            ok: true,
            json: async () => [{ lat: "-23.5505", lon: "-46.6333" }],
          };
        }
        if (url.includes("api.open-meteo.com")) {
          return {
            ok: true,
            json: async () => ({
              current_weather: { temperature: 25, weathercode: 0 },
              daily: {
                time: ["2026-07-14", "2026-07-15", "2026-07-16"],
                temperature_2m_max: [26, 27, 25],
                temperature_2m_min: [18, 19, 17],
                weathercode: [0, 1, 2],
              },
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      },
    });
  });

  it("fetches geocoding for saved city", async () => {
    await c.fetchWeather();
    const geoCall = fetchCalls.find((u) => u.includes("nominatim.openstreetmap.org/search"));
    assert.ok(geoCall, "should call geocoding API for saved city");
    // City is URL-encoded by encodeURIComponent
    assert.ok(geoCall.includes("q="), "should include query param");
    assert.ok(geoCall.includes("nominatim"), "should be nominatim API");
  });

  it("fetches forecast after geocoding", async () => {
    await c.fetchWeather();
    const forecastCall = fetchCalls.find((u) => u.includes("api.open-meteo.com"));
    assert.ok(forecastCall, "should call forecast API");
    assert.ok(forecastCall.includes("-23.5505"), "should include latitude");
    assert.ok(forecastCall.includes("-46.6333"), "should include longitude");
  });
});

describe("Clock Module - fetchWeather fallback to IP", () => {
  let c;
  let fetchCalls;

  beforeEach(() => {
    fetchCalls = [];
    c = setupClock({
      Settings: { get: () => null },
      navigator: {
        geolocation: {
          getCurrentPosition: (resolve, reject) => reject(new Error("blocked")),
        },
      },
      document: {
        getElementById: (_id) => ({
          textContent: "",
          set innerHTML(v) {},
          get innerHTML() {
            return "";
          },
        }),
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async (url) => {
        fetchCalls.push(url);
        if (url.includes("ip-api.com")) {
          return {
            ok: true,
            json: async () => ({ lat: -23.5505, lon: -46.6333, city: "São Paulo" }),
          };
        }
        if (url.includes("api.open-meteo.com")) {
          return {
            ok: true,
            json: async () => ({
              current_weather: { temperature: 25, weathercode: 0 },
              daily: {
                time: ["2026-07-14", "2026-07-15"],
                temperature_2m_max: [26, 27],
                temperature_2m_min: [18, 19],
                weathercode: [0, 1],
              },
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      },
    });
  });

  it("falls back to IP geolocation when no saved city and geolocation fails", async () => {
    await c.fetchWeather();
    const ipCall = fetchCalls.find((u) => u.includes("ip-api.com"));
    assert.ok(ipCall, "should call IP API as fallback");
  });

  it("renders weather after IP fallback", async () => {
    await c.fetchWeather();
    const forecastCall = fetchCalls.find((u) => u.includes("api.open-meteo.com"));
    assert.ok(forecastCall, "should call forecast API after IP geolocation");
  });
});

describe("Clock Module - fetchWeather all fallbacks fail", () => {
  let c;
  let domTemp, domDesc, domForecast;

  beforeEach(() => {
    domTemp = { textContent: "" };
    domDesc = { textContent: "" };
    domForecast = {
      _html: "",
      set innerHTML(v) {
        this._html = v || "";
      },
      get innerHTML() {
        return this._html;
      },
    };

    c = setupClock({
      Settings: { get: () => null },
      navigator: {
        geolocation: {
          getCurrentPosition: (resolve, reject) => reject(new Error("blocked")),
        },
      },
      document: {
        getElementById: (id) => {
          if (id === "weather-temp") return domTemp;
          if (id === "weather-desc") return domDesc;
          if (id === "weather-forecast") return domForecast;
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async (url) => {
        if (url.includes("ip-api.com")) {
          return { ok: false, json: async () => ({}) };
        }
        return { ok: false, json: async () => ({}) };
      },
    });
  });

  it("shows fallback text when all weather sources fail", async () => {
    await c.fetchWeather();
    assert.strictEqual(domTemp.textContent, "--°C");
    assert.strictEqual(domDesc.textContent, "Clima indisponível");
    assert.strictEqual(domForecast._html, "");
  });
});

describe("Clock Module - fetchForecast", () => {
  let c;
  let domTemp, domDesc, domIcon, domCity, domForecast;

  beforeEach(() => {
    domTemp = { textContent: "" };
    domDesc = { textContent: "" };
    domIcon = { textContent: "" };
    domCity = { textContent: "" };
    domForecast = {
      _html: "",
      set innerHTML(v) {
        this._html = v || "";
      },
      get innerHTML() {
        return this._html;
      },
    };

    c = setupClock({
      document: {
        getElementById: (id) => {
          if (id === "weather-temp") return domTemp;
          if (id === "weather-desc") return domDesc;
          if (id === "weather-icon") return domIcon;
          if (id === "weather-city") return domCity;
          if (id === "weather-forecast") return domForecast;
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          current_weather: { temperature: 28, weathercode: 2 },
          daily: {
            time: ["2026-07-14", "2026-07-15"],
            temperature_2m_max: [30, 28],
            temperature_2m_min: [20, 18],
            weathercode: [0, 1],
          },
        }),
      }),
    });
  });

  it("updates current weather elements", async () => {
    await c.fetchForecast("-23.55", "-46.63", "São Paulo");
    assert.strictEqual(domTemp.textContent, "28°C");
    assert.strictEqual(domDesc.textContent, "Parcialmente nublado");
    assert.strictEqual(domIcon.textContent, "⛅");
    assert.strictEqual(domCity.textContent, "São Paulo");
  });

  it("does not override city when not provided", async () => {
    await c.fetchForecast("-23.55", "-46.63");
    assert.strictEqual(domCity.textContent, ""); // unchanged
  });

  it("renders forecast HTML", async () => {
    await c.fetchForecast("-23.55", "-46.63");
    assert.ok(domForecast._html.includes("forecast-day"), "should render forecast days");
    // Day 0 (today) is skipped — max=30 and min=20 won't appear
    // Day 1 has max=28, min=18
    assert.ok(domForecast._html.includes("28°"), "should include max temp for day 1");
    assert.ok(domForecast._html.includes("18°"), "should include min temp for day 1");
  });
});

describe("Clock Module - fetchCity", () => {
  let c;
  let domCity;

  beforeEach(() => {
    domCity = { textContent: "" };
  });

  it("sets city from nominatim response", async () => {
    c = setupClock({
      document: {
        getElementById: (id) => {
          if (id === "weather-city") return domCity;
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          address: { city: "São Paulo", country: "Brazil" },
        }),
      }),
    });
    await c.fetchCity("-23.55", "-46.63");
    assert.strictEqual(domCity.textContent, "São Paulo");
  });

  it("falls back to town/city/village when city is missing", async () => {
    c = setupClock({
      document: {
        getElementById: (id) => {
          if (id === "weather-city") return domCity;
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async () => ({
        ok: true,
        json: async () => ({
          address: { town: "Guarulhos" },
        }),
      }),
    });
    await c.fetchCity("-23.55", "-46.63");
    assert.strictEqual(domCity.textContent, "Guarulhos");
  });

  it('shows "Local desconhecido" when fetch fails', async () => {
    c = setupClock({
      document: {
        getElementById: (id) => {
          if (id === "weather-city") return domCity;
          return { textContent: "" };
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      fetch: async () => {
        throw new Error("Network error");
      },
    });
    await c.fetchCity("-23.55", "-46.63");
    assert.strictEqual(domCity.textContent, "Local desconhecido");
  });
});
