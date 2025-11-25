
// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';
// When querying the real NASA APOD API we can use a key. This project will
// use your personal API key for requests (replace if you need to change it).
const NASA_API_KEY = 'JFSOJXvXbrEoRRl72fMe03GzGttaeE9wCrPzPbfR';

// Wait until the DOM is ready before querying elements.
document.addEventListener('DOMContentLoaded', () => {
	// Get references to the button, date inputs and gallery container in the page.
	const button = document.getElementById('getImageBtn');
	const startInput = document.getElementById('startDate');
	const endInput = document.getElementById('endDate');
	const gallery = document.getElementById('gallery');

	// Local array of fun space facts. A random one will be shown above the gallery
	// each time the page loads/refreshes.
	const spaceFacts = [
		"Space is completely silent — there's no atmosphere to carry sound.",
		"The hottest planet in our solar system is Venus, not Mercury.",
		"A day on Venus is longer than its year.",
		"There are more stars in the universe than grains of sand on all the world's beaches.",
		"Neutron stars can spin 600 times per second.",
		"Spacecraft can communicate with Earth across billions of kilometers using radio waves.",
		"The footprints on the Moon will likely stay for millions of years — there's no wind to erode them.",
		"Venus rotates clockwise — it's one of two planets that does (the other is Uranus).",
		"Saturn could float in water because it's mostly made of gas and has a low average density.",
		"A spoonful of a neutron star would weigh about a billion tons on Earth."
	];

	// Track the last shown fact index so the "New fact" button doesn't repeat
	// the same fact twice in a row.
	let lastFactIndex = -1;

	// Insert a random fact element directly above the gallery.
	function showRandomFact() {
		if (!gallery || !spaceFacts.length) return;

		let index;
		if (spaceFacts.length === 1) {
			index = 0;
		} else {
			// Pick a different index than lastFactIndex when possible.
			do {
				index = Math.floor(Math.random() * spaceFacts.length);
			} while (index === lastFactIndex);
		}

		lastFactIndex = index;
		const factText = spaceFacts[index];

		let factEl = document.querySelector('.space-fact');
		if (!factEl) {
			factEl = document.createElement('div');
			factEl.className = 'space-fact';
			// Insert the fact element before the gallery container
			gallery.parentNode.insertBefore(factEl, gallery);
		}
		factEl.textContent = factText;
	}

	// Show a random fact on each page load.
	showRandomFact();

	// Wire the "New fact" button so users can get another fact without reloading.
	const newFactBtn = document.getElementById('newFactBtn');
	if (newFactBtn) {
		newFactBtn.addEventListener('click', () => {
			showRandomFact();
		});
	}

	// Create modal elements and return helpers to open/close it.
	function createModal() {
		// Root overlay
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		overlay.setAttribute('aria-hidden', 'true');

		// Content box
		const box = document.createElement('div');
		box.className = 'modal-content';

		// Close button
		const closeBtn = document.createElement('button');
		closeBtn.className = 'modal-close';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.textContent = '✕';

		// Image element
		const img = document.createElement('img');
		img.className = 'modal-image';

		// Title and date
		const title = document.createElement('h2');
		title.className = 'modal-title';

		// Explanation paragraph
		const explanation = document.createElement('p');
		explanation.className = 'modal-explanation';

		// Assemble
		box.appendChild(closeBtn);
		box.appendChild(img);
		box.appendChild(title);
		box.appendChild(explanation);
		overlay.appendChild(box);
		document.body.appendChild(overlay);

		// Close on overlay click (but not when clicking the box)
		overlay.addEventListener('click', e => {
			if (e.target === overlay) close();
		});

		// Close on button
		closeBtn.addEventListener('click', close);

		// Close on ESC
		function onKey(e) {
			if (e.key === 'Escape') close();
		}
		document.addEventListener('keydown', onKey);

		function open(data) {
			overlay.setAttribute('aria-hidden', 'false');
			overlay.classList.add('open');
			img.src = data.hdurl || data.url || data.thumbnail_url || '';
			img.alt = data.title || 'NASA image';
			title.textContent = `${data.title || 'Untitled'}${data.date ? ' — ' + data.date : ''}`;
			explanation.textContent = data.explanation || '';
		}

		function close() {
			overlay.setAttribute('aria-hidden', 'true');
			overlay.classList.remove('open');
			// clear image src to help release memory on some browsers
			img.src = '';
		}

		return { open, close };
	}

	// Create a single modal instance we can reuse.
	const modal = createModal();

	// Helper: show a simple message inside the gallery area. Optionally render an action button.
	function showMessage(text, icon = '🔭', action) {
		// Use role="status" and aria-live so assistive tech is informed.
		// The `icon` parameter lets callers show a different emoji (e.g. hourglass while loading).
		// `action` is an optional object: { label: 'Try again', onClick: () => { ... } }
		const hasAction = action && action.label;
		gallery.innerHTML = `\n      <div class="placeholder" role="status" aria-live="polite">\n        <div class="placeholder-icon">${icon}</div>\n        <p>${text}</p>\n        ${hasAction ? `<div class="placeholder-action-wrap"><button class="placeholder-action" type="button">${action.label}</button></div>` : ''}\n      </div>`;

		// If an action callback was provided, attach it to the button we just inserted.
		if (hasAction && typeof action.onClick === 'function') {
			const btn = gallery.querySelector('.placeholder-action');
			if (btn) {
				btn.addEventListener('click', (e) => {
					// Provide immediate feedback and call the handler.
					// Prevent double-clicks by disabling the button.
					btn.disabled = true;
					action.onClick(e);
				});
			}
		}
	}

	// Fetch the APOD JSON and render images.
	async function fetchAndRenderImages() {
		// Disable the Get button while loading to avoid duplicate requests
		if (button) button.disabled = true;
		try {
			// Give the user immediate feedback (show hourglass while loading).
			showMessage('🔄 Loading space photos…', '⏳');

			// Build the request URL. If the user supplied start/end dates, use the
			// NASA APOD `start_date`/`end_date` endpoint. Otherwise fall back to the
			// static JSON mirror `apodData`.
			// We'll capture the requested start/end values so we can apply the
			// same range filtering to the local mirror if we need to fall back.
			let url = apodData;
			let startVal = '';
			let endVal = '';
			try {
				// Use input values; keep them in outer scope for fallback filtering.
				startVal = startInput && startInput.value ? startInput.value.trim() : '';
				endVal = endInput && endInput.value ? endInput.value.trim() : '';
				if (startVal || endVal) {
					// If only one date provided use single-date `date=` param,
					// otherwise use `start_date` and `end_date`.
					if (startVal && endVal && startVal > endVal) {
						// Swap if user entered dates in the wrong order.
						const tmp = startVal;
						startVal = endVal;
						endVal = tmp;
					}

					// Optional: limit the selectable range to avoid large responses
					// or hitting rate limits. We'll enforce a 30-day max range.
					if (startVal && endVal) {
						const startDateObj = new Date(startVal + 'T00:00:00');
						const endDateObj = new Date(endVal + 'T00:00:00');
						const dayDiff = Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
						if (dayDiff > 30) {
							showMessage('Please choose a date range of 30 days or fewer.');
							return;
						}
					}

					if (startVal && endVal) {
						url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&start_date=${startVal}&end_date=${endVal}`;
					} else if (startVal) {
						url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${startVal}`;
					} else {
						url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${endVal}`;
					}
				}
			} catch (e) {
				// If anything goes wrong building dates, silently fall back to mirror.
				// eslint-disable-next-line no-console
				console.warn('Invalid date inputs, using mirror JSON', e);
			}

			// Helper: fetch JSON with retries and exponential backoff.
			async function fetchJsonWithRetries(requestUrl, options = {}) {
				const maxAttempts = options.attempts || 3;
				const baseDelay = options.delayMs || 800;
				let lastError = null;
				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					try {
						// Provide quick status feedback while retrying.
						if (attempt > 1) showMessage(`Retrying… (attempt ${attempt} of ${maxAttempts})`, '⚠️');
						// Debug: log the final request URL so issues are easy to diagnose.
						// Open DevTools Network tab to inspect the request/response.
						// eslint-disable-next-line no-console
						console.log('Fetching APOD URL:', requestUrl, `(attempt ${attempt})`);
						const response = await fetch(requestUrl);
						if (!response.ok) {
							// Read body if possible for clearer messages.
							let bodyText = '';
							try { bodyText = await response.text(); } catch (e) { bodyText = response.statusText || String(response.status); }
							const statusErr = new Error(`HTTP ${response.status} ${response.statusText} — ${bodyText}`);
							// Retry on server errors (5xx) or rate limit (429).
							if ((response.status >= 500 || response.status === 429) && attempt < maxAttempts) {
								lastError = statusErr;
								const wait = baseDelay * Math.pow(2, attempt - 1);
								// eslint-disable-next-line no-await-in-loop
								await new Promise(r => setTimeout(r, wait));
								continue;
							}
							throw statusErr;
						}
						// If we can parse JSON, return it. Let JSON errors bubble up.
						const parsed = await response.json();
						return parsed;
					} catch (err) {
						// Network or parsing error.
						console.warn(`Fetch attempt ${attempt} failed:`, err);
						lastError = err;
						if (attempt < maxAttempts) {
							const wait = baseDelay * Math.pow(2, attempt - 1);
							// eslint-disable-next-line no-await-in-loop
							await new Promise(r => setTimeout(r, wait));
							continue;
						}
						throw lastError;
					}
				}
			}

			let data;
			let usedMirror = false;
			try {
				data = await fetchJsonWithRetries(url, { attempts: 3, delayMs: 800 });
			} catch (e) {
				// If the request failed and we were trying the real API, fall back to
				// the static JSON mirror. This helps when the API is down.
				console.warn('Primary APOD request failed, attempting mirror:', e);
				if (url !== apodData) {
					try {
						showMessage('API unavailable — loading mirror data…', '⏳');
						data = await fetchJsonWithRetries(apodData, { attempts: 2, delayMs: 600 });
						usedMirror = true;
					} catch (e2) {
						console.error('Mirror fetch also failed:', e2);
						showMessage(`Failed to load images: ${e2.message}`, '❌', {
							label: 'Try again',
							onClick: () => { fetchAndRenderImages(); }
						});
						return;
					}
				} else {
					console.error('Failed to fetch APOD data after retries:', e);
					showMessage(`Failed to load images: ${e.message}`, '❌', {
						label: 'Try again',
						onClick: () => { fetchAndRenderImages(); }
					});
					return;
				}
			}

			// NASA API sometimes returns an object with an error message.
			if (data && data.error && data.error.message) {
				showMessage(`API error: ${data.error.message}`);
				return;
			}
			if (data && data.msg) {
				showMessage(`API message: ${data.msg}`);
				return;
			}

			// The JSON could be an array or an object. Normalize to an array.
			console.log('APOD response:', data); // Debug log for clarity

			let items = [];
			if (Array.isArray(data)) {
				// Date range returns an array
				items = data;
			} else if (Array.isArray(data.items)) {
				items = data.items;
			} else if (Array.isArray(data.results)) {
				items = data.results;
			} else if (typeof data === 'object' && data.url) {
				// Single date response returns an object
				items = [data];
			} else {
				console.warn('Unexpected APOD response format:', data);
			}

			// If we used the mirror and the user provided a start/end date, filter
			// the returned items client-side to the requested range.
			if (usedMirror && (startVal || endVal) && items.length) {
				const s = startVal ? new Date(startVal + 'T00:00:00') : null;
				const e = endVal ? new Date(endVal + 'T00:00:00') : null;
				items = items.filter(it => {
					if (!it || !it.date) return false;
					const d = new Date(it.date + 'T00:00:00');
					if (s && e) return d >= s && d <= e;
					if (s) return d.getTime() === s.getTime();
					if (e) return d.getTime() === e.getTime();
					return false;
				});
				if (!items.length) {
					showMessage('No items found in the mirror for that date range.');
					return;
				}
			}

			// Filter for image-type entries (APOD uses media_type === 'image').
			const images = items.filter(item => {
				if (!item) return false;
				if (item.media_type && item.media_type.toLowerCase() === 'image') return true;
				const url = (item.url || item.hdurl || item.thumbnail_url || '').toString();
				return /\.(jpe?g|png|gif)$/i.test(url);
			});

			if (!images || images.length === 0) {
				showMessage('No image items found in the APOD data.');
				return;
			}

			// Clear gallery and render image cards.
			gallery.innerHTML = '';

			// Update a short status above the gallery to show how many items will
			// be displayed (created/updated below after rendering).
			let statusEl = document.querySelector('.gallery-status');
			if (!statusEl) {
				statusEl = document.createElement('div');
				statusEl.className = 'gallery-status';
				gallery.parentNode.insertBefore(statusEl, gallery);
			}
			images.forEach(item => {
				const card = document.createElement('figure');
				card.className = 'gallery-item';

				const img = document.createElement('img');
				img.src = item.url || item.hdurl || item.thumbnail_url || '';
				img.alt = item.title || 'NASA image';

				const caption = document.createElement('figcaption');
				const dateText = item.date ? ` — ${item.date}` : '';
				caption.textContent = `${item.title || 'Untitled'}${dateText}`;

				card.appendChild(img);
				card.appendChild(caption);
				gallery.appendChild(card);

				// Open modal when the image or card is clicked.
				card.style.cursor = 'zoom-in';
				card.addEventListener('click', () => {
					modal.open(item);
				});
			});

			// Animate cards in with a small stagger for a nicer entrance effect.
			const cards = Array.from(gallery.querySelectorAll('.gallery-item'));
			cards.forEach((c, i) => {
				setTimeout(() => c.classList.add('show'), i * 80);
			});

			// Show how many images were loaded.
			statusEl.textContent = `Showing ${images.length} image${images.length === 1 ? '' : 's'}.`;
			setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
		} catch (err) {
			// Log details to the console for debugging and show a friendly message.
			// Students can open DevTools (F12) to see the error.
			// eslint-disable-next-line no-console
			console.error('Failed to fetch APOD data', err);
			showMessage('Failed to load images. Check the console for details.');
		} finally {
			if (button) button.disabled = false;
		}
	}

	// Attach click handler to the button.
	if (button) {
		button.addEventListener('click', fetchAndRenderImages);
		// Allow pressing Enter in the date inputs to trigger the same fetch.
		if (startInput) startInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchAndRenderImages(); });
		if (endInput) endInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchAndRenderImages(); });
	} else {
		// If the expected button isn't present, log a helpful message.
		// eslint-disable-next-line no-console
		console.warn('Button with id "getImageBtn" not found in the page.');
	}
});