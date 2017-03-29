/**
 * Local Filesystem Operator for wasavi
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2017 akahuku, akahuku@gmail.com
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

const ACCEPT_IDS = [
	'dgogifpkoilgiofhhhodbodcfgomelhe',	// wasavi release version
	'ebphjmhbacdkdgfchhjmhailogkehfob',	// wasavi develop version
										// kokoni release version
	'oakajieejajdhkjajeppjefenobcnklp'	// kokoni develop version
];

/*
 * public functions
 */

function setBasePath (directoryEntry) {
	var basePath = chrome.fileSystem.retainEntry(directoryEntry);
	chrome.storage.local.set({'basePath': basePath});
}

function getBasePath (callback) {
	chrome.storage.local.get({
		basePath: '',
		homePath: ''
	}, values => {
		chrome.fileSystem.restoreEntry(values.basePath, directoryEntry => {
			if (chrome.runtime.lastError) {
				console.error(
					`getBasePath: restoring id (${values.basePath}) failed: ${chrome.runtime.lastError.message}`);
				callback();
			}
			else {
				callback(directoryEntry, values.homePath);
			}
		});
	});
}

function setHomePath (path) {
	path = path.replace(/\\/g, '/');

	if (path != '' && path.substr(-1) != '/') {
		path += '/';
	}

	chrome.storage.local.set({'homePath': path});
}

global.setBasePath = setBasePath;
global.getBasePath = getBasePath;
global.setHomePath = setHomePath;

/*
 * launch handler
 */

chrome.app.runtime.onLaunched.addListener(data => {
	chrome.app.window.create(
		'window.html',
		{
			outerBounds: {
				width: 800,
				height: 400
			}
		}
	);
});

/*
 * API entry
 */

