// Load version number from manifest
function loadVersionNumber() {
	fetch(chrome.runtime.getURL('manifest.json'))
		.then((response) => response.json())
		.then((manifest) => {
			const versionElement = document.querySelector('.version-text');
			if (versionElement && manifest.version) {
				versionElement.textContent = `v${manifest.version}`;
			}
		})
		.catch((error) => {
			console.error('Failed to load version from manifest:', error);
			const versionElement = document.querySelector('.version-text');
			if (versionElement) {
				versionElement.textContent = 'Version unavailable';
			}
		});
}

// Open settings page
function openSettings() {
	chrome.runtime.openOptionsPage();

	// Close the popup after opening settings
	window.close();
}

function stripInlineMarkdown(text) {
	if (typeof text !== 'string') {
		return '';
	}
	return text.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '');
}

function appendInlineMarkdownText(parent, text) {
	if (!text) {
		return;
	}

	const codeParts = text.split(/`([^`]*)`/g);
	for (let i = 0; i < codeParts.length; i++) {
		const part = codeParts[i];
		const isCode = i % 2 === 1;
		if (!part) {
			continue;
		}

		if (isCode) {
			const code = document.createElement('code');
			code.textContent = part;
			parent.appendChild(code);
			continue;
		}

		let cursor = 0;
		while (cursor < part.length) {
			const start = part.indexOf('**', cursor);
			if (start === -1) {
				parent.appendChild(document.createTextNode(part.slice(cursor)));
				break;
			}

			const end = part.indexOf('**', start + 2);
			if (end === -1) {
				parent.appendChild(document.createTextNode(part.slice(cursor)));
				break;
			}

			if (start > cursor) {
				parent.appendChild(document.createTextNode(part.slice(cursor, start)));
			}

			const strong = document.createElement('strong');
			strong.textContent = part.slice(start + 2, end);
			parent.appendChild(strong);
			cursor = end + 2;
		}
	}
}

function parseChangelogVersions(markdown) {
	const lines = String(markdown || '').split(/\r?\n/);
	const versionHeaders = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = /^##\s+\[(\d+)\.(\d+)\.(\d+)\]\s*(?:-\s*(.+))?$/u.exec(line);
		if (!match) {
			continue;
		}
		versionHeaders.push({
			index: i,
			version: `${match[1]}.${match[2]}.${match[3]}`,
			major: Number.parseInt(match[1], 10),
			date: match[4] ? match[4].trim() : '',
		});
	}

	if (!versionHeaders.length) {
		return { lines, versions: [] };
	}

	const latestMajor = versionHeaders[0].major;
	const endIndex = versionHeaders.findIndex((v) => v.major !== latestMajor);
	const includedHeaders = endIndex === -1 ? versionHeaders : versionHeaders.slice(0, endIndex);

	const versions = includedHeaders.map((header, idx) => {
		const nextHeader = includedHeaders[idx + 1];
		const sectionEnd = nextHeader ? nextHeader.index : (endIndex === -1 ? lines.length : versionHeaders[endIndex].index);
		return {
			version: header.version,
			major: header.major,
			date: header.date,
			startLine: header.index + 1,
			endLine: sectionEnd,
		};
	});

	return { lines, versions };
}

function renderChangelog({ lines, versions }) {
	const details = document.getElementById('popup-changelog');
	const rangeEl = document.getElementById('popup-changelog-range');
	const contentEl = document.getElementById('popup-changelog-content');

	if (!details || !contentEl) {
		return;
	}

	contentEl.textContent = '';

	if (!versions.length) {
		contentEl.textContent = 'No changelog entries found.';
		if (rangeEl) {
			rangeEl.textContent = '';
		}
		return;
	}

	const latestMajor = versions[0].major;
	const oldestVersion = versions[versions.length - 1].version;
	const latestVersion = versions[0].version;

	if (rangeEl) {
		rangeEl.textContent =
			latestVersion === oldestVersion ? `v${latestVersion}` : `v${latestVersion}–${oldestVersion}`;
	}

	for (const versionSection of versions) {
		const versionTitle = document.createElement('div');
		versionTitle.className = 'changelog-version';
		versionTitle.textContent = `v${versionSection.version}`;
		contentEl.appendChild(versionTitle);

		if (versionSection.date) {
			const dateEl = document.createElement('div');
			dateEl.className = 'changelog-date';
			dateEl.textContent = versionSection.date;
			contentEl.appendChild(dateEl);
		}

		let currentList = null;
		let currentSectionTitle = null;

		const flushList = () => {
			if (currentList) {
				contentEl.appendChild(currentList);
				currentList = null;
			}
		};

		for (let i = versionSection.startLine; i < versionSection.endLine; i++) {
			const raw = lines[i] || '';
			const line = raw.trim();
			if (!line) {
				continue;
			}

			const heading3 = /^###\s+(.+)$/u.exec(line);
			const heading4 = /^####\s+(.+)$/u.exec(line);
			if (heading3 || heading4) {
				flushList();
				currentSectionTitle = stripInlineMarkdown((heading3 || heading4)[1]).trim();
				if (currentSectionTitle) {
					const sectionTitleEl = document.createElement('div');
					sectionTitleEl.className = 'changelog-section-title';
					sectionTitleEl.textContent = currentSectionTitle;
					contentEl.appendChild(sectionTitleEl);
				}
				continue;
			}

			const bulletMatch = /^-\s+(.+)$/u.exec(line);
			const dashDashMatch = /^--\s+(.+)$/u.exec(line);
			const numberedMatch = /^\d+\.\s+(.+)$/u.exec(line);
			const itemText = bulletMatch ? bulletMatch[1] : dashDashMatch ? dashDashMatch[1] : numberedMatch ? numberedMatch[1] : null;

			if (itemText) {
				if (!currentList) {
					currentList = document.createElement('ul');
					currentList.className = 'changelog-list';
				}
				const li = document.createElement('li');
				appendInlineMarkdownText(li, itemText.trim());
				currentList.appendChild(li);
				continue;
			}

			if (!currentSectionTitle) {
				if (!currentList) {
					currentList = document.createElement('ul');
					currentList.className = 'changelog-list';
				}
				const li = document.createElement('li');
				appendInlineMarkdownText(li, line);
				currentList.appendChild(li);
			}
		}

		flushList();
	}
}

function loadChangelog() {
	const contentEl = document.getElementById('popup-changelog-content');
	const details = document.getElementById('popup-changelog');
	if (!details || !contentEl) {
		return;
	}

	fetch(chrome.runtime.getURL('CHANGELOG.md'))
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			return response.text();
		})
		.then((markdown) => {
			renderChangelog(parseChangelogVersions(markdown));
		})
		.catch(() => {
			contentEl.textContent = 'Changelog unavailable.';
			const rangeEl = document.getElementById('popup-changelog-range');
			if (rangeEl) {
				rangeEl.textContent = '';
			}
		});
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
	loadVersionNumber();
	loadChangelog();

	// Add event listener to settings button
	const settingsButton = document.getElementById('open-settings');
	if (settingsButton) {
		settingsButton.addEventListener('click', openSettings);
	}
});
