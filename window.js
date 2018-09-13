/**
 * Local Filesystem Operator for wasavi
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2016-2018 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (global) {

'use strict';

const DEBUG = false;

function displayRootPath (dir) {
	chrome.fileSystem.getDisplayPath(dir, path => {
		let d1 = document.getElementById('d1');
		d1.textContent = path;
		d1.style.color = '#000';
	});
}

function displayHomePath (path) {
	let t1 = document.getElementById('t1');
	t1.value = path;
}

let timer;
function setMessage (message, displayTime) {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}

	let div = document.getElementById('message');
	if (!div) return;

	div.textContent = message;
	timer = setTimeout(() => {
		div.textContent = '';
	}, displayTime || 5000);
}

function handleDebugResponse (response) {
	if (response) {
		if ('content' in response) {
			document.getElementById('td2').value = response.content;
		}
		if ('error' in response) {
			setMessage('error: ' + response.error, 10000);
		}
		else {
			setMessage('operation succeeded.');
		}
		document.getElementById('td3').value = JSON.stringify(response, null, '  ');
	}
	else {
		setMessage('response is unavailable.', 10000);
	}
}

document.getElementById('b1').addEventListener('click', e => {
	chrome.fileSystem.chooseEntry({type: 'openDirectory'}, entry => {
		if (!entry) {
			setMessage(chrome.runtime.lastError.message);
			return;
		}

		chrome.runtime.getBackgroundPage(bg => {
			bg.setBasePath(entry);
		})

		displayRootPath(entry);

		setMessage(chrome.i18n.getMessage('base_path_updated', entry.fullPath));
	});
}, false);

document.getElementById('b2').addEventListener('click', e => {
	chrome.runtime.getBackgroundPage(bg => {
		bg.setHomePath(document.getElementById('t1').value);

		setMessage(chrome.i18n.getMessage('home_path_updated'));
	})
}, false);

/*
 * for read test
 */

DEBUG && document.getElementById('button-read').addEventListener('click', e => {
	chrome.runtime.sendMessage(
		{
			command: 'read',
			path: document.getElementById('td1').value,
			encoding:'UTF-8'
		},
		handleDebugResponse
	);
});

/*
 * for write test
 */

DEBUG && document.getElementById('button-write').addEventListener('click', e => {
	chrome.runtime.sendMessage(
		{
			command: 'write',
			path: document.getElementById('td1').value,
			content: document.getElementById('td2').value,
			encoding:'UTF-8'
		},
		handleDebugResponse
	);
});

/*
 * for writep test
 */

DEBUG && document.getElementById('button-writep').addEventListener('click', e => {
	let path = ['devel/lfo-wasavi/test'];
	for (let i = 0; i < 3; i++) {
		path.push((Math.floor(Math.random() * 0x10000)).toString(16));
	}
	path.push('test.txt');
	path = path.join('/');

	chrome.runtime.sendMessage(
		{
			command: 'writep',
			path: path,
			content: 'hello, world',
			encoding:'UTF-8'
		},
		handleDebugResponse
	);
});

/*
 * for ls test
 */

DEBUG && document.getElementById('button-ls').addEventListener('click', e => {
	chrome.runtime.sendMessage(
		{
			command: 'ls',
			path: document.getElementById('td1').value
		},
		handleDebugResponse
	);
});

/*
 * for mv test
 */

DEBUG && document.getElementById('button-mv').addEventListener('click', e => {
	let path = document.getElementById('td1').value.split(' ');
	chrome.runtime.sendMessage(
		{
			command: 'mv',
			from: path[0],
			to: path[1]
		},
		handleDebugResponse
	);
});

/*
 * bootstrap
 */

chrome.runtime.getBackgroundPage(bg => {
	bg.getBasePath((entry, homePath) => {
		//console.dir(entry);
		//console.dir(homePath);
		if (entry) {
			displayRootPath(entry);
		}
		if (homePath) {
			displayHomePath(homePath);
		}
	});
});

Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), node => {
	let key = node.dataset.i18n;
	let localized = chrome.i18n.getMessage(key);
	if (typeof localized == 'string' && localized != '') {
		node.textContent = localized;
	}
});

document.addEventListener('DOMContentLoaded', e => {
	document.body.style.visibility = 'visible';
});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
