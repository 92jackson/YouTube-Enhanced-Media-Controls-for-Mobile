// Tiny Spider Easter Egg — cumulative growth and message cycling
document.addEventListener('DOMContentLoaded', () => {
	// Tuning constants for spider sensitivities and behaviors
	const SPIDER_TUNE = {
		move: {
			spring_k: 0.035, // strength of anchor spring toward target; higher = snappier, lower = floatier
			damping: 0.86, // friction per step; higher = less bounce, lower = bouncier
			max_px_per_second: 180, // movement speed cap; higher = faster cap, lower = slower cap
		},
		follow: {
			spring_k: 0.24, // follow spring toward finger; higher = tighter snap, lower = floatier
			damping: 0.865, // follow damping; higher = smoother glide, lower = wobblier
			orbit_expand_ms: 100, // time to expand orbit when moving; higher = slower expand
			orbit_shrink_ms: 520, // time to shrink orbit when still; higher = slower shrink
			orbit_ease: 0.18, // smoothing of orbit radius; higher = smoother, lower = snappier
			swirl_factor: 0.16, // swirl intensity while moving; higher = more playful wobble
			swirl_when_still_factor: 0.45, // extra swirl when still; higher = more orbiting flair
			wander_when_still_factor: 4.0, // idle drift while still; higher = roams more, lower = calmer
			move_deadzone_px: 4.0, // ignore tiny finger jitters; higher = less sensitive
			pointer_vel_min_px: 1.0, // min finger delta to use velocity; higher = less sensitive
			direction_change_hold_ms: 180, // brief pause on sharp turns; higher = longer pause
			direction_change_angle_deg: 60, // turn threshold to trigger pause; higher = needs bigger turn
			direction_change_min_speed_px: 0.8, // min speed for pause; higher = needs faster motion
		},
		peek: {
			duration_ms: 3000, // linger time; higher = longer peek, lower = shorter
			arrival_radius_px: 25, // arrival distance; higher = stops farther, lower = gets closer
			scurry_k: 0.032, // peek scurry spring; higher = faster, lower = gentler
			scurry_damping: 0.86, // peek scurry damping; higher = less bounce, lower = more bounce
			edge_margin_px: 24, // edge margin; higher = farther from edges, lower = nearer
		},
		summon: {
			linger_ms: 900, // linger time; higher = longer, lower = shorter
			arrival_radius_px: 18, // arrival distance; higher = stops farther, lower = gets closer
			scurry_k: 0.035, // summon scurry spring; higher = faster, lower = gentler
			scurry_damping: 0.86, // summon scurry damping; higher = less bounce, lower = more bounce
		},
		settle: {
			arrival_radius_px: 18, // arrival distance; higher = stops farther, lower = gets closer
			scurry_k: 0.028, // home scurry spring; higher = faster, lower = gentler
			scurry_damping: 0.89, // home scurry damping; higher = less bounce, lower = more bounce
		},
		rush: {
			nibble_ms: 1600, // eating duration; higher = longer nibble, lower = shorter
			arrival_radius_px: 18, // pre-nibble arrival; higher = starts farther, lower = closer to food
			k: 0.027, // rush spring; higher = faster approach, lower = slower
			damping: 0.89, // rush damping; higher = less overshoot, lower = more
		},
		decay: {
			delay_ms: 5000, // shrink start delay; higher = later, lower = sooner
			interval_ms: 500, // shrink tick interval; higher = slower ticks, lower = quicker
			step: 0.05, // shrink per tick; higher = faster shrink, lower = gentler
		},
		growth: {
			feed: {
				first_activation_scale: 2.0, // scale set on first-ever feed; higher = larger start
				crumb_min_px: 4, // minimum crumb width considered for growth mapping
				crumb_max_px: 24, // maximum crumb width considered for growth mapping
				delta_min: 0.22, // minimum growth per feed for smallest crumbs
				delta_max: 0.6, // maximum growth per feed for largest crumbs
			},
		},
		trail: {
			fade_alpha: 0.005, // trail fade; higher = fades quicker, lower = persists longer
			width_factor: 0.04, // trail thickness; higher = thicker, lower = thinner
		},
		fingers: {
			touch_px: 60, // touch radius; higher = larger influence, lower = tighter control
		},
		hit: {
			expand_px: 50, // invisible padding around spider; higher = larger touch target
		},
		drag: {
			start_threshold_px: 8, // movement needed to start drag; higher = harder to drag
		},
		boop: {
			enabled: true, // toggle boop animation on click/tap
			expand_ms: 90, // expansion duration; lower = snappier pop, higher = slower rise
			compress_ms: 110, // compression duration; lower = snappier dip, higher = slower dip
			settle_ms: 180, // settle duration; higher = clearer return, lower = quicker settle
			wiggle_ms: 600, // wiggle duration after bounce; higher = longer flourish, lower = shorter
			up_amp: {
				base: 0.18, // base expansion amount; higher = larger pop, lower = subtler
				scale_factor: 0.08, // extra expansion per current scale; higher = more reactive when large
				max: 0.32, // expansion cap; higher = bigger peak, lower = safer ceiling
			},
			down_amp_ratio: 0.6, // compression depth relative to expansion; higher = deeper dip
			wiggle_amp_deg: 22, // max rotational wiggle in degrees; higher = more defined wiggle
			wiggle_freq: 3.0, // wiggle frequency; lower = smoother, higher = faster oscillation
			hold_amp: 0.14, // scale increase while holding without dragging; higher = larger hold
		},
		jail: {
			width_px: 100,
			height_px: 80,
			top_offset_px: 12,
		},
	};

	const messages = [
		'🕸️ Creep. Crawl. Scuttle. 🕷️',
		'👋 Hello, my name is Bidey. 🕷️',
		"😱 Don't be scared, I'm only small!",
		'🍔 Feed me? (double tap the screen to drop crumb).',
		'🚶‍♂️ Or take me for a walk (hold + drag).',
		"🎉 I was added as your pet to mark my creator's son's 2nd Birthday (he loves spiders). ❤️",
		'🧹 Mind the cobwebs.',
		"🦶 Eight tiny legs, don't tap too hard.",
		'BIDEY!!! 💨',
		'🕷️ Drag me; I promise not to bite. 😌',
		'🏠 Corners are cozy; I like to peek. 👀',
		'🕷️ Scuttle patrol in progress. 🚨',
		'🐞 Bug hunter by day, web spinner by night. 🌙',
		'👋 Tap to say hi.',
		"🌐 Don't mind me, I'm just crawling the web. 💻",
		"🙏 Please don't squish me. 😢",
		'🪳 Did someone say snack?',
		'🕷️ Just hanging out... literally.',
		'😎 Web designer at work.',
	];

	const spider = document.getElementById('easter-spider');
	const msgEl = document.getElementById('easter-spider-message');
	const svgEl = spider ? spider.querySelector('svg') : null;
	if (!spider) return;

	// Hide/remove easter egg when user enabled the option, and react to changes
	let spiderHidden = false;
	const showSpiderInput = document.getElementById('showEasterEggSpider');
	const enableEggsInput = document.getElementById('enableEasterEggs');

	// Default to hidden until we confirm settings, to avoid flash of unwanted spider
	if (spider) spider.style.display = 'none';
	spiderHidden = true;

	function updateSpiderVisibility() {
		let hide = false;

		// Check specific spider setting
		if (showSpiderInput) {
			if (!showSpiderInput.checked) hide = true;
		}

		// Check global setting
		if (enableEggsInput && !enableEggsInput.checked) {
			hide = true;
		}

		if (hide !== spiderHidden) {
			spiderHidden = hide;
			if (hide) {
				spider.style.display = 'none';
				// cancel running animations/timers and clear trail
				if (scuttleRAF) {
					cancelAnimationFrame(scuttleRAF);
					scuttleRAF = null;
				}
				if (peekTimeout) {
					clearTimeout(peekTimeout);
					peekTimeout = null;
				}
				if (messageTimer) {
					clearTimeout(messageTimer);
					messageTimer = null;
				}
				if (decayTimeout) {
					clearTimeout(decayTimeout);
					decayTimeout = null;
				}
				if (decayInterval) {
					clearInterval(decayInterval);
					decayInterval = null;
				}
				hideTrail();
				hideJailOverlay();
			} else {
				spider.style.display = '';
				// restart scuttle loop and (maybe) peek scheduling

				if (!scuttleRAF) {
					prevTime = 0;
					pickParams();
					scuttleRAF = requestAnimationFrame(stepScuttle);
					if (userInteracted) schedulePeek();
					if (jailActive) showJailOverlay();
				}
			}
		}
	}

	if (showSpiderInput) showSpiderInput.addEventListener('change', updateSpiderVisibility);
	if (enableEggsInput) enableEggsInput.addEventListener('change', updateSpiderVisibility);

	// Initial check
	updateSpiderVisibility();

	let scale = 1;
	let clickCount = 0;
	let messageTimer = null;
	let decayTimeout = null;
	let decayInterval = null;

	// Boop animation state
	let boopActive = false;
	let boopRAF = null;
	let boopHoldActive = false;
	let boopSvgTransitionOrig = '';
	let boopTransitionDisabled = false;
	let holdBaseScale = 1;
	let dragCandidate = false;
	let pressStartX = 0;
	let pressStartY = 0;

	// Block page scroll during touch hold/drag
	let touchMoveBlockerActive = false;
	const preventTouchDefault = (e) => e.preventDefault();
	function blockPageScroll() {
		if (touchMoveBlockerActive) return;
		touchMoveBlockerActive = true;
		try {
			document.addEventListener('touchmove', preventTouchDefault, { passive: false });
			document.addEventListener('touchstart', preventTouchDefault, { passive: false });
		} catch {}
		if (document.body) document.body.style.touchAction = 'none';
	}
	function unblockPageScroll() {
		if (!touchMoveBlockerActive) return;
		touchMoveBlockerActive = false;
		try {
			document.removeEventListener('touchmove', preventTouchDefault, false);
			document.removeEventListener('touchstart', preventTouchDefault, false);
		} catch {}
		if (document.body) document.body.style.touchAction = '';
	}

	// Scuttle engine
	let scuttleRAF = null;
	let t = 0;
	let posX = 0;
	let posY = 0;
	let rot = 0;
	let prevTime = 0;
	let params = {
		ax: 6,
		ay: 4,
		fx: 1,
		fy: 1,
		speed: 0.14, // loops per second (slow)
		jitter: 0.12,
		damping: 0.12, // position smoothing
		rotDamping: 0.18, // rotation smoothing
		walkAmp: 3, // degrees of side-to-side tilt
		walkRate: 2.0, // oscillations per scuttle phase
	};

	// Follow finger state
	let followActive = false;
	let dragging = false;
	let pointerId = null;
	let pointerX = 0;
	let pointerY = 0;
	let anchorRightPx = null;
	let anchorBottomPx = null;
	let prevCenterX = null;
	let prevCenterY = null;
	let decayPaused = false;
	let fingerRadiusPx = 28;
	let pointerPrevX = 0,
		pointerPrevY = 0,
		pointerVelX = 0,
		pointerVelY = 0;
	let followHoldUntil = 0,
		prevVelDirX = 0,
		prevVelDirY = 0;

	// Playful behaviors state
	let lastPointerMoveTS = 0;
	let orbitTargetR = null; // desired orbit radius
	let orbitRAnim = null; // smoothed orbit radius
	let rushActive = false; // rushing to treat
	let crumbEl = null;
	let crumbX = 0,
		crumbY = 0;
	let crumbs = [];
	let nibbleUntil = 0;
	let rushOffsetX = 0,
		rushOffsetY = 0,
		rushOffsetSet = false;
	let lastTapTS = 0,
		lastTapX = 0,
		lastTapY = 0;
	let trailCanvas = null,
		trailCtx = null,
		trailActive = false;

	function getViewportSize() {
		const vv = window.visualViewport;
		if (vv && typeof vv.width === 'number' && typeof vv.height === 'number') {
			return { w: Math.round(vv.width), h: Math.round(vv.height) };
		}
		return {
			w:
				window.innerWidth ||
				document.documentElement.clientWidth ||
				document.body?.clientWidth ||
				0,
			h:
				window.innerHeight ||
				document.documentElement.clientHeight ||
				document.body?.clientHeight ||
				0,
		};
	}
	let peekTimeout = null,
		peekActive = false,
		peekTargetX = 0,
		peekTargetY = 0;
	let summonActive = false,
		summonX = 0,
		summonY = 0,
		summonUntil = 0;
	let settleActive = false,
		settleTargetX = 0,
		settleTargetY = 0;
	let userInteracted = false;

	let jailActive = false,
		jailedCenterX = 0,
		jailedCenterY = 0;

	let suppressFollowUntil = 0;

	let jailOverlayEl = null;

	function ensureJailOverlay() {
		if (jailOverlayEl) return;
		jailOverlayEl = document.createElement('div');
		jailOverlayEl.style.position = 'fixed';
		jailOverlayEl.style.pointerEvents = 'none';
		jailOverlayEl.style.zIndex = '102';
		jailOverlayEl.style.opacity = '0';
		jailOverlayEl.style.transition = 'opacity 200ms ease';
		jailOverlayEl.style.borderRadius = '10px';
		jailOverlayEl.style.boxShadow =
			'0 1px 6px rgba(0,0,0,0.25), inset 0 0 0 2px rgba(255,255,255,0.15)';
		document.body.appendChild(jailOverlayEl);
		updateJailOverlay();
	}

	function updateJailOverlay() {
		if (!jailOverlayEl) return;
		const r = getJailRect();
		jailOverlayEl.style.left = r.left + 'px';
		jailOverlayEl.style.top = r.top + 'px';
		jailOverlayEl.style.width = r.right - r.left + 'px';
		jailOverlayEl.style.height = r.bottom - r.top + 'px';
		jailOverlayEl.style.backgroundImage = [
			'radial-gradient(circle at center, rgba(255,255,255,0.28) 1px, rgba(255,255,255,0.0) 2px)',
			'linear-gradient(45deg, rgba(255,255,255,0.18) 1px, rgba(255,255,255,0.0) 1px)',
			'linear-gradient(-45deg, rgba(255,255,255,0.18) 1px, rgba(255,255,255,0.0) 1px)',
		].join(',');
		jailOverlayEl.style.backgroundSize = '18px 18px, 22px 22px, 22px 22px';
		jailOverlayEl.style.backgroundPosition = 'center';
		jailOverlayEl.style.border = '2px dashed rgba(255,255,255,0.35)';
	}

	function showJailOverlay() {
		ensureJailOverlay();
		updateJailOverlay();
		jailOverlayEl.style.opacity = '1';
	}

	function hideJailOverlay() {
		if (jailActive) {
			showJailOverlay();
			return;
		}
		if (jailOverlayEl) jailOverlayEl.style.opacity = '0';
	}

	// Anchor physics (scurry motion)
	let velRight = 0,
		velBottom = 0;

	// Phases for peek/summon to-and-from behavior
	let peekPhase = 'idle',
		peekOriginX = 0,
		peekOriginY = 0,
		peekLingerUntil = 0;
	let summonPhase = 'idle',
		summonOriginX = 0,
		summonOriginY = 0,
		summonLingerUntil = 0;

	function ensureTrailCanvas() {
		if (trailCanvas) return;
		trailCanvas = document.createElement('canvas');
		trailCanvas.style.position = 'fixed';
		trailCanvas.style.left = '0';
		trailCanvas.style.top = '0';
		// Width/height are set dynamically in resizeTrailCanvas to match the visual viewport
		trailCanvas.style.pointerEvents = 'none';
		trailCanvas.style.zIndex = '101';
		trailCanvas.style.opacity = '0';
		document.body.appendChild(trailCanvas);
		trailCtx = trailCanvas.getContext('2d');
		resizeTrailCanvas();
	}

	function resizeTrailCanvas() {
		if (!trailCanvas) return;
		const dpr = window.devicePixelRatio || 1;
		const { w, h } = getViewportSize();
		trailCanvas.width = Math.floor(w * dpr);
		trailCanvas.height = Math.floor(h * dpr);
		trailCanvas.style.width = w + 'px';
		trailCanvas.style.height = h + 'px';
		trailCanvas.style.left = '0px';
		trailCanvas.style.top = '0px';
		trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		trailCtx.clearRect(0, 0, w, h);
	}

	function showTrail() {
		ensureTrailCanvas();
		trailActive = true;
		trailCanvas.style.opacity = '1';
	}

	function hideTrail(clear = true) {
		trailActive = false;
		if (trailCanvas) {
			trailCanvas.style.transition = 'opacity 3000ms ease';
			trailCanvas.style.opacity = '0';
			if (clear) {
				// Clear the canvas to remove any existing trail lines after the 3000ms transition
				setTimeout(() => {
					if (trailActive) return;
					const { w, h } = getViewportSize();
					trailCtx.clearRect(0, 0, w, h);
				}, 3000);
			}
		}
	}

	function drawTrail(x1, y1, x2, y2, widthPx) {
		if (!trailActive || !trailCtx) return;
		// gentle fade each frame
		const { w, h } = getViewportSize();
		trailCtx.fillStyle = 'rgba(255,255,255,' + SPIDER_TUNE.trail.fade_alpha + ')';
		trailCtx.fillRect(0, 0, w, h);
		trailCtx.beginPath();
		trailCtx.moveTo(x1, y1);
		trailCtx.lineTo(x2, y2);
		trailCtx.strokeStyle = 'rgba(0,0,0,0.25)';
		trailCtx.lineWidth = Math.max(1, widthPx);
		trailCtx.lineCap = 'round';
		trailCtx.stroke();
	}

	function createCrumbAt(x, y) {
		const el = document.createElement('div');
		const size = Math.round(6 + Math.random() * 10); // 6–16px
		const hue = Math.floor(Math.random() * 360);
		const sat = Math.floor(55 + Math.random() * 25);
		const lig = Math.floor(45 + Math.random() * 15);
		el.style.position = 'fixed';
		el.style.left = Math.round(x - size / 2) + 'px';
		el.style.top = Math.round(y - size / 2) + 'px';
		el.style.width = size + 'px';
		el.style.height = size + 'px';
		el.style.borderRadius = '50%';
		el.style.background = 'hsl(' + hue + ',' + sat + '%,' + lig + '%)';
		el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
		el.style.opacity = '1';
		el.style.transition = 'opacity 300ms ease';
		el.style.pointerEvents = 'none';
		el.style.willChange = 'transform, opacity';
		el.style.zIndex = '100';
		document.body.appendChild(el);
		return el;
	}

	function markInteracted() {
		if (!userInteracted) {
			userInteracted = true;
			// Kick off peek scheduling now that the user has interacted
			schedulePeek();
		}
	}

	function pickNearestCrumb(cx, cy) {
		if (!crumbs.length) return null;
		let best = null;
		let bestD = Infinity;
		for (let i = 0; i < crumbs.length; i++) {
			const c = crumbs[i];
			const d = Math.hypot(c.x - cx, c.y - cy);
			if (d < bestD) {
				bestD = d;
				best = c;
			}
		}
		return best;
	}

	function getJailRect() {
		const vw = window.innerWidth || document.documentElement.clientWidth;
		const width = Number(SPIDER_TUNE.jail?.width_px ?? 220);
		const height = Number(SPIDER_TUNE.jail?.height_px ?? 140);
		const top = Math.max(0, Number(SPIDER_TUNE.jail?.top_offset_px ?? 12));
		const left = Math.round(vw * 0.5 - width * 0.5);
		const right = left + width;
		const bottom = top + height;
		return { left, right, top, bottom, cx: left + width * 0.5, cy: top + height * 0.5 };
	}

	function clampToJail(x, y, halfW, halfH) {
		const r = getJailRect();
		const minX = r.left + halfW;
		const maxX = r.right - halfW;
		const minY = r.top + halfH;
		const maxY = r.bottom - halfH;
		const cx = Math.max(minX, Math.min(maxX, x));
		const cy = Math.max(minY, Math.min(maxY, y));
		return { x: cx, y: cy };
	}

	function startRushToNearestCrumb() {
		if (jailActive) return false;
		const rect = spider.getBoundingClientRect();
		const cx = rect.left + rect.width * 0.5;
		const cy = rect.top + rect.height * 0.5;
		const next = pickNearestCrumb(cx, cy);
		if (!next) return false;
		crumbX = next.x;
		crumbY = next.y;
		crumbEl = next.el;
		rushOffsetSet = false;
		rushActive = true;
		followActive = false;
		dragging = false;
		settleActive = false;
		return true;
	}

	function schedulePeek() {
		// Suppress peeking until the user interacts
		if (!userInteracted) {
			if (peekTimeout) {
				clearTimeout(peekTimeout);
				peekTimeout = null;
			}
			return;
		}
		if (peekTimeout) clearTimeout(peekTimeout);
		const delay = 8000 + Math.random() * 10000; // 8–18s
		peekTimeout = setTimeout(triggerPeek, delay);
	}

	function triggerPeek() {
		if (!userInteracted) {
			return; // hard gate: do not peek before interaction
		}
		if (jailActive) {
			schedulePeek();
			return;
		}
		// Only peek when idle
		if (dragging || followActive || rushActive || summonActive || scale > 1.25) {
			schedulePeek();
			return;
		}
		const vw = window.innerWidth || document.documentElement.clientWidth;
		const vh = window.innerHeight || document.documentElement.clientHeight;
		const edge = Math.floor(Math.random() * 4); // 0=left,1=right,2=top,3=bottom
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const margin = SPIDER_TUNE.peek.edge_margin_px;
		const alongX = margin + Math.random() * (vw - margin * 2);
		const alongY = margin + Math.random() * (vh - margin * 2);
		switch (edge) {
			case 0:
				peekTargetX = margin + halfW;
				peekTargetY = alongY;
				break;
			case 1:
				peekTargetX = vw - margin - halfW;
				peekTargetY = alongY;
				break;
			case 2:
				peekTargetX = alongX;
				peekTargetY = margin + halfH;
				break;
			case 3:
				peekTargetX = alongX;
				peekTargetY = vh - margin - halfH;
				break;
		}
		// start peek: scurry to target, linger, then return
		peekOriginX = rect.left + halfW;
		peekOriginY = rect.top + halfH;
		peekActive = true;
		peekPhase = 'to';
		peekLingerUntil = 0;
	}

	function pickParams() {
		const s = Math.min(scale, 3);
		const ampX = Math.min(18, 6 * s) * (0.95 + Math.random() * 0.1);
		const ampY = Math.min(14, 4 * s) * (0.95 + Math.random() * 0.1);
		params.ax = ampX;
		params.ay = ampY;
		params.fx = 0.9 + Math.random() * 0.2; // slight variance keeps it organic
		params.fy = 0.9 + Math.random() * 0.2;
		params.speed = 0.12 + Math.random() * 0.06; // 6–8s per loop
		params.jitter = 0.06 + Math.random() * 0.08; // subtle
	}

	function noise(n) {
		return Math.sin(n * 1.3) * 0.4 + Math.cos(n * 1.9) * 0.3;
	}

	function stepScuttle(now) {
		if (!prevTime) prevTime = now;
		const dt = Math.min(0.05, (now - prevTime) / 1000); // cap dt to avoid jumps
		prevTime = now;
		// advance phase: convert loops/sec to radians
		t += params.speed * dt * (Math.PI * 2);
		const baseX = Math.cos(t * params.fx) * params.ax;
		const baseY = Math.sin(t * params.fy) * params.ay;
		const jx = noise(t) * params.jitter * params.ax;
		const jy = noise(t + 2.17) * params.jitter * params.ay;
		const targetX = (baseX + jx) * (followActive ? 0.35 : 1);
		const targetY = (baseY + jy) * (followActive ? 0.35 : 1);
		// smooth towards target
		posX += (targetX - posX) * params.damping;
		posY += (targetY - posY) * params.damping;

		// Scurry anchor motion based on interactive states
		if (
			rushActive ||
			summonActive ||
			followActive ||
			peekActive ||
			settleActive ||
			jailActive
		) {
			const rect = spider.getBoundingClientRect();
			const halfW = rect.width * 0.5;
			const halfH = rect.height * 0.5;
			const vw =
				window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
			const vh =
				window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
			let centerTargetX = null;
			let centerTargetY = null;
			let k = SPIDER_TUNE.move.spring_k;
			let damping = SPIDER_TUNE.move.damping;
			const nowMs = performance.now();
			const cX = rect.left + halfW;
			const cY = rect.top + halfH;
			if (jailActive && !dragging) {
				const r = getJailRect();
				const baseX = jailedCenterX || r.cx;
				const baseY = jailedCenterY || r.cy;
				const wiggleX = posX * 0.6;
				const wiggleY = posY * 0.6;
				const desiredX = baseX + wiggleX;
				const desiredY = baseY + wiggleY;
				const clamped = clampToJail(desiredX, desiredY, halfW, halfH);
				centerTargetX = clamped.x;
				centerTargetY = clamped.y;
				k = SPIDER_TUNE.settle.scurry_k;
				damping = SPIDER_TUNE.settle.scurry_damping;
			} else if (rushActive) {
				// Approach food with a randomized side offset informed by facing direction
				if (!rushOffsetSet) {
					const dx0 = crumbX - cX;
					const dy0 = crumbY - cY;
					const len0 = Math.hypot(dx0, dy0) || 1;
					const nx = dx0 / len0;
					const ny = dy0 / len0;
					let mvx = 0,
						mvy = 0;
					if (prevCenterX != null && prevCenterY != null) {
						mvx = cX - prevCenterX;
						mvy = cY - prevCenterY;
					}
					const mvLen = Math.hypot(mvx, mvy) || 0;
					const dot = mvLen > 0 ? (mvx * nx + mvy * ny) / mvLen : 0;
					const side = Math.random() < 0.5 ? -1 : 1;
					const alongSign = dot >= 0 ? 1 : -1;
					const offsetR = Math.max(halfW * 0.6, SPIDER_TUNE.rush.arrival_radius_px * 0.8);
					rushOffsetX = -ny * side * offsetR + nx * (offsetR * 0.28 * alongSign);
					rushOffsetY = nx * side * offsetR + ny * (offsetR * 0.28 * alongSign);
					rushOffsetSet = true;
				}
				centerTargetX = crumbX + (rushOffsetSet ? rushOffsetX : 0);
				centerTargetY = crumbY + (rushOffsetSet ? rushOffsetY : 0);
				k = SPIDER_TUNE.rush.k;
				damping = SPIDER_TUNE.rush.damping;
				const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
				if (nibbleUntil === 0 && d < Math.max(halfW, SPIDER_TUNE.rush.arrival_radius_px)) {
					nibbleUntil = performance.now() + SPIDER_TUNE.rush.nibble_ms;
				}
				// During nibble phase, add small oscillations to simulate eating
				if (nibbleUntil && nowMs < nibbleUntil) {
					// Clamp offset so spider stands close to the food while eating,
					// scaling the clamp by the actual crumb size
					let crumbW = 8;
					if (crumbEl) {
						try {
							crumbW = Math.max(4, crumbEl.getBoundingClientRect().width || 8);
						} catch (e) {}
					}
					const nibbleR = Math.max(2, Math.min(crumbW * 0.5, halfW * 0.25));
					const baseOffX = rushOffsetSet
						? Math.max(-nibbleR, Math.min(nibbleR, rushOffsetX))
						: 0;
					const baseOffY = rushOffsetSet
						? Math.max(-nibbleR, Math.min(nibbleR, rushOffsetY))
						: 0;
					centerTargetX = crumbX + baseOffX;
					centerTargetY = crumbY + baseOffY;
					const eatAmp = Math.min(8, rect.width * 0.08);
					centerTargetX += Math.cos(t * 3.2) * eatAmp;
					centerTargetY += Math.sin(t * 3.4) * eatAmp;
					if (crumbEl) {
						const nibbleStart = nibbleUntil - SPIDER_TUNE.rush.nibble_ms;
						const pRaw = (nowMs - nibbleStart) / SPIDER_TUNE.rush.nibble_ms;
						const progress = Math.max(0, Math.min(1, pRaw));
						const baseShrink = 1 - 0.85 * progress;
						const pulse = 0.07 * Math.sin(t * 4.1) * (1 - progress);
						const scale = Math.max(0, baseShrink + pulse);
						crumbEl.style.transform = 'scale(' + scale.toFixed(3) + ')';
					}
				}
				if (nibbleUntil && performance.now() > nibbleUntil) {
					nibbleUntil = 0;
					rushActive = false;
					rushOffsetSet = false;
					rushOffsetX = 0;
					rushOffsetY = 0;
					// Apply growth based on the eaten crumb's size, then remove it
					if (crumbEl) {
						let eatenW = 8;
						try {
							eatenW = Math.max(4, crumbEl.getBoundingClientRect().width || 8);
						} catch {}
						growFromCrumbSize(eatenW);
						const eatenEl = crumbEl;
						crumbs = crumbs.filter((c) => c.el !== eatenEl);
						eatenEl.style.opacity = '0';
						setTimeout(() => eatenEl && eatenEl.remove(), 350);
						crumbEl = null;
					}
					if (!startRushToNearestCrumb()) {
						// After last nibble, scurry back to the spider's CSS anchor
						const insetStr =
							getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
						const insetPx = parseFloat(insetStr) || 0;
						settleTargetX = vw - insetPx - halfW;
						settleTargetY = vh - insetPx - halfH;
						settleActive = true;
					}
				}
			} else if (summonActive) {
				k = SPIDER_TUNE.summon.scurry_k;
				damping = SPIDER_TUNE.summon.scurry_damping;
				if (summonPhase === 'to') {
					centerTargetX = summonX;
					centerTargetY = summonY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.summon.arrival_radius_px)) {
						summonPhase = 'peek';
						summonLingerUntil = performance.now() + SPIDER_TUNE.summon.linger_ms;
					}
				} else if (summonPhase === 'peek') {
					centerTargetX = summonX;
					centerTargetY = summonY;
					if (performance.now() > summonLingerUntil) {
						summonPhase = 'return';
					}
				} else if (summonPhase === 'return') {
					centerTargetX = summonOriginX;
					centerTargetY = summonOriginY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.summon.arrival_radius_px)) {
						summonActive = false;
						summonPhase = 'idle';
					}
				}
			} else if (followActive) {
				k = SPIDER_TUNE.follow.spring_k;
				damping = SPIDER_TUNE.follow.damping;
				const orbitBase = rect.width * 0.85;
				const clearance = Math.max(20, fingerRadiusPx + halfW, orbitBase);
				const sinceMove = lastPointerMoveTS ? nowMs - lastPointerMoveTS : 9999;
				let targetR = clearance;
				if (sinceMove < SPIDER_TUNE.follow.orbit_expand_ms) {
					targetR = Math.max(targetR, orbitBase * 1.35);
				} else if (sinceMove > SPIDER_TUNE.follow.orbit_shrink_ms) {
					targetR = Math.max(clearance, orbitBase * 0.95);
				}
				if (orbitRAnim == null) orbitRAnim = targetR;
				orbitRAnim += (targetR - orbitRAnim) * SPIDER_TUNE.follow.orbit_ease;
				// hesitation on sharp direction changes
				const vMag = Math.hypot(pointerVelX, pointerVelY);
				if (vMag >= SPIDER_TUNE.follow.direction_change_min_speed_px) {
					const curDirX = pointerVelX / vMag;
					const curDirY = pointerVelY / vMag;
					if (prevVelDirX !== 0 || prevVelDirY !== 0) {
						const dot = curDirX * prevVelDirX + curDirY * prevVelDirY;
						const clamped = Math.max(-1, Math.min(1, dot));
						const angleDeg = Math.acos(clamped) * (180 / Math.PI);
						if (angleDeg >= SPIDER_TUNE.follow.direction_change_angle_deg) {
							followHoldUntil = nowMs + SPIDER_TUNE.follow.direction_change_hold_ms;
						}
					}
					prevVelDirX = curDirX;
					prevVelDirY = curDirY;
				}
				const holding = nowMs < followHoldUntil;
				// direction of travel: use pointer velocity when moving, else point away from finger
				let dirX = pointerVelX;
				let dirY = pointerVelY;
				if (Math.hypot(dirX, dirY) < SPIDER_TUNE.follow.pointer_vel_min_px) {
					dirX = cX - pointerX;
					dirY = cY - pointerY;
				}
				let len = Math.hypot(dirX, dirY);
				// Touch edge case: when the finger is centered on the spider,
				// the away vector can be zero. Fall back to a rotating unit
				// vector to establish a proper orbit around the finger.
				if (len < 1e-3) {
					dirX = Math.cos(t);
					dirY = Math.sin(t);
					len = 1;
				}
				dirX /= len;
				dirY /= len;
				const still = sinceMove > SPIDER_TUNE.follow.orbit_shrink_ms;
				// When the pointer is still, switch to a rotating direction
				// so the spider actively orbits around the finger instead of
				// parking in a fixed offset.
				if (still) {
					dirX = Math.cos(t);
					dirY = Math.sin(t);
				}
				const swirlFactor = still
					? SPIDER_TUNE.follow.swirl_when_still_factor
					: SPIDER_TUNE.follow.swirl_factor;
				const swirlX = Math.cos(t * 1.6) * orbitRAnim * swirlFactor;
				const swirlY = Math.sin(t * 1.6) * orbitRAnim * swirlFactor;
				const wanderX = still ? posX * SPIDER_TUNE.follow.wander_when_still_factor : 0;
				const wanderY = still ? posY * SPIDER_TUNE.follow.wander_when_still_factor : 0;
				if (holding) {
					centerTargetX = cX; // brief hesitation
					centerTargetY = cY;
				} else {
					centerTargetX = pointerX - dirX * clearance + swirlX + wanderX;
					centerTargetY = pointerY - dirY * clearance + swirlY + wanderY;
				}
			} else if (peekActive) {
				k = SPIDER_TUNE.peek.scurry_k;
				damping = SPIDER_TUNE.peek.scurry_damping;
				if (peekPhase === 'to') {
					centerTargetX = peekTargetX;
					centerTargetY = peekTargetY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.peek.arrival_radius_px)) {
						peekPhase = 'peek';
						peekLingerUntil = performance.now() + SPIDER_TUNE.peek.duration_ms;
					}
				} else if (peekPhase === 'peek') {
					centerTargetX = peekTargetX;
					centerTargetY = peekTargetY;
					if (performance.now() > peekLingerUntil) {
						peekPhase = 'return';
					}
				} else if (peekPhase === 'return') {
					centerTargetX = peekOriginX;
					centerTargetY = peekOriginY;
					const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
					if (d < Math.max(halfW, SPIDER_TUNE.peek.arrival_radius_px)) {
						peekActive = false;
						peekPhase = 'idle';
						schedulePeek();
					}
				}
			} else if (settleActive) {
				k = SPIDER_TUNE.settle.scurry_k;
				damping = SPIDER_TUNE.settle.scurry_damping;
				centerTargetX = settleTargetX;
				centerTargetY = settleTargetY;
				const d = Math.hypot(centerTargetX - cX, centerTargetY - cY);
				if (d < Math.max(halfW, SPIDER_TUNE.settle.arrival_radius_px)) {
					settleActive = false;
				}
			}

			if (centerTargetX != null && centerTargetY != null) {
				const targetRight = Math.max(4, vw - centerTargetX - halfW);
				const targetBottom = Math.max(4, vh - centerTargetY - halfH);
				if (anchorRightPx == null || anchorBottomPx == null) {
					// Initialize anchor to the spider's CURRENT position so the scurry
					// starts from where it is, rather than snapping to the target.
					const currentRight = Math.max(4, vw - cX - halfW);
					const currentBottom = Math.max(4, vh - cY - halfH);
					anchorRightPx = currentRight;
					anchorBottomPx = currentBottom;
					velRight = 0;
					velBottom = 0;
				} else {
					const accR = (targetRight - anchorRightPx) * k;
					const accB = (targetBottom - anchorBottomPx) * k;
					velRight = velRight * damping + accR;
					velBottom = velBottom * damping + accB;
					const maxStep = SPIDER_TUNE.move.max_px_per_second * dt;
					if (velRight > maxStep) velRight = maxStep;
					else if (velRight < -maxStep) velRight = -maxStep;
					if (velBottom > maxStep) velBottom = maxStep;
					else if (velBottom < -maxStep) velBottom = -maxStep;
					anchorRightPx += velRight;
					anchorBottomPx += velBottom;
				}
				spider.style.right = Math.round(anchorRightPx) + 'px';
				spider.style.bottom = Math.round(anchorBottomPx) + 'px';
			}
		} else if (anchorRightPx != null || anchorBottomPx != null) {
			// Reset to CSS-defined anchor when not following
			anchorRightPx = null;
			anchorBottomPx = null;
			spider.style.right = '';
			spider.style.bottom = '';
		}
		// orientation from motion vector
		// compute world movement based on center delta to face actual travel direction
		const rectNow = spider.getBoundingClientRect();
		const centerX = rectNow.left + rectNow.width * 0.5;
		const centerY = rectNow.top + rectNow.height * 0.5;
		// draw subtle trail while dragging
		if (trailActive && dragging && prevCenterX != null && prevCenterY != null) {
			drawTrail(
				prevCenterX,
				prevCenterY,
				centerX,
				centerY,
				Math.max(1, rectNow.width * SPIDER_TUNE.trail.width_factor)
			);
		}
		let mvX = targetX - posX;
		let mvY = targetY - posY;
		if (
			prevCenterX != null &&
			prevCenterY != null &&
			(followActive || rushActive || summonActive || peekActive || jailActive)
		) {
			mvX = centerX - prevCenterX;
			mvY = centerY - prevCenterY;
		}
		const angleTarget = Math.atan2(mvY, mvX) * (180 / Math.PI);
		// subtle side-to-side walking tilt, scaled by movement magnitude
		const moveMag = Math.hypot(mvX, mvY);
		const ampScale = Math.min(1, moveMag / 4);
		const walkOsc = Math.sin(t * params.walkRate) * params.walkAmp * ampScale; // degrees
		// default SVG faces downward at 0deg; subtract 90deg so head leads direction
		const headingOffset = -90;
		const angleWithWalk = angleTarget + headingOffset + walkOsc;
		rot += (angleWithWalk - rot) * params.rotDamping;
		const anchorDriven = followActive || rushActive || summonActive || peekActive || jailActive;
		const transformX = anchorDriven ? 0 : Math.round(posX);
		const transformY = anchorDriven ? 0 : Math.round(posY);
		spider.style.transform = `translate(${transformX}px, ${transformY}px)`;
		if (svgEl) svgEl.style.setProperty('--spider-rotate', `${Math.round(rot)}deg`);
		prevCenterX = centerX;
		prevCenterY = centerY;
		scuttleRAF = requestAnimationFrame(stepScuttle);
	}

	const apply = () => {
		spider.style.setProperty('--spider-scale', String(scale));
		const extra = 16 * (scale - 1);
		const inset = Math.max(0, Math.round(extra * 0.5));
		spider.style.setProperty('--spider-inset', inset + 'px');
		const msgOffset = Math.round(6 + Math.min(12, extra * 0.25));
		spider.style.setProperty('--spider-msg-offset', msgOffset + 'px');
		const hitPad = Math.round(SPIDER_TUNE.hit?.expand_px ?? 16);
		spider.style.setProperty('--spider-hit', hitPad + 'px');
		if (msgEl) msgEl.textContent = messages[clickCount % messages.length];
		pickParams();
	};

	const stopDecay = () => {
		if (decayTimeout) {
			clearTimeout(decayTimeout);
			decayTimeout = null;
		}
		if (decayInterval) {
			clearInterval(decayInterval);
			decayInterval = null;
		}
	};

	const startDecay = () => {
		stopDecay();
		decayInterval = setInterval(() => {
			if (scale <= 1) {
				scale = 1;
				apply();
				stopDecay();
				return;
			}
			scale = Math.max(1, +(scale - SPIDER_TUNE.decay.step).toFixed(3));
			apply();
		}, SPIDER_TUNE.decay.interval_ms);
	};

	// Feed-based growth: increase size when a crumb is eaten.
	// The bigger the crumb, the more growth is applied.
	const growFromCrumbSize = (crumbW) => {
		// Pull tuning constants
		const feedTune = SPIDER_TUNE.growth?.feed || {};
		const minW = Number(feedTune.crumb_min_px ?? 4);
		const maxW = Number(feedTune.crumb_max_px ?? 24);
		const deltaMin = Number(feedTune.delta_min ?? 0.18);
		const deltaMax = Number(feedTune.delta_max ?? 0.5);
		const firstScale = Number(feedTune.first_activation_scale ?? 1.8);
		// Normalize crumb width to expected range
		const wRaw = Number(crumbW) || minW;
		const w = Math.max(minW, Math.min(maxW, wRaw));
		const range = Math.max(1, maxW - minW);
		const factor = (w - minW) / range; // 0..1
		const delta = +(deltaMin + (deltaMax - deltaMin) * factor).toFixed(3);
		// Activate if not yet active
		if (!spider.classList.contains('active')) {
			spider.classList.add('active');
			scale = firstScale; // first-ever feed scale per tuning
		} else {
			scale = +(scale + delta).toFixed(3);
		}
		apply();
		// Reset and schedule decay after feed
		stopDecay();
		if (!decayPaused) {
			decayTimeout = setTimeout(startDecay, SPIDER_TUNE.decay.delay_ms);
		}
	};

	// Show message on click and advance the message index
	const showClickMessage = () => {
		clickCount += 1;
		apply();
		spider.classList.add('message-visible');
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => {
			spider.classList.remove('message-visible');
		}, SPIDER_TUNE.decay.delay_ms);
	};

	// Boop animation: quick scale bounce with a subtle wiggle
	const boop = () => {
		if (boopActive) return;
		if (SPIDER_TUNE.boop && SPIDER_TUNE.boop.enabled === false) return;
		boopActive = true;
		boopTransitionDisabled = false;
		try {
			if (svgEl) boopSvgTransitionOrig = window.getComputedStyle(svgEl).transition || '';
		} catch {}
		const baseScale = scale;
		const startTs = performance.now();
		const expandMs = SPIDER_TUNE.boop?.expand_ms ?? 110;
		const compressMs = SPIDER_TUNE.boop?.compress_ms ?? 90;
		const settleMs = SPIDER_TUNE.boop?.settle_ms ?? 140;
		const totalBounceMs = expandMs + compressMs + settleMs;
		const wiggleMs = SPIDER_TUNE.boop?.wiggle_ms ?? 420;
		const upAmpBase = SPIDER_TUNE.boop?.up_amp?.base ?? 0.1;
		const upAmpScaleFactor = SPIDER_TUNE.boop?.up_amp?.scale_factor ?? 0.04;
		const upAmpMax = SPIDER_TUNE.boop?.up_amp?.max ?? 0.18;
		const upAmp = Math.min(upAmpMax, upAmpBase + baseScale * upAmpScaleFactor);
		const downAmpRatio = SPIDER_TUNE.boop?.down_amp_ratio ?? 0.45;
		const downAmp = upAmp * downAmpRatio;
		const wigAmpDeg = SPIDER_TUNE.boop?.wiggle_amp_deg ?? 8;
		const wigFreq = SPIDER_TUNE.boop?.wiggle_freq ?? 3.4;

		const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

		const step = (now) => {
			const t = now - startTs;
			if (t <= totalBounceMs) {
				let sDelta = 0;
				if (t < expandMs) {
					const p = t / expandMs;
					sDelta = upAmp * easeOutCubic(p);
				} else if (t < expandMs + compressMs) {
					const p = (t - expandMs) / compressMs;
					sDelta = upAmp * (1 - p) - downAmp * p;
				} else {
					const p = (t - expandMs - compressMs) / settleMs;
					sDelta = -downAmp * easeOutCubic(p);
				}
				scale = +(baseScale + sDelta).toFixed(3);
				apply();
				boopRAF = requestAnimationFrame(step);
			} else if (t <= totalBounceMs + wiggleMs) {
				// Disable transform transition during wiggle to make it crisp
				if (svgEl && !boopTransitionDisabled) {
					svgEl.style.transition = 'transform 0ms';
					boopTransitionDisabled = true;
				}
				const tw = t - totalBounceMs;
				const p = tw / wiggleMs;
				const wigAmp = wigAmpDeg * (1 - p);
				const rotOffset = wigAmp * Math.sin(p * wigFreq * 2 * Math.PI);
				if (svgEl)
					svgEl.style.setProperty('--spider-rot-wiggle', rotOffset.toFixed(2) + 'deg');
				boopRAF = requestAnimationFrame(step);
			} else {
				// Preserve any growth that may have occurred during boop
				scale = Math.max(baseScale, scale);
				apply();
				if (svgEl) svgEl.style.setProperty('--spider-rot-wiggle', '0deg');
				// Restore original transition after wiggle
				try {
					if (svgEl) svgEl.style.transition = '';
				} catch {}
				boopActive = false;
			}
		};

		boopRAF = requestAnimationFrame(step);
	};

	// Start a held boop: keep a slight scale-up while finger is down
	const boopHoldStart = () => {
		if (boopHoldActive) return;
		boopHoldActive = true;
		holdBaseScale = scale;
		const holdAmp = SPIDER_TUNE.boop?.hold_amp ?? 0.08;
		scale = +(holdBaseScale + holdAmp).toFixed(3);
		apply();
		if (svgEl) svgEl.style.setProperty('--spider-rot-wiggle', '0deg');
	};

	// End a held boop: restore base scale
	const boopHoldEnd = () => {
		if (!boopHoldActive) return;
		boopHoldActive = false;
		scale = +holdBaseScale.toFixed(3);
		apply();
	};

	spider.addEventListener('pointerdown', (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		markInteracted();
		// Double-tap treats: detect quick consecutive taps near same location
		const nowTs = performance.now();
		const isQuickTap =
			nowTs - lastTapTS < 280 &&
			Math.hypot(ev.clientX - lastTapX, ev.clientY - lastTapY) < 25;
		lastTapTS = nowTs;
		lastTapX = ev.clientX;
		lastTapY = ev.clientY;
		if (isQuickTap) {
			fingerRadiusPx = SPIDER_TUNE.fingers.touch_px;
			crumbX = ev.clientX;
			crumbY = ev.clientY;
			// Create and track this crumb so post-nibble logic can remove it
			const el = createCrumbAt(crumbX, crumbY);
			crumbEl = el;
			crumbs.push({ x: crumbX, y: crumbY, el });
			rushActive = true;
			followActive = false;
			dragging = false;
			showClickMessage();
			boop();
			return; // do not start dragging on double-tap
		}
		dragCandidate = true;
		pressStartX = ev.clientX;
		pressStartY = ev.clientY;
		pointerId = ev.pointerId;
		pointerX = ev.clientX;
		pointerY = ev.clientY;
		fingerRadiusPx = SPIDER_TUNE.fingers.touch_px;
		pointerPrevX = pointerX;
		pointerPrevY = pointerY;
		pointerVelX = 0;
		pointerVelY = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		velRight = 0;
		velBottom = 0;
		followActive = false; // enable on move
		blockPageScroll();
		decayPaused = true;
		stopDecay();
		try {
			spider.setPointerCapture(pointerId);
		} catch {}
		showClickMessage();
		boopHoldStart();
	});

	spider.addEventListener('pointermove', (ev) => {
		// Always update pointer coordinates; only treat as movement if beyond deadzone
		const nowMove = performance.now();
		if (nowMove < suppressFollowUntil && !dragging) {
			pointerPrevX = pointerX;
			pointerPrevY = pointerY;
			pointerX = ev.clientX;
			pointerY = ev.clientY;
			pointerVelX = 0;
			pointerVelY = 0;
			return;
		}
		const dx = ev.clientX - pointerX;
		const dy = ev.clientY - pointerY;
		const moveMag = Math.hypot(dx, dy);
		const deadzone = SPIDER_TUNE.follow?.move_deadzone_px ?? 3.0;
		pointerPrevX = pointerX;
		pointerPrevY = pointerY;
		pointerX = ev.clientX;
		pointerY = ev.clientY;
		if (moveMag >= deadzone) {
			pointerVelX = dx;
			pointerVelY = dy;
			lastPointerMoveTS = nowMove;
		} else {
			// micro jitter: treat as still
			pointerVelX = 0;
			pointerVelY = 0;
		}

		if (!dragging) {
			if (!dragCandidate) return;
			const dist = Math.hypot(ev.clientX - pressStartX, ev.clientY - pressStartY);
			const threshold = SPIDER_TUNE.drag?.start_threshold_px ?? 8;
			if (dist < threshold) {
				// still holding, keep boop hold active; do not start drag
				return;
			}
			// start dragging after surpassing threshold
			dragging = true;
			followActive = true;
			dragCandidate = false;
			blockPageScroll();
			spider.classList.add('dragging');
			boopHoldEnd();
			showTrail();
			showJailOverlay();
			// Hide the message upon starting drag
			if (spider.classList.contains('message-visible')) {
				if (messageTimer) clearTimeout(messageTimer);
				messageTimer = null;
				spider.classList.remove('message-visible');
			}
		}

		// Hide the message while dragging (redundant safety)
		if (dragging && spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = null;
			spider.classList.remove('message-visible');
		}
	});

	spider.addEventListener('pointerup', (ev) => {
		if (ev.pointerId !== pointerId) return;
		if (!dragging && dragCandidate) {
			dragCandidate = false;
			boopHoldEnd();
		}
		dragging = false;
		unblockPageScroll();
		spider.classList.remove('dragging');
		followActive = false;
		decayPaused = false;
		try {
			spider.releasePointerCapture(pointerId);
		} catch {}
		// resume decay scheduling after drag ends
		if (scale > 1) {
			stopDecay();
			decayTimeout = setTimeout(startDecay, SPIDER_TUNE.decay.delay_ms);
		}
		// schedule message fade after release
		if (spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = setTimeout(() => {
				spider.classList.remove('message-visible');
			}, SPIDER_TUNE.decay.delay_ms);
		}
		pointerVelX = 0;
		pointerVelY = 0;
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const centerX = rect.left + halfW;
		const centerY = rect.top + halfH;
		const jr = getJailRect();
		if (
			centerX >= jr.left &&
			centerX <= jr.right &&
			centerY >= jr.top &&
			centerY <= jr.bottom
		) {
			const clamped = clampToJail(centerX, centerY, halfW, halfH);
			jailedCenterX = clamped.x;
			jailedCenterY = clamped.y;
			jailActive = true;
			settleTargetX = jailedCenterX;
			settleTargetY = jailedCenterY;
			settleActive = true;
			showJailOverlay();
		} else {
			const vw =
				window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
			const vh =
				window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
			const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
			const insetPx = parseFloat(insetStr) || 0;
			settleTargetX = vw - insetPx - halfW;
			settleTargetY = vh - insetPx - halfH;
			settleActive = true;
			jailActive = false;
			hideJailOverlay();
			suppressFollowUntil = performance.now() + 900;
		}
		velRight = 0;
		velBottom = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		hideTrail();
	});

	spider.addEventListener('pointercancel', () => {
		if (dragCandidate) {
			dragCandidate = false;
			boopHoldEnd();
		}
		dragging = false;
		unblockPageScroll();
		spider.classList.remove('dragging');
		followActive = false;
		decayPaused = false;
		if (scale > 1) {
			stopDecay();
			decayTimeout = setTimeout(startDecay, SPIDER_TUNE.decay.delay_ms);
		}
		if (spider.classList.contains('message-visible')) {
			if (messageTimer) clearTimeout(messageTimer);
			messageTimer = setTimeout(() => {
				spider.classList.remove('message-visible');
			}, SPIDER_TUNE.decay.delay_ms);
		}
		pointerVelX = 0;
		pointerVelY = 0;
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const centerX = rect.left + halfW;
		const centerY = rect.top + halfH;
		const jr = getJailRect();
		if (
			centerX >= jr.left &&
			centerX <= jr.right &&
			centerY >= jr.top &&
			centerY <= jr.bottom
		) {
			const clamped = clampToJail(centerX, centerY, halfW, halfH);
			jailedCenterX = clamped.x;
			jailedCenterY = clamped.y;
			jailActive = true;
			settleTargetX = jailedCenterX;
			settleTargetY = jailedCenterY;
			settleActive = true;
			showJailOverlay();
		} else {
			const vw =
				window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
			const vh =
				window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
			const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
			const insetPx = parseFloat(insetStr) || 0;
			settleTargetX = vw - insetPx - halfW;
			settleTargetY = vh - insetPx - halfH;
			settleActive = true;
			jailActive = false;
			hideJailOverlay();
			suppressFollowUntil = performance.now() + 900;
		}
		velRight = 0;
		velBottom = 0;
		followHoldUntil = 0;
		prevVelDirX = 0;
		prevVelDirY = 0;
		hideTrail();
	});

	spider.addEventListener('keydown', (ev) => {
		if (ev.key === 'Enter' || ev.key === ' ') {
			ev.preventDefault();
			markInteracted();
		}
	});

	// Tap-to-summon disabled: do not move spider on document taps
	document.addEventListener('pointerdown', () => {});

	// Global double-click feed: drop a crumb anywhere and scurry to it
	document.addEventListener('dblclick', (ev) => {
		if (!spider || spiderHidden) return;
		if (spider.contains(ev.target)) return;

		// Don't trigger spider if an input element is focused
		const activeElement = document.activeElement;
		if (
			activeElement &&
			(activeElement.tagName === 'INPUT' ||
				activeElement.tagName === 'SELECT' ||
				activeElement.tagName === 'TEXTAREA' ||
				activeElement.contentEditable === 'true')
		) {
			return;
		}

		const x = ev.clientX;
		const y = ev.clientY;
		const el = createCrumbAt(x, y);
		crumbs.push({ x, y, el });
		markInteracted();
		// If not currently feeding, go to the nearest crumb
		if (!rushActive && nibbleUntil === 0) {
			startRushToNearestCrumb();
		}
		// Do not show message bubble or change size on global feed
	});

	// Release global scroll block when touch interaction ends outside the spider
	document.addEventListener('pointerup', () => {
		if (touchMoveBlockerActive && !dragging) unblockPageScroll();
	});
	document.addEventListener('pointercancel', () => {
		if (touchMoveBlockerActive) unblockPageScroll();
	});

	window.addEventListener('resize', resizeTrailCanvas);
	window.addEventListener('resize', updateJailOverlay);

	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', resizeTrailCanvas);
		window.visualViewport.addEventListener('scroll', resizeTrailCanvas);
		window.visualViewport.addEventListener('resize', updateJailOverlay);
		window.visualViewport.addEventListener('scroll', updateJailOverlay);
	}

	// Start scuttle (deferred until stored visibility resolves)
	function startSpiderLoops() {
		prevTime = 0;
		// Ensure CSS variables (including --spider-hit) are initialized before first interaction
		apply();
		if (!spiderHidden) {
			scuttleRAF = requestAnimationFrame(stepScuttle);
			if (userInteracted) schedulePeek();
		}
	}
	const storageApi =
		typeof browser !== 'undefined' && browser.storage
			? browser.storage
			: typeof chrome !== 'undefined' && chrome.storage
				? chrome.storage
				: null;
	const storageLocal = storageApi ? storageApi.local : null;
	// Fallback default independent of options.js load order
	const defaultEnable =
		typeof window.userSettings !== 'undefined' &&
		window.userSettings &&
		typeof window.userSettings.enableEasterEggs !== 'undefined'
			? !!window.userSettings.enableEasterEggs
			: true;

	function applyStorageItems(items) {
		let hide = false;

		// 1. Check new show setting
		if (items && typeof items.showEasterEggSpider !== 'undefined') {
			if (items.showEasterEggSpider === false) hide = true;
			else hide = false;
		}

		// 2. Check global enable
		if (items && typeof items.enableEasterEggs !== 'undefined') {
			if (items.enableEasterEggs === false) hide = true;
		}

		// FORCE update internal state
		spiderHidden = hide;
		if (spiderHidden) {
			spider.style.display = 'none';
		} else {
			spider.style.display = '';
		}

		// Also update the UI toggle if it exists, to keep it in sync
		if (showSpiderInput) showSpiderInput.checked = !hide;
		// We don't update global enable checkbox here to avoid fighting with other scripts
	}

	if (storageLocal && typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
		storageLocal
			.get({
				showEasterEggSpider: true,
				enableEasterEggs: defaultEnable,
			})
			.then((items) => {
				applyStorageItems(items);
				startSpiderLoops();
			})
			.catch(() => startSpiderLoops());
	} else if (storageLocal && typeof storageLocal.get === 'function') {
		storageLocal.get(
			{
				showEasterEggSpider: true,
				enableEasterEggs: defaultEnable,
			},
			(items) => {
				applyStorageItems(items);
				startSpiderLoops();
			}
		);
	} else {
		startSpiderLoops();
	}
});
