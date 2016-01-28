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

var ACCEPT_IDS = [
	'dgogifpkoilgiofhhhodbodcfgomelhe',	// wasavi release version
	'ebphjmhbacdkdgfchhjmhailogkehfob'	// wasavi develop version
];

/*
 * public functions
 */

function setBasePath (directoryEntry) {
	var basePath = chrome.fileSystem.retainEntry(directoryEntry);
	chrome.storage.local.set({'basePath': basePath});
}

function getBasePath (callback) {
	chrome.storage.local.get('basePath', function (values) {
		if (values && 'basePath' in values) {
			chrome.fileSystem.restoreEntry(values.basePath, function (directoryEntry) {
				if (chrome.runtime.lastError) {
					console.error(
						'getBasePath: restoring id (' + values.basePath + ') failed: ' + chrome.runtime.lastError.message);
					callback(undefined);
				}
				else {
					callback(directoryEntry);
				}
			});
		}
		else {
			callback(undefined);
		}
	});
}

global.setBasePath = setBasePath;
global.getBasePath = getBasePath;

/*
 * launch handler
 */

chrome.app.runtime.onLaunched.addListener(function handleLaunched (data) {
	chrome.app.window.create(
		'window.html',
		{
			'outerBounds': {
				'width': 800,
				'height': 400
			}
		}
	);
});

/*
 * API entry
 */

chrome.runtime.onMessageExternal.addListener(function handleMessageExternal (messageExternal, sender, response) {
	function error (message) {
		if (chrome.runtime.lastError) {
			message += ' (' + chrome.runtime.lastError.message + ')';
		}

		response({error: message});
		response = null;
	}

	if (ACCEPT_IDS.indexOf(sender.id) < 0) {
		return error('Forbidden');
	}

	getBasePath(function gotBasePath (directoryEntry) {
		if (!directoryEntry) {
			return error('Missing root directory');
		}

		if (!'path' in messageExternal) {
			return error('Missing path');
		}

		switch (messageExternal.command) {
		case 'read':
			directoryEntry.getFile(messageExternal.path, {}, function gotReadFileEntry (fileEntry) {
				fileEntry.file(function gotFile (file) {
					var reader = new FileReader;

					reader.onloadend = function loadend (e) {
						function gotMetadata (metadata) {
							var decoder;
							try {
								decoder = new TextDecoder(messageExternal.encoding || 'UTF-8');
							}
							catch (ex) {
								return error('Unknown encoding: ' + messageExternal.encoding);
							}

							var payload = {
								path: fileEntry.fullPath,
								name: fileEntry.name,
								content: decoder.decode(reader.payload)
							};

							if (!(metadata instanceof DOMError)) {
								if ('modificationTime' in metadata) {
									payload.lastModified = metadata.modificationTime.getTime();
								}

								if ('size' in metadata) {
									payload.size = metadata.size;
								}
							}

							response(payload);
							reader = response = null;
						}

						fileEntry.getMetadata(gotMetadata, gotMetadata);
					};

					reader.onerror = function loaderror (err) {
						error('Failed to read: ' + err.message);
						reader = null;
					};

					reader.readAsArrayBuffer(file);
				},
				function gotFileError (err) {
					error('Failed to retrieve file representation object: ' + err.message);
				});
			},
			function gotReadFileEntryError (err) {
				error('Failed to read: ' + err.message);
			});
			break;

		case 'write':
			directoryEntry.getFile(messageExternal.path, {create: true}, function gotWriteFileEntry (fileEntry) {
				fileEntry.createWriter(function gotWriter (writer) {
					writer.onwriteend = function writeend (e) {
						writer.onwriteend = null;
						writer.truncate(e.total);

						response({
							path: fileEntry.fullPath,
							name: fileEntry.name,
							size: e.total
						});
						writer = response = null;
					};

					writer.onerror = function writeerror (e) {
						error('Failed to write: ' + err.message);
						writer = null;
					};

					var encoder;
					try {
						encoder = new TextEncoder(messageExternal.encoding || 'UTF-8');
					}
					catch (ex) {
						return error('Unknown encoding');
					}

					writer.write(new Blob([encoder.encode(messageExternal.content)]));
				},
				function gotWriterError (err) {
					error('Failed to retrieve file writer object: ' + err.message);
				});
			},
			function gotWriteFileEntryError (err) {
				error('Failed to write: ' + err.message);
			});
			break;

		default:
			error('Unknown command: "' + messageExternal.command + '"');
			break;
		}
	});

	return true;
});

/*
 * unused handlers
 */

chrome.app.runtime.onRestarted.addListener(function () {
	console.log('chrome.app.runtime.onRestarted fired');
});

chrome.runtime.onStartup.addListener(function () {
	console.log('chrome.runtime.onStartup fired');
});

chrome.runtime.onInstalled.addListener(function () {
	console.log('chrome.runtime.onInstalled fired');
});

chrome.runtime.onSuspend.addListener(function () {
	console.log('chrome.runtime.onSuspend fired');
});

chrome.runtime.onConnect.addListener(function (port) {
	console.log('chrome.runtime.onConnect fired');
});

chrome.runtime.onConnectExternal.addListener(function (port) {
	console.log('chrome.runtime.onConnectExternal fired');
});

chrome.runtime.onMessage.addListener(function (message, sender, response) {
	console.log('chrome.runtime.onMessage fired');
});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
