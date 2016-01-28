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

document.getElementById('b1').addEventListener('click', function (e) {
	chrome.fileSystem.chooseEntry(
		{type: 'openDirectory'},
		function (entry) {
			if (!entry) {
				alert(chrome.runtime.lastError.message);
				return;
			}

			chrome.runtime.getBackgroundPage(function (bg) {
				bg.setBasePath(entry);
			})

			displayPath(entry);
		}
	);
}, false);

chrome.runtime.getBackgroundPage(function (bg) {
	bg.getBasePath(function (entry) {
		if (entry) {
			displayPath(entry);
		}
	});
});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
