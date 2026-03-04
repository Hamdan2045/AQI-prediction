// ─── AQI COLOR HELPER ────────────────────────────────
function getAQIInfo(aqi) {
    if (aqi <= 50)  return { category: 'Good',         color: '#22c55e', bgClass: 'bg-good' }
    if (aqi <= 100) return { category: 'Satisfactory', color: '#84cc16', bgClass: 'bg-satisfactory' }
    if (aqi <= 200) return { category: 'Moderate',     color: '#f59e0b', bgClass: 'bg-moderate' }
    if (aqi <= 300) return { category: 'Poor',         color: '#ef4444', bgClass: 'bg-poor' }
    if (aqi <= 400) return { category: 'Very Poor',    color: '#f97316', bgClass: 'bg-verypoor' }
    return               { category: 'Severe',         color: '#7e0023', bgClass: 'bg-severe' }
}

const CITY_ICONS = {
    'Bengaluru':     '/static/icons/bangalore.png',
    'Chennai':       '/static/icons/chennai.png',
    'Delhi':         '/static/icons/delhi.png',
    'Gwalior':       '/static/icons/gwalior.png',
    'Hyderabad':     '/static/icons/hyderabad-charminar.png',
    'Jaipur':        '/static/icons/jaipur.png',
    'Kolkata':       '/static/icons/kolkata.png',
    'Lucknow':       '/static/icons/lucknow.png',
    'Mumbai':        '/static/icons/mumbai.png',
    'Visakhapatnam': '/static/icons/visakhpatanm.png',
}

// City lat/lng mapped to SVG viewBox 0 0 400 480
// India bounding box roughly lat 8-37, lng 68-97
const CITY_SVG_POS = {
    'Delhi':         { x: 175, y:  95 },
    'Jaipur':        { x: 140, y: 120 },
    'Lucknow':       { x: 210, y: 108 },
    'Gwalior':       { x: 183, y: 118 },
    'Kolkata':       { x: 275, y: 155 },
    'Mumbai':        { x: 115, y: 215 },
    'Hyderabad':     { x: 185, y: 235 },
    'Bengaluru':     { x: 175, y: 290 },
    'Chennai':       { x: 210, y: 280 },
    'Visakhapatnam': { x: 248, y: 225 },
}

function getScalePosition(aqi) {
    if (aqi <= 50)  return (aqi / 50) * 16
    if (aqi <= 100) return 16 + ((aqi - 50) / 50) * 17
    if (aqi <= 200) return 33 + ((aqi - 100) / 100) * 17
    if (aqi <= 300) return 50 + ((aqi - 200) / 100) * 17
    if (aqi <= 400) return 67 + ((aqi - 300) / 100) * 17
    return Math.min(99, 84 + ((aqi - 400) / 200) * 16)
}

function getCigarettes(pm25) { return (pm25 / 22).toFixed(1) }

// ─── LIVE CLOCK ──────────────────────────────────────
function updateClock() {
    const now  = new Date()
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    document.getElementById('current-time').innerHTML = `${date} ${time}`
}
updateClock()
setInterval(updateClock, 1000)

let currentCity = null
let currentAQI  = null

function selectCity(cityName) {
    document.querySelectorAll('.city-pill').forEach(pill => {
        pill.classList.remove('active')
        if (pill.textContent.trim() === cityName) pill.classList.add('active')
    })
    fetchCityData(cityName)
}

