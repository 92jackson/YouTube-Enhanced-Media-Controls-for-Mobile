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
			spring_k: 0.3, // follow spring toward finger; higher = tighter, lower = looser
			damping: 0.86, // follow damping; higher = smoother, lower = wobblier
			orbit_expand_ms: 120, // expand time; higher = slower expand, lower = quicker expand
			orbit_shrink_ms: 400, // shrink time; higher = slower shrink, lower = quicker shrink
			orbit_ease: 0.15, // radius smoothing; higher = smoother, lower = snappier
			swirl_factor: 0.15, // swirl intensity; higher = more swirl, lower = more direct
			swirl_when_still_factor: 0.35, // extra swirl when still; higher = wigglier
			wander_when_still_factor: 1.0, // idle scuttle; higher = more wander, lower = calmer
			pointer_vel_min_px: 0.75, // min pointer delta; higher = less sensitive, lower = more sensitive
			direction_change_hold_ms: 140, // pause length; higher = longer pause, lower = shorter
			direction_change_angle_deg: 75, // turn threshold; higher = bigger turn, lower = smaller
			direction_change_min_speed_px: 1.0, // speed threshold; higher = needs faster motion, lower = easier to trigger
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
		trail: {
			fade_alpha: 0.005, // trail fade; higher = fades quicker, lower = persists longer
			width_factor: 0.04, // trail thickness; higher = thicker, lower = thinner
		},
		fingers: {
			touch_px: 100, // touch radius; higher = larger influence, lower = tighter control
		},
		hit: {
			expand_px: 20, // invisible padding around spider; higher = larger touch target
		},
		drag: {
			start_threshold_px: 8, // movement needed to start drag; higher = harder to drag
		},
		boop: {
			enabled: true, // toggle boop animation on click/tap
			expand_ms: 90, // expansion phase duration; higher = slower rise, lower = snappier
			compress_ms: 120, // compression phase duration; higher = slower dip, lower = snappier
			settle_ms: 160, // settle duration; higher = slower return, lower = quicker settle
			wiggle_ms: 520, // wiggle duration after bounce; higher = longer wiggle, lower = shorter
			up_amp: {
				base: 0.22, // base expansion amount; higher = larger boop
				scale_factor: 0.06, // extra expansion per current scale; higher = more reactive when large
				max: 0.35, // expansion cap; higher = bigger peak, lower = safer ceiling
			},
			down_amp_ratio: 0.55, // compression depth relative to expansion; higher = deeper dip
			wiggle_amp_deg: 18, // max rotational wiggle in degrees; higher = wobblier
			wiggle_freq: 3.2, // wiggle frequency; higher = faster oscillation, lower = smoother
			hold_amp: 0.12, // scale increase while holding without dragging; higher = larger hold
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
	const hideSpiderInput = document.getElementById('hideEasterEggSpider');
	if (hideSpiderInput) {
		spiderHidden = !!hideSpiderInput.checked;
		if (spiderHidden) {
			spider.style.display = 'none';
		}
		hideSpiderInput.addEventListener('change', (ev) => {
			const hide = !!ev.target.checked;
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
			} else {
				spider.style.display = '';
				// restart scuttle loop and (maybe) peek scheduling
				prevTime = 0;
				pickParams();
				scuttleRAF = requestAnimationFrame(stepScuttle);
				if (userInteracted) schedulePeek();
			}
		});
	}

	let scale = 1;
	let clickCount = 0;
	let messageTimer = null;
	let decayTimeout = null;
	let decayInterval = null;

	// Boop animation state
	let boopActive = false;
	let boopRAF = null;
	let boopHoldActive = false;
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
		trailCanvas.style.width = '100vw';
		trailCanvas.style.height = '100vh';
		trailCanvas.style.pointerEvents = 'none';
		trailCanvas.style.zIndex = '10';
		trailCanvas.style.opacity = '0';
		document.body.appendChild(trailCanvas);
		trailCtx = trailCanvas.getContext('2d');
		resizeTrailCanvas();
	}

	function resizeTrailCanvas() {
		if (!trailCanvas) return;
		const dpr = window.devicePixelRatio || 1;
		trailCanvas.width = Math.floor(window.innerWidth * dpr);
		trailCanvas.height = Math.floor(window.innerHeight * dpr);
		trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
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
					trailCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
				}, 3000);
			}
		}
	}

	function drawTrail(x1, y1, x2, y2, widthPx) {
		if (!trailActive || !trailCtx) return;
		// gentle fade each frame
		trailCtx.fillStyle = 'rgba(255,255,255,' + SPIDER_TUNE.trail.fade_alpha + ')';
		trailCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
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

	function startRushToNearestCrumb() {
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
		if (rushActive || summonActive || followActive || peekActive || settleActive) {
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
			if (rushActive) {
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
				const len = Math.hypot(dirX, dirY) || 1;
				dirX /= len;
				dirY /= len;
				const still = sinceMove > SPIDER_TUNE.follow.orbit_shrink_ms;
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
			(followActive || rushActive || summonActive || peekActive)
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
		const anchorDriven = followActive || rushActive || summonActive || peekActive;
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

	const grow = () => {
		if (!spider.classList.contains('active')) {
			spider.classList.add('active');
			// First activation: start larger
			scale = 2.0;
			clickCount = 0;
		} else {
			// Subsequent taps: grow steadily
			scale += 0.25;
			clickCount += 1;
		}
		apply();

		// Show message on tap/click; will be hidden on actual drag movement
		spider.classList.add('message-visible');
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => {
			spider.classList.remove('message-visible');
		}, SPIDER_TUNE.decay.delay_ms);

		// Reset and schedule decay after message phase
		stopDecay();
		if (!decayPaused) {
			decayTimeout = setTimeout(startDecay, SPIDER_TUNE.decay.delay_ms);
		}
	};

	// Feed-based growth: increase size when a crumb is eaten.
	// The bigger the crumb, the more growth is applied.
	const growFromCrumbSize = (crumbW) => {
		// Normalize crumb width to expected range
		const w = Math.max(4, Math.min(24, Number(crumbW) || 8));
		// Activate if not yet active
		if (!spider.classList.contains('active')) {
			spider.classList.add('active');
			// Start slightly larger on first feed
			scale = 1.6;
			clickCount = 0;
		} else {
			// Map width to growth delta: 4–24px => ~0.10–0.50
			const factor = (w - 4) / 20; // 0..1
			const delta = 0.1 + 0.4 * factor;
			scale = +(scale + delta).toFixed(3);
			clickCount += 1;
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
			createCrumbAt(crumbX, crumbY);
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
		decayPaused = true;
		stopDecay();
		try {
			spider.setPointerCapture(pointerId);
		} catch {}
		showClickMessage();
		boopHoldStart();
	});

	spider.addEventListener('pointermove', (ev) => {
		if (!dragging) {
			if (!dragCandidate) return;
			const dist = Math.hypot(ev.clientX - pressStartX, ev.clientY - pressStartY);
			const threshold = SPIDER_TUNE.drag?.start_threshold_px ?? 8;
			if (dist < threshold) {
				// still holding, keep boop hold active
				return;
			}
			// start dragging after surpassing threshold
			dragging = true;
			dragCandidate = false;
			blockPageScroll();
			spider.classList.add('dragging');
			boopHoldEnd();
			showTrail();
			// Hide the message upon starting drag
			if (spider.classList.contains('message-visible')) {
				if (messageTimer) clearTimeout(messageTimer);
				messageTimer = null;
				spider.classList.remove('message-visible');
			}
		}
		const nowMove = performance.now();
		const dx = ev.clientX - pointerX;
		const dy = ev.clientY - pointerY;
		pointerPrevX = pointerX;
		pointerPrevY = pointerY;
		pointerX = ev.clientX;
		pointerY = ev.clientY;
		pointerVelX = dx;
		pointerVelY = dy;
		followActive = true;
		lastPointerMoveTS = nowMove;

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
		// scurry to home (CSS anchor) after release
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const vw = window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
		const vh =
			window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
		const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
		const insetPx = parseFloat(insetStr) || 0;
		settleTargetX = vw - insetPx - halfW;
		settleTargetY = vh - insetPx - halfH;
		settleActive = true;
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
		// scurry to home if interaction cancels
		const rect = spider.getBoundingClientRect();
		const halfW = rect.width * 0.5;
		const halfH = rect.height * 0.5;
		const vw = window.innerWidth || document.documentElement.clientWidth || rect.right + halfW;
		const vh =
			window.innerHeight || document.documentElement.clientHeight || rect.bottom + halfH;
		const insetStr = getComputedStyle(spider).getPropertyValue('--spider-inset') || '0px';
		const insetPx = parseFloat(insetStr) || 0;
		settleTargetX = vw - insetPx - halfW;
		settleTargetY = vh - insetPx - halfH;
		settleActive = true;
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
	const defaultHideSpider =
		typeof defaultSettings !== 'undefined' &&
		defaultSettings &&
		typeof defaultSettings.hideEasterEggSpider !== 'undefined'
			? !!defaultSettings.hideEasterEggSpider
			: false;
	if (storageLocal && typeof storageLocal.get === 'function' && storageLocal.get.length === 1) {
		storageLocal
			.get({ hideEasterEggSpider: defaultHideSpider })
			.then((items) => {
				if (items && typeof items.hideEasterEggSpider !== 'undefined') {
					spiderHidden = !!items.hideEasterEggSpider;
					if (spiderHidden) spider.style.display = 'none';
				}
				startSpiderLoops();
			})
			.catch(() => startSpiderLoops());
	} else if (storageLocal && typeof storageLocal.get === 'function') {
		storageLocal.get({ hideEasterEggSpider: defaultHideSpider }, (items) => {
			if (items && typeof items.hideEasterEggSpider !== 'undefined') {
				spiderHidden = !!items.hideEasterEggSpider;
				if (spiderHidden) spider.style.display = 'none';
			}
			startSpiderLoops();
		});
	} else {
		startSpiderLoops();
	}
});