function API (message, response) {
	function error (message) {
		if (chrome.runtime.lastError) {
			message += ` (${chrome.runtime.lastError.message})`;
		}

		response({error: message});
		response = null;
		console.error(message);
	}

	function getPath (path) {
		return path.replace(/^\//, '');
	}

	getBasePath(function gotBasePath (directoryEntry, homePath) {
		if (!directoryEntry) {
			return error('Missing root directory');
		}

		if (!homePath) {
			return error('Missing home path');
		}

		switch (message.command) {
		case 'read':
			/*
			 * request object: {
			 *     command:  'read',
			 *     path:     '/path/to/file',
			 *     type:     'arraybuffer' OR-ELSE  [optional]
			 *     encoding: 'encoding name',       [optional]
			 * }
			 *
			 * response object: {
			 *     path:    '/path/to/file',
			 *     name:    'basename-of-this-file',
			 *     content: CONTENT, <STRING> OR <ARRAYBUFFER>
			 * }
			 */

			if (!('path' in message)) {
				return error('Missing path');
			}

			var path = getPath(message.path);

			directoryEntry.getFile(path, {}, function gotReadFileEntry (fileEntry) {
				fileEntry.file(function gotFile (file) {
					var reader = new FileReader;

					reader.onloadend = function loadend (e) {
						function gotMetadata (metadata) {
							try {
								var payload = {
									path: path,
									name: fileEntry.name,
									content: reader.result
								};

								if (message.type != 'arraybuffer') {
									var decoder;
									try {
										decoder = new TextDecoder(message.encoding || 'UTF-8');
									}
									catch (ex) {
										return error(`Unknown encoding: ${message.encoding}`);
									}
									payload.content = decoder.decode(payload.content);
								}

								if (!(metadata instanceof DOMError)) {
									if ('modificationTime' in metadata) {
										payload.lastModified = metadata.modificationTime.getTime();
									}

									if ('size' in metadata) {
										payload.size = metadata.size;
									}
								}

								response(payload);
							}
							catch (ex) {
								error(`Exception occured: ${ex.message}`);
							}
							finally {
								reader = response = null;
							}
						}

						fileEntry.getMetadata(gotMetadata, gotMetadata);
					};

					reader.onerror = function loaderror (err) {
						error(`Failed to read: ${err.message}`);
						reader = null;
					};

					reader.readAsArrayBuffer(file);
				},
				function gotFileError (err) {
					error(`Failed to retrieve file representation object: ${err.message}`);
				});
			},
			function gotReadFileEntryError (err) {
				error(`Failed to read: ${err.message}`);
			});
			break;

		case 'write':
			/*
			 * request object: {
			 *     command:  'write',
			 *     path:     '/path/to/file',
			 *     content:  <STRING> OR <ARRAYBUFFER>,
			 *     encoding: 'encoding name'        [optional]
			 * }
			 *
			 * response object: {
			 *     path:    '/path/to/file',
			 *     name:    'basename-of-this-file',
			 *     content: SIZE IN BYTES, <NUMBER>
			 * }
			 */

			if (!('path' in message)) {
				return error('Missing path');
			}
			if (!('content' in message)) {
				return error('Missing content');
			}

			var path = getPath(message.path);

			directoryEntry.getFile(path, {create: true}, function gotWriteFileEntry (fileEntry) {
				fileEntry.createWriter(function gotWriter (writer) {
					writer.onwriteend = function writeend (e) {
						try {
							writer.onwriteend = null;
							writer.truncate(e.total);

							response({
								path: path,
								name: fileEntry.name,
								size: e.total
							});
						}
						catch (ex) {
							error(`Exception occured: ${ex.message}`);
						}
						finally {
							writer = response = null;
						}
					};

					writer.onerror = function writeerror (e) {
						error(`Failed to write: ${err.message}`);
						writer = null;
					};

					if (message instanceof ArrayBuffer) {
						writer.write(new Blob([message.content]));
					}
					else {
						var encoder;
						try {
							encoder = new TextEncoder(message.encoding || 'UTF-8');
						}
						catch (ex) {
							return error(`Unknown encoding: ${message.encoding}`);
						}

						writer.write(new Blob([encoder.encode(message.content)]));
					}
				},
				function gotWriterError (err) {
					error(`Failed to retrieve file writer object: ${err.message}`);
				});
			},
			function gotWriteFileEntryError (err) {
				error(`Failed to write: ${err.message}`);
			});
			break;

		case 'ls':
			/*
			 * request object: {
			 *     command:  'ls',
			 *     path:     '/path/to/directory'
			 * }
			 *
			 * response object: {
			 *     path:    '/path/to/directory',
			 *     name:    'basename-of-this-directory',
			 *     entries: [
			 *         {
			 *             name:       'basename-of-this-file',,
			 *             size:       '',
			 *             bytes:      <NUMBER>,
			 *             path:       '/path/to/file',
			 *             is_dir:     <BOOLEAN>
			 *             is_deleted: false,
			 *             id:         null,
			 *             modified:   null,
			 *             created:    null,
			 *             mime_type:  'application/octet-stream'
			 *         }, ...
			 *     ]
			 * }
			 */

			if (!('path' in message)) {
				return error('Missing path');
			}

			var path = getPath(message.path);

			directoryEntry.getDirectory(path, {}, function gotDirectoryEntry (dirEntry) {
				var reader = dirEntry.createReader();
				var entries = [];

				function readEntries () {
					reader.readEntries(function (subEntries) {
						if (subEntries.length) {
							entries.push.apply(entries, subEntries);
							return readEntries();
						}

						try {
							entries = entries.sort(function (a, b) {
								return a.name.localeCompare(b.name);
							})
							.map(function (entry) {
								return {
									name:       entry.name,
									size:       '',
									bytes:      0,
									path:       ('/' + path + '/' + entry.name).replace(/\/{2,}/, '/'),
									is_dir:     entry.isDirectory,
									is_deleted: false,
									id:         null,
									modified:   null,
									created:    null,
									mime_type:  'application/octet-stream'
								};
							});

							response({
								path: path,
								name: dirEntry.name,
								entries: entries
							});
						}
						catch (ex) {
							error(`Exception occured: ${ex.message}`);
						}
						finally {
							reader = response = null;
						}
					});
				}

				readEntries();
			},
			function gotDirectoryEntryError (err) {
				error(`Failed to open the directory: ${err.message}`);
			});
			break;

		case 'mv':
			/*
			 * request object: {
			 *     command:  'mv',
			 *     from:     '/path/to/source',
			 *     to:       '/path/to/destination'
			 * }
			 *
			 * response object: {
			 *     to:       '/path/to/completed/destination'
			 * }
			 */

			if (!('from' in message)) {
				return error('Missing source path');
			}

			if (!('to' in message)) {
				return error('Missing destination path');
			}

			(function () {
				var from = getPath(message.from);
				var to = getPath(message.to);
				var toBasename = '';

				// "to" has path + basename
				if (/^(.*\/)([^\/]+)$/.exec(to)) {
					to = RegExp.$1;
					toBasename = RegExp.$2;
				}
				// "to" is directory
				else if (to.substr(-1) == '/') {
					toBasename = /[^\/]+$/.exec(from)[0];
				}

				console.log([
					`      from: "${from}"`,
					`        to: "${to}"`,
					`toBasename: "${toBasename}"`
				].join('\n'));

				directoryEntry.getFile(from, {}, fromFileEntry => {
					console.log('got file');
					directoryEntry.getDirectory(to, {}, toDirEntry => {
						console.log('got directory');
						fromFileEntry.moveTo(
							toDirEntry, toBasename,
							() => {
								console.log('moved');
								response({
									to: to + toBasename
								});
							},
							err => {
								error(`Failed to move the file: ${err.message}`);
							}
						);
					}, err => {
						error(`Failed to retrieve destination directory entry: ${err.message}`);
					});
				}, err => {
					error(`Failed to retrieve source file entry: ${err.message}`);
				});
			})();
			break;

		case 'toLogicalPath':
			/*
			 * request object: {
			 *     command:  'toLogicalPath',
			 *     path:     '/absolute/path'
			 * }
			 *
			 * response object: {
			 *     logicalPath: '/logical/path'
			 * }
			 */

			if (!('path' in message)) {
				return error('Missing path');
			}

			(function () {
				var result = message.path;

				if (homePath == '') {
					return error(`homePath is empty.`);
				}

				if (!/^([a-z]:)?[\\\/]/i.test(result)) {
					return error(`"${result}" is not an absolute path.`);
				}

				if (result.indexOf(homePath) == 0) {
					result = '/' + result.substring(homePath.length);
				}

				response({
					logicalPath: result
				});
			})();
			break;

		default:
			return error(`Unknown command: "${message.command}"`);
		}
	});

	return true;
}

/*
 * message event handlers
 */

chrome.runtime.onMessageExternal.addListener(function (messageExternal, sender, response) {
	if (ACCEPT_IDS.indexOf(sender.id) < 0) {
		response({error: 'Forbidden'});
		return;
	}

	return API(messageExternal, response);
});

chrome.runtime.onMessage.addListener(function (message, sender, response) {
	return API(message, response);
});

/*
 * unused event handlers
 */

/*
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

*/

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