function fetchCityData(cityName) {
    fetch(`/city-data/${cityName}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                currentCity = cityName
                currentAQI  = data.aqi
                updateAQIDisplay(data)
                buildCitySkyline(cityName)
                updatePollutantsDisplay(data)
                updateHealthSection(data)
                updateChart(data.history, cityName)
                updateCitiesGrid(data.all_cities)
                updateForecast(data.forecast, cityName)
                updateHeatmap(data.all_cities)
            }
        })
        .catch(err => console.error('Error:', err))
}

// ══════════════════════════════════════════════════════
// AQI CARD VISUALS
// ══════════════════════════════════════════════════════
const AQI_THEMES = {
    good:         { bg: 'linear-gradient(to top, rgba(0,140,0,0.75) 0%, rgba(0,80,0,0.4) 60%, transparent 100%)',    dot: '#22c55e' },
    satisfactory: { bg: 'linear-gradient(to top, rgba(100,180,0,0.75) 0%, rgba(60,120,0,0.4) 60%, transparent 100%)',dot: '#84cc16' },
    moderate:     { bg: 'linear-gradient(to top, rgba(180,140,0,0.85) 0%, rgba(120,90,0,0.5) 60%, transparent 100%)',dot: '#f59e0b' },
    poor:         { bg: 'linear-gradient(to top, rgba(200,90,0,0.88) 0%, rgba(140,60,0,0.55) 60%, transparent 100%)',dot: '#ef4444' },
    verypoor:     { bg: 'linear-gradient(to top, rgba(220,40,40,0.82) 0%, rgba(140,20,20,0.55) 60%, transparent 100%)',dot: '#f97316' },
    severe:       { bg: 'linear-gradient(to top, rgba(100,0,0,0.95) 0%, rgba(60,0,0,0.7) 60%, transparent 100%)',    dot: '#7e0023' },
}

function getAQIThemeKey(aqi) {
    if (aqi <= 50)  return 'good'
    if (aqi <= 100) return 'satisfactory'
    if (aqi <= 200) return 'moderate'
    if (aqi <= 300) return 'poor'
    if (aqi <= 400) return 'verypoor'
    return 'severe'
}

function getBoyCharacter(themeKey) {
    const skin = '#f4a56a', hair = '#2d1a0e'
    const shirt = {good:'#4caf50',satisfactory:'#8bc34a',moderate:'#ffc107',poor:'#ff7043',verypoor:'#dc2626',severe:'#b71c1c'}[themeKey]
    const pants = themeKey === 'severe' ? '#b71c1c' : '#2d1a0e'

    if (themeKey === 'good') return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="55" r="32" fill="${skin}"/><ellipse cx="80" cy="30" rx="28" ry="20" fill="${hair}"/>
      <path d="M66 52 Q70 47 74 52" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M86 52 Q90 47 94 52" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M68 65 Q80 76 92 65" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="65" cy="65" r="6" fill="#ff9999" opacity="0.5"/><circle cx="95" cy="65" r="6" fill="#ff9999" opacity="0.5"/>
      <rect x="74" y="84" width="12" height="10" fill="${skin}"/><rect x="52" y="93" width="56" height="55" rx="10" fill="${shirt}"/>
      <rect x="33" y="93" width="20" height="48" rx="9" fill="${shirt}"/><ellipse cx="43" cy="145" rx="10" ry="8" fill="${skin}"/>
      <rect x="107" y="93" width="20" height="48" rx="9" fill="${shirt}"/><ellipse cx="117" cy="145" rx="10" ry="8" fill="${skin}"/>
      <rect x="52" y="145" width="24" height="55" rx="8" fill="${pants}"/><rect x="84" y="145" width="24" height="55" rx="8" fill="${pants}"/>
      <ellipse cx="64" cy="200" rx="14" ry="7" fill="#1a1a1a"/><ellipse cx="96" cy="200" rx="14" ry="7" fill="#1a1a1a"/>
    </svg>`

    if (themeKey === 'satisfactory') return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="55" r="32" fill="${skin}"/><ellipse cx="80" cy="30" rx="28" ry="20" fill="${hair}"/>
      <ellipse cx="70" cy="53" rx="5" ry="5" fill="#2d1a0e"/><ellipse cx="90" cy="53" rx="5" ry="5" fill="#2d1a0e"/>
      <circle cx="72" cy="51" r="2" fill="white"/><circle cx="92" cy="51" r="2" fill="white"/>
      <path d="M70 66 Q80 73 90 66" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="74" y="84" width="12" height="10" fill="${skin}"/><rect x="52" y="93" width="56" height="55" rx="10" fill="${shirt}"/>
      <rect x="33" y="93" width="20" height="48" rx="9" fill="${shirt}"/><ellipse cx="43" cy="145" rx="10" ry="8" fill="${skin}"/>
      <rect x="107" y="93" width="20" height="48" rx="9" fill="${shirt}"/><ellipse cx="117" cy="145" rx="10" ry="8" fill="${skin}"/>
      <rect x="52" y="145" width="24" height="55" rx="8" fill="${pants}"/><rect x="84" y="145" width="24" height="55" rx="8" fill="${pants}"/>
      <ellipse cx="64" cy="200" rx="14" ry="7" fill="#1a1a1a"/><ellipse cx="96" cy="200" rx="14" ry="7" fill="#1a1a1a"/>
    </svg>`

    if (themeKey === 'moderate') return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="58" r="32" fill="${skin}"/><ellipse cx="80" cy="33" rx="28" ry="20" fill="${hair}"/>
      <ellipse cx="70" cy="57" rx="5" ry="4" fill="#2d1a0e"/><ellipse cx="90" cy="57" rx="5" ry="4" fill="#2d1a0e"/>
      <path d="M65 51 Q70 48 75 51" stroke="${hair}" stroke-width="2" fill="none"/>
      <path d="M85 51 Q90 48 95 51" stroke="${hair}" stroke-width="2" fill="none"/>
      <path d="M70 72 Q80 68 90 72" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="74" y="87" width="12" height="10" fill="${skin}"/><rect x="52" y="96" width="56" height="55" rx="10" fill="${shirt}"/>
      <path d="M68 96 L80 110 L92 96" fill="white" opacity="0.8"/>
      <path d="M52 100 Q35 120 38 148" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="38" cy="148" rx="10" ry="8" fill="${skin}"/>
      <path d="M108 100 Q125 120 122 148" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="122" cy="148" rx="10" ry="8" fill="${skin}"/>
      <rect x="52" y="148" width="24" height="52" rx="8" fill="${pants}"/><rect x="84" y="148" width="24" height="52" rx="8" fill="${pants}"/>
      <ellipse cx="64" cy="200" rx="14" ry="7" fill="#1a1a1a"/><ellipse cx="96" cy="200" rx="14" ry="7" fill="#1a1a1a"/>
    </svg>`

    if (themeKey === 'poor') return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="62" r="32" fill="${skin}"/><ellipse cx="80" cy="37" rx="28" ry="20" fill="${hair}"/>
      <path d="M64 60 Q69 56 74 60" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M86 60 Q91 56 96 60" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M63 53 Q69 50 75 53" stroke="${hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M85 53 Q91 50 97 53" stroke="${hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M70 76 Q80 70 90 76" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="74" y="91" width="12" height="10" fill="${skin}"/><rect x="52" y="100" width="56" height="55" rx="10" fill="${shirt}"/>
      <path d="M52 104 Q32 130 34 158" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="34" cy="158" rx="10" ry="8" fill="${skin}"/>
      <path d="M108 104 Q128 130 126 158" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="126" cy="158" rx="10" ry="8" fill="${skin}"/>
      <rect x="52" y="152" width="24" height="48" rx="8" fill="${pants}"/><rect x="84" y="152" width="24" height="48" rx="8" fill="${pants}"/>
      <ellipse cx="64" cy="200" rx="14" ry="7" fill="#1a1a1a"/><ellipse cx="96" cy="200" rx="14" ry="7" fill="#1a1a1a"/>
    </svg>`

    if (themeKey === 'verypoor') return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <rect x="55" y="110" width="52" height="50" rx="10" fill="${shirt}" transform="rotate(-8 80 130)"/>
      <path d="M55 115 Q30 125 32 150" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="34" cy="150" rx="9" ry="8" fill="${skin}" transform="rotate(-10 34 150)"/>
      <path d="M105 115 Q120 135 112 155" stroke="${shirt}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="112" cy="155" rx="9" ry="8" fill="${skin}"/>
      <circle cx="80" cy="72" r="30" fill="${skin}" transform="rotate(10 80 72)"/>
      <ellipse cx="82" cy="47" rx="26" ry="18" fill="${hair}" transform="rotate(10 82 47)"/>
      <path d="M67 72 Q72 68 77 72" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round" transform="rotate(10 72 72)"/>
      <path d="M83 72 Q88 68 93 72" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round" transform="rotate(10 88 72)"/>
      <ellipse cx="65" cy="80" rx="2.5" ry="5" fill="#80c8ff" opacity="0.8" transform="rotate(10 65 80)"/>
      <ellipse cx="95" cy="78" rx="2.5" ry="5" fill="#80c8ff" opacity="0.8" transform="rotate(10 95 78)"/>
      <path d="M70 85 Q80 80 90 85" stroke="#2d1a0e" stroke-width="2.5" fill="none" stroke-linecap="round" transform="rotate(10 80 85)"/>
      <rect x="55" y="158" width="22" height="42" rx="8" fill="${pants}"/><rect x="83" y="158" width="22" height="42" rx="8" fill="${pants}"/>
      <ellipse cx="66" cy="200" rx="13" ry="7" fill="#1a1a1a"/><ellipse cx="94" cy="200" rx="13" ry="7" fill="#1a1a1a"/>
    </svg>`

    return `<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="165" rx="40" ry="28" fill="${shirt}" transform="rotate(-5 80 165)"/>
      <path d="M45 155 Q55 175 75 180" stroke="${skin}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M115 155 Q105 175 85 180" stroke="${skin}" stroke-width="14" stroke-linecap="round" fill="none"/>
      <circle cx="80" cy="118" r="28" fill="${skin}"/><ellipse cx="80" cy="96" rx="24" ry="18" fill="${hair}"/>
      <ellipse cx="70" cy="118" rx="6" ry="7" fill="white"/><ellipse cx="90" cy="118" rx="6" ry="7" fill="white"/>
      <ellipse cx="71" cy="120" rx="4" ry="4.5" fill="#2d1a0e"/><ellipse cx="91" cy="120" rx="4" ry="4.5" fill="#2d1a0e"/>
      <circle cx="70" cy="118" r="1.5" fill="white"/><circle cx="90" cy="118" r="1.5" fill="white"/>
      <ellipse cx="80" cy="133" rx="9" ry="6" fill="#8B0000"/>
      <path d="M96 105 Q100 100 104 105 Q104 113 100 113 Q96 113 96 105z" fill="#80c8ff" opacity="0.75"/>
      <path d="M55 185 Q50 198 58 205" stroke="${pants}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <path d="M105 185 Q110 198 102 205" stroke="${pants}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <ellipse cx="57" cy="206" rx="13" ry="6" fill="#1a1a1a"/><ellipse cx="103" cy="206" rx="13" ry="6" fill="#1a1a1a"/>
    </svg>`
}

const ALL_CITY_ICONS = [
    { city: 'Bengaluru', file: 'bangalore.png' }, { city: 'Chennai', file: 'chennai.png' },
    { city: 'Delhi', file: 'delhi.png' }, { city: 'Gwalior', file: 'gwalior.png' },
    { city: 'Hyderabad', file: 'hyderabad-charminar.png' }, { city: 'Jaipur', file: 'jaipur.png' },
    { city: 'Kolkata', file: 'kolkata.png' }, { city: 'Lucknow', file: 'lucknow.png' },
    { city: 'Mumbai', file: 'mumbai.png' }, { city: 'Visakhapatnam', file: 'visakhpatanm.png' },
]

function buildCitySkyline(cityName) {
    const skyline = document.getElementById('city-skyline')
    if (!skyline) return
    const selected = ALL_CITY_ICONS.find(c => c.city === cityName)
    if (!selected) return
    const others   = ALL_CITY_ICONS.filter(c => c.city !== cityName)
    const seed     = cityName.charCodeAt(0)
    const shuffled = [...others].sort((a, b) => ((a.city.charCodeAt(0) + seed) % 10) - ((b.city.charCodeAt(0) + seed) % 10))
    const picks    = shuffled.slice(0, 4)
    const layout   = [
        { ...picks[0], cls: 'tertiary' }, { ...picks[1], cls: 'secondary' },
        { ...selected, cls: 'primary' },
        { ...picks[2], cls: 'secondary' }, { ...picks[3], cls: 'tertiary' },
    ]
    skyline.innerHTML = layout.map(item =>
        `<img src="/static/icons/${item.file}" class="skyline-icon ${item.cls}" alt="${item.city}" onerror="this.style.display='none'">`
    ).join('')
}

function updateAQICardVisuals(aqi) {
    const key   = getAQIThemeKey(aqi)
    const theme = AQI_THEMES[key]
    const wash  = document.getElementById('aqi-bg-wash')
    if (wash) { wash.style.background = theme.bg; wash.classList.add('active') }
    const dot = document.getElementById('live-dot')
    if (dot) dot.style.background = theme.dot
    const char = document.getElementById('aqi-character')
    if (char) {
        char.style.opacity = '0'
        setTimeout(() => { char.innerHTML = getBoyCharacter(key); char.style.opacity = '1' }, 200)
    }
    const opacity = 0.06 + (aqi / 500) * 0.18
    document.querySelectorAll('.cloud').forEach(c => c.style.background = `rgba(255,255,255,${opacity})`)
}

// ─── AQI DISPLAY ─────────────────────────────────────
function updateAQIDisplay(data) {
    const info = getAQIInfo(data.aqi)
    document.getElementById('aqi-number').textContent = data.aqi
    document.getElementById('aqi-number').style.color = info.color
    updateAQICardVisuals(data.aqi)
    const statusPill = document.getElementById('aqi-status')
    statusPill.textContent = info.category
    statusPill.className   = 'aqi-status-pill ' + info.bgClass
    document.getElementById('pm25-display').textContent = data.pm25
    document.getElementById('pm10-display').textContent = data.pm10
    document.getElementById('scale-marker').style.left  = getScalePosition(data.aqi) + '%'
    const cigs = getCigarettes(data.pm25)
    document.getElementById('cigarette-box').style.display = 'block'
    document.getElementById('cig-number').textContent = cigs
    document.getElementById('cig-desc').textContent = `Breathing the air in ${data.city} is equivalent to smoking ${cigs} cigarettes a day.`
    const stationEl = document.getElementById('station-name')
    const updatedEl = document.getElementById('last-updated')
    const staleEl   = document.getElementById('stale-warning')
    if (stationEl) stationEl.textContent = data.station_name || data.city
    if (updatedEl) updatedEl.textContent = data.last_updated  || 'Unknown'
    if (staleEl)   staleEl.style.display = data.is_stale ? 'block' : 'none'
}

function updatePollutantsDisplay(data) {
    document.getElementById('pol-pm25').textContent = data.pm25
    document.getElementById('pol-pm10').textContent = data.pm10
    document.getElementById('pol-no2').textContent  = data.no2
    document.getElementById('pol-so2').textContent  = data.so2
    document.getElementById('pol-co').textContent   = data.co
    document.getElementById('pol-o3').textContent   = data.o3
    document.getElementById('pollutants-city-name').textContent = data.city
    colorPollutant('pol-pm25', data.pm25, 'pm25')
    colorPollutant('pol-pm10', data.pm10, 'pm10')
    colorPollutant('pol-no2',  data.no2,  'no2')
}

function colorPollutant(id, value, type) {
    const el = document.getElementById(id)
    let color = '#22c55e'
    if (type === 'pm25') { if (value > 90) color = '#ef4444'; else if (value > 60) color = '#f59e0b'; else if (value > 30) color = '#84cc16' }
    if (type === 'pm10') { if (value > 250) color = '#ef4444'; else if (value > 100) color = '#f59e0b'; else if (value > 50) color = '#84cc16' }
    if (type === 'no2')  { if (value > 180) color = '#ef4444'; else if (value > 80)  color = '#f59e0b'; else if (value > 40) color = '#84cc16' }
    el.style.color = color
}

function updateHealthSection(data) {
    const info = getAQIInfo(data.aqi)
    document.getElementById('health-city-name').textContent  = data.city.toUpperCase()
    document.getElementById('health-aqi-status').textContent = info.category
    document.getElementById('health-aqi-status').style.color = info.color
    document.getElementById('health-aqi-number').textContent = data.aqi
    const pill = document.getElementById('health-pill')
    pill.textContent = info.category; pill.className = 'health-status-pill ' + info.bgClass
    const purifier = document.getElementById('sol-purifier')
    const carfilter = document.getElementById('sol-carfilter')
    const mask = document.getElementById('sol-mask')
    const indoor = document.getElementById('sol-indoor')
    if (data.aqi <= 50)       { purifier.textContent='Optional'; carfilter.textContent='Optional'; mask.textContent='Not Needed'; indoor.textContent='Not Needed' }
    else if (data.aqi <= 100) { purifier.textContent='Recommended'; carfilter.textContent='Recommended'; mask.textContent='Optional'; indoor.textContent='Optional' }
    else if (data.aqi <= 200) { purifier.textContent='Turn On'; carfilter.textContent='Must'; mask.textContent='Must'; indoor.textContent='Suggested' }
    else                      { purifier.textContent='Turn On'; carfilter.textContent='Must'; mask.textContent='Must'; indoor.textContent='Must' }
    ;[purifier, carfilter, mask, indoor].forEach(el => {
        el.style.color      = el.textContent === 'Must' ? '#ef4444' : el.textContent === 'Turn On' ? '#a855f7' : '#5a6070'
        el.style.fontWeight = ['Must','Turn On'].includes(el.textContent) ? '700' : '400'
    })
    const rc = document.getElementById('risks-city'), rs = document.getElementById('risks-status'), ra = document.getElementById('risks-aqi')
    if (rc) rc.textContent = data.city
    if (rs) { rs.textContent = info.category; rs.style.color = info.color }
    if (ra) ra.textContent = data.aqi
}

// ─── HISTORICAL CHART ────────────────────────────────
let aqiChart = null
function updateChart(history, cityName) {
    document.getElementById('chart-city').textContent = cityName
    const labels    = history.map(h => h.date)
    const values    = history.map(h => h.AQI)
    const minAQI    = Math.min(...values)
    const maxAQI    = Math.max(...values)
    const barColors = values.map(v => getAQIInfo(v).color)
    document.getElementById('chart-min').textContent = Math.round(minAQI)
    document.getElementById('chart-max').textContent = Math.round(maxAQI)
    const ctx = document.getElementById('aqi-chart').getContext('2d')
    if (aqiChart) aqiChart.destroy()
    aqiChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'AQI', data: values, backgroundColor: barColors, borderColor: barColors, borderRadius: 4, borderSkipped: false, maxBarThickness: 60 }] },
        options: {
            responsive: true,
            plugins: { legend: { display: false },
                tooltip: { backgroundColor: '#17171f', titleColor: '#9090b0', bodyColor: '#eeeef5', borderColor: '#2a2a3a', borderWidth: 1, callbacks: { label: ctx => `AQI: ${Math.round(ctx.raw)}` } }
            },
            scales: {
                x: { grid: { color: 'rgba(42,42,58,0.8)' }, ticks: { color: '#50506a', font: { size: 11 }, maxRotation: 45 } },
                y: { grid: { color: 'rgba(42,42,58,0.8)' }, ticks: { color: '#50506a', font: { size: 11 } }, beginAtZero: true }
            }
        }
    })
}

