(function () {
  // Simple renderer: draws a timezone grid into a container selector.
  function renderZoneGrid(containerSelector, instant, zones) {
    try {
      const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
      if (!container) return;
      container.innerHTML = '';
      const grid = document.createElement('ul');
      grid.className = 'tz-grid';
      zones.forEach(z => {
        const parts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: z.tz, timeZoneName: 'short' }).formatToParts(instant || new Date());
        const hour = parts.find(p => p.type === 'hour')?.value || '--';
        const minute = parts.find(p => p.type === 'minute')?.value || '00';
        const period = parts.find(p => p.type === 'dayPeriod')?.value || '';
        const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';

        const li = document.createElement('li');
        li.className = 'clock-box';
        li.innerHTML = `\n          <div class="clock-label">${z.emoji ? `<span class="clock-emoji" aria-hidden="true">${z.emoji}</span>` : ''}<span class="clock-label-text">${z.label}</span></div>\n          <div class="clock-time" aria-hidden="true">${hour}:${minute} ${period}</div>\n          <div class="clock-meta"><span class="tz">${tzName}</span></div>\n        `;
        grid.appendChild(li);
      });
      container.appendChild(grid);
    } catch (err) {
      console.error('TimezoneRenderer.renderZoneGrid failed', err);
    }
  }

  // Expose to global
  window.TimezoneRenderer = {
    renderZoneGrid
  };
})();
