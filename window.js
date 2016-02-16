/**
 * Local Filesystem Operator for wasavi
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2016 akahuku, akahuku@gmail.com
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

function displayPath (dir) {
	chrome.fileSystem.getDisplayPath(dir, function (path) {
		var d1 = document.getElementById('d1');
		d1.textContent = path;
		d1.style.color = '#000';
	});
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
	timer = setTimeout(function () {
		div.textContent = '';
	}, 5000);
}

document.getElementById('b1').addEventListener('click', function (e) {
	chrome.fileSystem.chooseEntry(
		{type: 'openDirectory'},
		function (entry) {
			if (!entry) {
				setMessage(chrome.runtime.lastError.message);
				return;
			}

			chrome.runtime.getBackgroundPage(function (bg) {
				bg.setBasePath(entry);
			})

			displayPath(entry);

			setMessage(
				'"' + entry.fullPath + '"' +
				' has been registered as root directory of wasavi.');
		}
	);
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

chrome.runtime.getBackgroundPage(function (bg) {
	bg.getBasePath(function (entry) {
		if (entry) {
			displayPath(entry);
		}
	});
});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