// ─── CITIES GRID ─────────────────────────────────────
function updateCitiesGrid(allCities) {
    const grid = document.getElementById('cities-grid')
    if (!grid) return
    grid.innerHTML = allCities.map(city => {
        const info     = getAQIInfo(city.aqi)
        const icon     = CITY_ICONS[city.name] || ''
        const hasTemp = city.temp     != null && city.temp     !== 0
        const hasHum  = city.humidity != null && city.humidity !== 0
        const temp     = hasTemp ? `${city.temp}°C`     : '<span class="meta-na">N/A</span>'
        const humidity = hasHum  ? `${city.humidity}%`  : '<span class="meta-na">N/A</span>'
        return `<div class="city-card" onclick="selectCity('${city.name}')">
            <div class="city-card-arrow">↗</div>
            ${icon ? `<img src="${icon}" class="city-landmark" alt="${city.name}">` : ''}
            <div class="city-info">
                <div class="city-card-name">${city.name}</div>
                <div class="city-card-aqi" style="color:${info.color}">${city.aqi}</div>
                <div class="city-card-meta">
                    <div class="city-meta-item"><span>Temp.</span><span>${temp}</span></div>
                    <div class="city-meta-divider"></div>
                    <div class="city-meta-item"><span>Hum.</span><span>${humidity}</span></div>
                </div>
                ${!hasTemp && !hasHum ? '<div class="meta-no-sensor">No weather sensor</div>' : ''}
            </div>
        </div>`
    }).join('')
}

