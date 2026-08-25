// Timezone + meeting loader (expects /timezones.json)
(async function () {
  // Utility: compute offset in minutes for a particular instant in a given IANA timeZone.
  function offsetInMinutes(date, timeZone) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      hour12: false,
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const parts = dtf.formatToParts(date);
    const data = {};
    parts.forEach(({ type, value }) => { data[type] = value; });
    const asUtc = Date.UTC(
      Number(data.year),
      Number(data.month) - 1,
      Number(data.day),
      Number(data.hour),
      Number(data.minute),
      Number(data.second || 0)
    );
    return (asUtc - date.getTime()) / 60000;
  }

  // Build a Date (UTC instant) that corresponds to the given local Y/M/D H:M in timeZone.
  // Approach: make a UTC guess for the same numeric Y/M/D/H/M, get the tz offset at that instant,
  // then subtract the offset to obtain the true UTC instant.
  function zonedLocalToUtc(year, month, day, hour, minute, timeZone) {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const offset = offsetInMinutes(new Date(utcGuess), timeZone);
    return new Date(utcGuess - offset * 60000);
  }

  // Load timezones.json
  let cfg;
  try {
    const res = await fetch('/timezones.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('Failed to load timezones.json: ' + res.status);
    cfg = await res.json();
  } catch (e) {
    console.error('Unable to load timezones.json', e);
    return;
  }

  const meetingCfg = cfg.meeting || { zone: 'Australia/Adelaide', hour: 19, minute: 0 };
  const zones = cfg.zones || [];

  // DOM handles (match existing ids/classes in index.html)
  const container = document.getElementById('start-times');
  const sydneyTimeEl = document.getElementById('sydney-time-value');
  const sydneyZoneEl = document.getElementById('sydney-time-zone');
  const localTimeEls = { value: document.getElementById('local-time-value'), meta: document.getElementById('local-time-meta') };
  const countdownEls = { hours: document.getElementById('countdown-hours'), minutes: document.getElementById('countdown-minutes'), seconds: document.getElementById('countdown-seconds') };
  const countdownSecondsUnit = document.getElementById('countdown-seconds-unit');
  const countdownSecondsSeparator = document.getElementById('countdown-seconds-sep');
  const onAirPanel = document.getElementById('on-air-panel');

  // Low-effects guard (same heuristics as before)
  const shouldUseLowEffectsMode = (() => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
    const saveData = navigator.connection && navigator.connection.saveData;
    return !!(reduceMotion || lowMemory || saveData);
  })();

  // Build the "next meeting" UTC instant for the meeting zone
  function nextMeetingInstant(now = new Date()) {
    // Determine the date in the meeting zone for "today".
    const localParts = new Intl.DateTimeFormat('en-CA', { timeZone: meetingCfg.zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const [year, month, day] = localParts.split('-').map(Number);

    // Compute UTC instant corresponding to meeting local date at configured hour:minute
    let candidate = zonedLocalToUtc(year, month, day, meetingCfg.hour, meetingCfg.minute, meetingCfg.zone);

    // If candidate is already in the past for the current instant, advance by one local day:
    if (candidate <= now) {
      // Compute the next local date by adding 1 day to a Date in the meeting timezone
      const nextDayRef = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const localPartsNext = new Intl.DateTimeFormat('en-CA', { timeZone: meetingCfg.zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(nextDayRef);
      const [ny, nm, nd] = localPartsNext.split('-').map(Number);
      candidate = zonedLocalToUtc(ny, nm, nd, meetingCfg.hour, meetingCfg.minute, meetingCfg.zone);
    }
    return candidate;
  }

  // Formatter for local meeting display
  const localTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' });

  // Build zone grid from cfg.zones
  function renderZoneGrid(utcMeeting) {
    if (!container) return;
    container.innerHTML = '';
    const grid = document.createElement('ul');
    grid.className = 'tz-grid';
    zones.forEach(z => {
      const parts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: z.tz, timeZoneName: 'short' }).formatToParts(utcMeeting);
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const period = parts.find(p => p.type === 'dayPeriod')?.value || '';
      const tzRaw = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const tzName = tzRaw;
      const li = document.createElement('li');
      li.className = 'clock-box';
      if (z.featured) li.classList.add('clock-box-featured');
      li.innerHTML = `
        <div class="clock-label">${z.emoji ? `<span class="clock-emoji" aria-hidden="true">${z.emoji}</span>` : ''}<span class="clock-label-text">${z.label}</span></div>
        <div class="clock-time" aria-hidden="true">${hour}:${minute} ${period}</div>
        <div class="clock-meta"><span class="tz">${tzName}</span></div>
      `;
      grid.appendChild(li);
    });
    container.appendChild(grid);
  }

  // Update local display + countdown
  let countdownTarget = nextMeetingInstant(new Date());

  function updateCountdownAndLocal() {
    const now = new Date();
    if (now > countdownTarget) countdownTarget = nextMeetingInstant(now);

    const totalSeconds = Math.max(0, Math.floor((countdownTarget - now) / 1000));
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (countdownEls.hours) countdownEls.hours.textContent = String(hrs).padStart(2, '0');
    if (countdownEls.minutes) countdownEls.minutes.textContent = String(mins).padStart(2, '0');
    if (countdownEls.seconds) countdownEls.seconds.textContent = String(secs).padStart(2, '0');

    // Update local mirror
    if (localTimeEls.value && localTimeEls.meta) {
      const parts = localTimeFormatter.formatToParts(countdownTarget);
      const hour = parts.find(p => p.type === 'hour')?.value || '--';
      const minute = parts.find(p => p.type === 'minute')?.value || '--';
      const period = parts.find(p => p.type === 'dayPeriod')?.value || '';
      const tzLabel = parts.find(p => p.type === 'timeZoneName')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
      localTimeEls.value.textContent = `${hour}:${minute} ${period}`;
      localTimeEls.meta.textContent = tzLabel;
    }
  }

  const MEETING_DURATION_MS = 90 * 60 * 1000;

  function updateOnAir() {
    if (!onAirPanel) return;
    const now = new Date();
    const start = countdownTarget;
    const end = new Date(start.getTime() + MEETING_DURATION_MS);
    const isLive = now >= start && now < end;
    if (isLive) onAirPanel.removeAttribute('hidden');
    else onAirPanel.setAttribute('hidden', '');
  }

  // Initialize and start timers
  // Set sydney element (if present) from computed meeting instant
  if (sydneyTimeEl) {
    const sydneyParts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney' }).formatToParts(countdownTarget);
    const sh = sydneyParts.find(p => p.type === 'hour')?.value || '--';
    const sm = sydneyParts.find(p => p.type === 'minute')?.value || '00';
    const sp = sydneyParts.find(p => p.type === 'dayPeriod')?.value || '';
    sydneyTimeEl.textContent = `${sh}:${sm} ${sp}`;
    if (sydneyZoneEl) {
      const tzRaw = sydneyParts.find(p => p.type === 'timeZoneName')?.value || '';
      sydneyZoneEl.textContent = tzRaw;
    }
  }

  renderZoneGrid(countdownTarget);
  updateCountdownAndLocal();
  updateOnAir();
  setInterval(updateCountdownAndLocal, 1000);
  setInterval(updateOnAir, 15000);

  // Optionally reduce seconds display for low-effects devices
  if (shouldUseLowEffectsMode) {
    if (countdownSecondsUnit) countdownSecondsUnit.style.display = 'none';
    if (countdownSecondsSeparator) countdownSecondsSeparator.style.display = 'none';
    if (countdownEls.seconds) countdownEls.seconds = null;
  }

})();
