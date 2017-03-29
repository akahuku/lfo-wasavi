/**
 * Local Filesystem Operator for wasavi
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2016-2017 akahuku, akahuku@gmail.com
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

function displayRootPath (dir) {
	chrome.fileSystem.getDisplayPath(dir, path => {
		var d1 = document.getElementById('d1');
		d1.textContent = path;
		d1.style.color = '#000';
	});
}

function displayHomePath (path) {
	var t3 = document.getElementById('t3');
	t3.value = path;
}

var timer;
function setMessage (message) {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}

	var div = document.getElementById('message');
	if (!div) return;

	div.textContent = message;
	timer = setTimeout(() => {
		div.textContent = '';
	}, 5000);
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
		bg.setHomePath(document.getElementById('t3').value);

		setMessage(chrome.i18n.getMessage('home_path_updated'));
	})
}, false);

/*
document.getElementById('button-save').addEventListener('click', function (e) {
}, false);

document.getElementById('button-load').addEventListener('click', function (e) {
	chrome.runtime.sendMessage(
		{
			command: 'read',
			path: document.getElementById('t1').value,
			encoding:'UTF-8'
		},
		function (response) {
			if (!response) {
				setMessage('response is invalid.');
				return;
			}
			if (response.error) {
				setMessage('error: ' + response.error);
				return;
			}
			document.getElementById('t2').value = response.content;
		}
	);
}, false);
 */

chrome.runtime.getBackgroundPage(bg => {
	bg.getBasePath((entry, homePath) => {
		console.dir(entry);
		console.dir(homePath);
		if (entry) {
			displayRootPath(entry);
		}
		if (homePath) {
			displayHomePath(homePath);
		}
	});
});

Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), node => {
	var key = node.dataset.i18n;
	var localized = chrome.i18n.getMessage(key);
	if (typeof localized == 'string' && localized != '') {
		node.textContent = localized;
	}
});

document.addEventListener('DOMContentLoaded', e => {
	document.body.style.visibility = 'visible';
});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