// ══════════════════════════════════════════════════════
// FEATURE 1: 7-DAY FORECAST
// ══════════════════════════════════════════════════════
function updateForecast(forecast, cityName) {
    const section = document.getElementById('forecast-section')
    const cards   = document.getElementById('forecast-cards')
    const nameEl  = document.getElementById('forecast-city-name')
    if (!forecast || forecast.length === 0) { section.style.display = 'none'; return }
    section.style.display = 'block'
    if (nameEl) nameEl.textContent = '— ' + cityName
    cards.innerHTML = forecast.map((day, i) => {
        const trend = i === 0 ? '' : forecast[i].AQI > forecast[i-1].AQI ? '↑' : forecast[i].AQI < forecast[i-1].AQI ? '↓' : '→'
        const trendColor = trend === '↑' ? '#ef4444' : trend === '↓' ? '#22c55e' : '#9090b0'
        return `<div class="forecast-card" style="--fc-color:${day.color}; animation-delay:${i*0.06}s">
            <div class="fc-day">${day.day}</div>
            <div class="fc-date">${day.date}</div>
            <div class="fc-aqi" style="color:${day.color}">${day.AQI}</div>
            <div class="fc-category" style="color:${day.color}">${day.category}</div>
            <div class="fc-bar-wrap"><div class="fc-bar" style="height:${Math.min(80, (day.AQI/500)*80)}px;background:${day.color}"></div></div>
            <div class="fc-trend" style="color:${trendColor}">${trend}</div>
        </div>`
    }).join('')
}

// ══════════════════════════════════════════════════════
// FEATURE 2: COMPARISON MODE
// ══════════════════════════════════════════════════════
let compareChart    = null
let compareDebounce = null

function loadComparison() {
    clearTimeout(compareDebounce)
    compareDebounce = setTimeout(_doLoadComparison, 250)
}

function _doLoadComparison() {
    const cityA = document.getElementById('compare-city-a').value
    const cityB = document.getElementById('compare-city-b').value
    if (cityA === cityB) return

    fetch(`/compare?a=${cityA}&b=${cityB}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return
            const dA = data.data[cityA]
            const dB = data.data[cityB]

            // Update city cards
            const infoA = getAQIInfo(dA.aqi), infoB = getAQIInfo(dB.aqi)
            document.getElementById('compare-name-a').textContent = cityA
            document.getElementById('compare-aqi-a').textContent  = dA.aqi
            document.getElementById('compare-aqi-a').style.color  = infoA.color
            document.getElementById('compare-cat-a').textContent  = infoA.category
            document.getElementById('compare-cat-a').style.color  = infoA.color
            document.getElementById('compare-pm-a').textContent   = `PM2.5: ${dA.pm25} μg/m³`
            document.getElementById('compare-card-a').style.borderColor = infoA.color

            document.getElementById('compare-name-b').textContent = cityB
            document.getElementById('compare-aqi-b').textContent  = dB.aqi
            document.getElementById('compare-aqi-b').style.color  = infoB.color
            document.getElementById('compare-cat-b').textContent  = infoB.category
            document.getElementById('compare-cat-b').style.color  = infoB.color
            document.getElementById('compare-pm-b').textContent   = `PM2.5: ${dB.pm25} μg/m³`
            document.getElementById('compare-card-b').style.borderColor = infoB.color

            // Chart
            const histA   = dA.history || []
            const histB   = dB.history || []
            const labels  = histA.map(d => d.date)
            const valuesA = histA.map(d => d.AQI)
            const valuesB = histB.length === histA.length ? histB.map(d => d.AQI) : histA.map((_, i) => histB[i] ? histB[i].AQI : null)

            const ctx = document.getElementById('compare-chart').getContext('2d')
            if (compareChart) compareChart.destroy()
            compareChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: cityA, data: valuesA, borderColor: infoA.color, backgroundColor: infoA.color + '20', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: infoA.color },
                        { label: cityB, data: valuesB, borderColor: infoB.color, backgroundColor: infoB.color + '20', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: infoB.color },
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#9090b0', font: { size: 12 } } },
                        tooltip: { backgroundColor: '#17171f', titleColor: '#9090b0', bodyColor: '#eeeef5', borderColor: '#2a2a3a', borderWidth: 1 }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(42,42,58,0.6)' }, ticks: { color: '#50506a' } },
                        y: { grid: { color: 'rgba(42,42,58,0.6)' }, ticks: { color: '#50506a' }, beginAtZero: true }
                    }
                }
            })
        })
        .catch(err => console.error('Comparison error:', err))
}

// ══════════════════════════════════════════════════════
// FEATURE 3: INDIA HEATMAP
// ══════════════════════════════════════════════════════
function updateHeatmap(allCities) {
    const svgGroup = document.getElementById('heatmap-cities')
    const listEl   = document.getElementById('heatmap-city-list')
    if (!svgGroup || !listEl) return

    svgGroup.innerHTML = allCities.map(city => {
        const info = getAQIInfo(city.aqi)
        const pos  = CITY_SVG_POS[city.name] || { x: 200, y: 240 }
        return `<g class="hm-city-dot" onclick="selectCity('${city.name}')" style="cursor:pointer">
            <circle cx="${pos.x}" cy="${pos.y}" r="18" fill="${info.color}" opacity="0.15"/>
            <circle cx="${pos.x}" cy="${pos.y}" r="10" fill="${info.color}" opacity="0.35"/>
            <circle cx="${pos.x}" cy="${pos.y}" r="5"  fill="${info.color}"/>
            <text x="${pos.x}" y="${pos.y - 14}" text-anchor="middle" fill="${info.color}" font-size="8" font-family="sans-serif" font-weight="600">${city.name.substring(0,3).toUpperCase()}</text>
            <text x="${pos.x}" y="${pos.y + 22}" text-anchor="middle" fill="white" font-size="9" font-family="sans-serif" font-weight="700" opacity="0.9">${city.aqi}</text>
        </g>`
    }).join('')

    // Sorted list by AQI descending
    const sorted = [...allCities].sort((a, b) => b.aqi - a.aqi)
    listEl.innerHTML = sorted.map((city, i) => {
        const info = getAQIInfo(city.aqi)
        return `<div class="hm-list-row" onclick="selectCity('${city.name}')">
            <div class="hm-rank">${i + 1}</div>
            <div class="hm-city-name">${city.name}</div>
            <div class="hm-aqi-val" style="color:${info.color}">${city.aqi}</div>
            <div class="hm-cat-chip" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}44">${info.category}</div>
        </div>`
    }).join('')
}

// ══════════════════════════════════════════════════════
// FEATURE 4: MODEL EXPLAINABILITY
// ══════════════════════════════════════════════════════

function buildNodeGraph(importances) {
    const linesG    = document.getElementById('node-lines')
    const featuresG = document.getElementById('node-features')
    if (!linesG || !featuresG) return

    const cx = 230, cy = 130   // center "AQI" node position in viewBox 0 0 280 260
    const topN   = importances.slice(0, 6)
    const spacing = 36
    const startY  = cy - ((topN.length - 1) * spacing) / 2
    const maxImp  = Math.max(...topN.map(d => parseFloat(d.importance) || 0))

    linesG.innerHTML   = ''
    featuresG.innerHTML = ''

    topN.forEach((item, i) => {
        const fx      = 28
        const fy      = startY + i * spacing
        const pct     = (parseFloat(item.importance) || 0) / (maxImp || 1)
        const r       = 5 + pct * 9
        const opacity = 0.25 + pct * 0.75
        const delay   = (i * 0.1).toFixed(2)

        // Bezier line to center node
        const cpx = (fx + cx) / 2
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        line.setAttribute('d', `M ${fx + r} ${fy} C ${cpx} ${fy}, ${cpx} ${cy}, ${cx - 34} ${cy}`)
        line.setAttribute('fill', 'none')
        line.setAttribute('stroke', '#f59e0b')
        line.setAttribute('stroke-opacity', (0.35 + pct * 0.55).toFixed(2))
        line.setAttribute('stroke-width', (1.2 + pct * 2.5).toFixed(1))
        line.setAttribute('class', 'node-line')
        line.style.animationDelay = delay + 's'
        linesG.appendChild(line)

        // Glow halo
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        halo.setAttribute('cx', fx); halo.setAttribute('cy', fy)
        halo.setAttribute('r', r + 7)
        halo.setAttribute('fill', '#f59e0b')
        halo.setAttribute('opacity', (0.08 + pct * 0.18).toFixed(2))
        featuresG.appendChild(halo)

        // Main node circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', fx); circle.setAttribute('cy', fy)
        circle.setAttribute('r', r)
        circle.setAttribute('fill', '#f59e0b')
        circle.setAttribute('opacity', opacity.toFixed(2))
        featuresG.appendChild(circle)

        // % text inside larger nodes
        if (r > 9) {
            const pctTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            pctTxt.setAttribute('x', fx); pctTxt.setAttribute('y', fy + 3)
            pctTxt.setAttribute('text-anchor', 'middle')
            pctTxt.setAttribute('fill', '#0d0d14')
            pctTxt.setAttribute('font-size', '6.5')
            pctTxt.setAttribute('font-weight', '900')
            pctTxt.textContent = Math.round(parseFloat(item.importance)) + '%'
            featuresG.appendChild(pctTxt)
        }

        // Feature name label
        const name  = item.feature.length > 15 ? item.feature.substring(0, 13) + '…' : item.feature
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        label.setAttribute('x', fx + r + 5)
        label.setAttribute('y', fy + 4)
        label.setAttribute('fill', `rgba(255,255,255,${(0.55 + pct * 0.4).toFixed(2)})`)
        label.setAttribute('font-size', '9')
        label.setAttribute('font-family', 'system-ui,sans-serif')
        label.textContent = name
        featuresG.appendChild(label)
    })
}

function loadGlobalImportance() {
    fetch('/feature-importance')
        .then(r => r.json())
        .then(data => {
            if (!data.success) return
            buildNodeGraph(data.importances)
            renderFeatureBars('feature-bars', data.importances, '#f59e0b')
        })
        .catch(() => {})
}

function renderFeatureBars(containerId, importances, color) {
    const el = document.getElementById(containerId)
    if (!el) return
    if (!importances || importances.length === 0) return
    const max = Math.max(...importances.map(i => parseFloat(i.importance) || 0))
    if (max === 0) return
    el.innerHTML = importances.map((item, idx) => {
        const pct = parseFloat(item.importance) || 0
        const w   = (pct / max * 100).toFixed(1)
        return `<div class="feat-row" style="animation-delay:${idx * 0.07}s">
            <div class="feat-name">${item.feature}</div>
            <div class="feat-bar-wrap">
                <div class="feat-bar" style="width:0%;background:${color};box-shadow:0 0 6px ${color}66" data-w="${w}"></div>
            </div>
            <div class="feat-pct">${pct.toFixed(1)}%</div>
        </div>`
    }).join('')
    // Animate bars in after paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
        el.querySelectorAll('.feat-bar[data-w]').forEach(b => {
            b.style.width = b.getAttribute('data-w') + '%'
        })
    }))
}

// ─── HEALTH RISK TABS ────────────────────────────────
function showRisk(type, event) {
    document.querySelectorAll('.risk-content').forEach(el => el.style.display = 'none')
    document.querySelectorAll('.risk-tab').forEach(t => t.classList.remove('active'))
    const card = document.getElementById('risk-' + type)
    card.style.display = 'grid'
    // Trigger animation re-run
    card.style.animation = 'none'
    card.offsetHeight
    card.style.animation = ''
    const tab = event.target
    tab.classList.add('active')
}

// ─── PREDICT ─────────────────────────────────────────
// ── LOADING SEQUENCE ─────────────────────────────────
const SCAN_MESSAGES = [
    'Processing pollutants…',
    'Running XGBoost model…',
    'Calculating AQI index…',
    'Finalising prediction…',
]

function showLoadingState() {
    const panel       = document.getElementById('result-card')
    const placeholder = document.getElementById('result-placeholder')
    const content     = document.getElementById('result-content')
    placeholder.style.display = 'none'
    content.style.display     = 'none'

    panel.insertAdjacentHTML('beforeend', `
        <div class="pred-scanning" id="pred-scanning">
            <div class="scan-ring-wrap">
                <div class="scan-ring r1"></div>
                <div class="scan-ring r2"></div>
                <div class="scan-ring r3"></div>
                <div class="scan-icon">⚡</div>
            </div>
            <div class="scan-message" id="scan-message">Initialising…</div>
            <div class="scan-dots"><span></span><span></span><span></span></div>
            <div class="scan-line"></div>
        </div>
    `)

    let idx = 0
    const msgEl    = document.getElementById('scan-message')
    const interval = setInterval(() => {
        if (idx < SCAN_MESSAGES.length) {
            msgEl.style.opacity = '0'
            setTimeout(() => {
                msgEl.textContent   = SCAN_MESSAGES[idx]
                msgEl.style.opacity = '1'
                idx++
            }, 180)
        }
    }, 430)
    return interval
}

function hideLoadingState(intervalId) {
    clearInterval(intervalId)
    const scanning = document.getElementById('pred-scanning')
    if (scanning) {
        scanning.style.animation = 'scanFadeOut 0.3s ease forwards'
        setTimeout(() => scanning.remove(), 300)
    }
}

function predict() {
    const city = document.getElementById('pred-city').value
    const vals = ['pred-pm25','pred-pm10','pred-no2','pred-nh3','pred-so2','pred-co','pred-o3',
                  'pred-aqi','pred-lag1','pred-lag3','pred-lag7','pred-roll7']
                 .map(id => parseFloat(document.getElementById(id).value))
    if (vals.some(v => isNaN(v))) { alert('Please fill in all fields!'); return }
    const [pm25,pm10,no2,nh3,so2,co,o3,aqi,lag1,lag3,lag7,roll7] = vals
    const now     = new Date()
    const payload = {
        city, 'PM2.5':pm25,'PM10':pm10,'NO2':no2,'NH3':nh3,'SO2':so2,
        'CO':co,'O3':o3,'AQI':aqi,'AQI_lag1':lag1,'AQI_lag3':lag3,
        'AQI_lag7':lag7,'AQI_roll7_mean':roll7,
        month: now.getMonth()+1, day_of_week: now.getDay(), year: now.getFullYear()
    }

    const btn      = document.querySelector('.predict-btn')
    btn.innerHTML  = '<span class="btn-spinner"></span> Predicting…'
    btn.disabled   = true

    const fetchStarted = performance.now()
    const scanInterval = showLoadingState()

    fetch('/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        .then(r => r.json())
        .then(data => {
            const elapsed  = performance.now() - fetchStarted
            const minWait  = 1800
            const remaining = Math.max(0, minWait - elapsed)
            setTimeout(() => {
                hideLoadingState(scanInterval)
                btn.innerHTML = '<span class="predict-btn-icon">⚡</span> Predict Tomorrow\'s AQI'
                btn.disabled  = false
                if (data.success) {
                    setTimeout(() => {
                        showPredictionResult(data)
                        if (data.importance && data.importance.length > 0) {
                            renderFeatureBars('pred-feature-bars', data.importance, '#f59e0b')
                        }
                    }, 350)
                } else {
                    alert('Prediction failed: ' + data.error)
                }
            }, remaining)
        })
        .catch(err => {
            hideLoadingState(scanInterval)
            btn.innerHTML = '<span class="predict-btn-icon">⚡</span> Predict Tomorrow\'s AQI'
            btn.disabled  = false
            console.error(err)
        })
}

// ── GAUGE NEEDLE ANIMATION ──────────────────────────
function animateGauge(targetAQI, color) {
    // Map AQI 0-500 → angle -90 to +90 degrees (180° sweep)
    const minAQI = 0, maxAQI = 500
    const minDeg = -90, maxDeg = 90
    const clamp  = Math.min(Math.max(targetAQI, minAQI), maxAQI)
    const angle  = minDeg + (clamp / maxAQI) * (maxDeg - minDeg)

    const needle  = document.getElementById('gauge-needle')
    const numEl   = document.getElementById('gauge-number')
    if (!needle || !numEl) return

    // Animate needle
    let current = -90
    const step  = (angle - current) / 40
    let frame   = 0
    const tick  = setInterval(() => {
        current += step
        frame++
        needle.setAttribute('transform', `rotate(${current} 130 140)`)
        // Count-up number
        const displayed = Math.round(minAQI + ((current - minDeg) / (maxDeg - minDeg)) * maxAQI)
        numEl.textContent = Math.max(0, displayed)
        numEl.setAttribute('fill', color)
        if (frame >= 40) {
            clearInterval(tick)
            needle.setAttribute('transform', `rotate(${angle} 130 140)`)
            numEl.textContent = Math.round(targetAQI)
        }
    }, 18)
}

function showPredictionResult(data) {
    const info = getAQIInfo(data.aqi)
    document.getElementById('result-placeholder').style.display = 'none'
    document.getElementById('result-content').style.display     = 'flex'

    document.getElementById('result-city').textContent = data.city.toUpperCase()

    const cat = document.getElementById('result-category')
    cat.textContent = info.category
    cat.style.color = info.color
    cat.style.borderColor = info.color + '44'
    cat.style.background  = info.color + '18'

    document.getElementById('result-advice').innerHTML = getHealthAdvice(data.aqi)
    document.getElementById('result-card').style.borderColor = info.color + '66'

    // Animate the speedometer gauge
    animateGauge(data.aqi, info.color)
}

function getHealthAdvice(aqi) {
    if (aqi <= 50)  return `✅ <strong>Air quality will be Good.</strong> Safe for all outdoor activities!`
    if (aqi <= 100) return `🟡 <strong>Satisfactory.</strong> Sensitive groups should limit prolonged outdoor exertion.`
    if (aqi <= 200) return `🟠 <strong>Moderate.</strong> Wear N95 mask outdoors. Use air purifier indoors.`
    if (aqi <= 300) return `🔴 <strong>Poor.</strong> Limit outdoor exposure. N95 mask is must.`
    if (aqi <= 400) return `🟣 <strong>Very Poor.</strong> Avoid outdoors. Run air purifier continuously.`
    return `⚫ <strong>Severe.</strong> Stay indoors completely. Seek medical attention if breathing difficulty occurs.`
}

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    selectCity('Chennai')
    loadComparison()
    loadGlobalImportance()
})