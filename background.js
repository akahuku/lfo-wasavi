/**
 * Local Filesystem Operator
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2017-2018 akahuku, akahuku@gmail.com
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

const EXTENSION_ID_RELEASE = 'dkbdmkncpnepdbaneikhbbeiboehjnol';
const IS_RELEASE_VERSION = chrome.runtime.id == EXTENSION_ID_RELEASE;

const ACCEPT_IDS = [
	'dgogifpkoilgiofhhhodbodcfgomelhe',	// wasavi release version
	'ebphjmhbacdkdgfchhjmhailogkehfob',	// wasavi develop version on Xubuntu

	'jblddojmjdpfeplbfbofdhchpdeacocl',	// kokoni release version
	'oakajieejajdhkjajeppjefenobcnklp',	// kokoni develop version on Xubuntu
	'jcfjjaanepfkmfmgkoificegekicfgpb',	// kokoni develop version on Windows

	'gjbboehfbnlimbdpljoegcgoidokacno',	// akahukuplus release version
	'dhhlpndnaddibflgbafalbefkcnedhhp' 	// akahukuplus develop version on Xubuntu
];

/*
 * public functions
 */

function setBasePath (directoryEntry) {
	const basePath = chrome.fileSystem.retainEntry(directoryEntry);
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
				callback(directoryEntry, toInternalAbsolutePath(values.homePath));
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
 * private functions
 */

function toInternalAbsolutePath (homePath) {
	// C:\path\to\home -> c:/path/to/home
	return homePath
		.replace(/^[A-Z]:/, $0 => $0.toLowerCase())
		.replace(/\\/g, '/');
}

/*
 * launch handler
 */

chrome.app.runtime.onLaunched.addListener(data => {
	chrome.app.window.create(
		'window.html',
		{
			outerBounds: {
				width: 800,
				height: IS_RELEASE_VERSION ? 400 : 640
			}
		}
	);
});

/*
 * API entry
 */

function API (message, response) {
	getBasePath((directoryEntry, homePath) => {
		function error () {
			let errorMessages = Array.prototype.map.call(arguments, arg => {
				if (arg instanceof Error) {
					console.error(arg.stack || arg.message);
					return arg.message;
				}
				else {
					return arg;
				}
			});

			if (chrome.runtime.lastError) {
				let lastError = chrome.runtime.lastError.errorMessage;
				console.error(lastError);
				errorMessages.unshift(`runtime error: ${lastError}`);
			}

			let errorMessage = errorMessages.join('\n');
			response({error: errorMessage});
			response = null;
		}

		function getPath (path) {
			return path
				.replace(/\\/g, '/')
				.replace(/^\s*(?:[a-z]:)?\//i, '');
		}

		function fixFullPath (fullPath) {
			// Chrome's implementation has a bug that
			// fileEntry#fullPath contains the parent
			// directory name of root.
			//
			// root: /home/akahuku
			// logical path: /foo/bar/baz.txt
			// fileEntry#fullPath: /akahuku/foo/bar/baz.txt
			//
			// so we have to strip the first path component.
			return fullPath.replace(/^\/[^\/]+\/?/, '/');
		}

		function getDirectoryPromise (path, options) {
			return new Promise((resolve, reject) => {
				directoryEntry.getDirectory(path, options || {},
					dirEntry => {resolve(dirEntry)},
					error => {reject(new Error(`Failed to retrieve directory object for "${path}"\n${error.message}`))}
				);
			});
		}

		function getFilePromise (path, options) {
			return new Promise((resolve, reject) => {
				directoryEntry.getFile(path, options || {},
					fileEntry => {resolve(fileEntry)},
					error => {reject(new Error(`Failed to retrieve file entry object for "${path}"\n${error.message}`))}
				);
			});
		}

		function getFileReaderPromise (fileEntry) {
			return new Promise((resolve, reject) => {
				fileEntry.file(
					file => {resolve(file)},
					error => {reject(new Error(`Failed to retrieve file object for "${fileEntry.fullPath}"\n${error.message}`))}
				);
			}).then(file => {
				return new Promise((resolve, reject) => {
					let reader = new FileReader;
					reader.onloadend = e => {resolve(e)};
					reader.onerror = error => {reject(new Error(`Failed to retrieve file reader object for "${fileEntry.fullPath}"\n${error.message}`))};
					reader.readAsArrayBuffer(file);
				});
			});
		}

		function getFileMetadataPromise (fileEntry) {
			return new Promise((resolve, reject) => {
				fileEntry.getMetadata(
					metadata => {resolve(metadata)},
					error => {reject(new Error(`Failed to retrieve metadata object for "${fileEntry.fullPath}"\n${error.message}`))}
				);
			});
		}

		function getFileWriterPromise (fileEntry, content) {
			return new Promise((resolve, reject) => {
				fileEntry.createWriter(
					writer => {
						writer.onwriteend = e => {resolve(e)};
						writer.onerror = error => {reject(new Error(`Failed to update file contents for "${fileEntry.fullPath}"\n${error.message}`))};
						writer.write(content);
					},
					error => {reject(new Error(`Failed to retrieve file writer object for "${fileEntry.fullPath}"\n${error.message}`))}
				);
			});
		}

		function getBlobFromURLPromise (dataUrl) {
			return new Promise((resolve, reject) => {
				let transport = new XMLHttpRequest;
				transport.onload = e => {resolve(transport.response)};
				transport.onerror = error => {reject(new Error(`Failed to retrieve blob object for "${fileEntry.fullPath}"\n${error.message}`))};
				transport.open('GET', dataUrl);
				transport.responseType = 'blob';
				transport.send();
			});
		}

		/*
		 * request object: {
		 *     command:  'read',
		 *     path:     '/path/to/file',
		 *     type:     'arraybuffer' OR-ELSE  [optional]
		 *     encoding: 'encoding name',       [optional]
		 * }
		 *
		 * response object: {
		 *     path:         '/path/to/file',
		 *     name:         'basename-of-this-file',
		 *     content:      CONTENT, <STRING> OR <ARRAYBUFFER>,
		 *     lastModified: UNIX TIMESTAMP USECS, <NUMBER>
		 *     bytes:        SIZE IN BYTES, <NUMBER>
		 * }
		 */

		function read (message) {
			if (!('path' in message)) {
				throw new Error('Missing path');
			}

			if (message.path == '') {
				throw new Error('path is empty');
			}

			let path = getPath(message.path);

			return getFilePromise(path).then(fileEntry => {
				return getFileReaderPromise(fileEntry).then(e => {
					return getFileMetadataPromise(fileEntry).then(metadata => {
						let payload = {
							path: fixFullPath(fileEntry.fullPath),
							name: fileEntry.name,
							content: e.target.result
						};

						if (message.type != 'arraybuffer') {
							let decoder;
							try {
								decoder = new TextDecoder(message.encoding || 'UTF-8');
							}
							catch (ex) {
								throw new Error(`Unknown encoding: ${message.encoding}`);
							}
							payload.content = decoder.decode(payload.content);
						}

						if ('modificationTime' in metadata) {
							payload.lastModified = metadata.modificationTime.getTime();
						}

						if ('size' in metadata) {
							payload.bytes = metadata.size;
						}

						response(payload);
					});
				});
			}).catch(err => {
				error('Failed to read:', err);
			});
		}

		/*
		 * request object: {
		 *     command:  'write',
		 *     path:     '/path/to/file',
		 *     content:  <STRING> OR <ARRAYBUFFER>,
		 *     type:     'url' OR-ELSE          [optional]
		 *     encoding: 'encoding name'        [optional]
		 * }
		 *
		 * response object: {
		 *     path:  '/path/to/file',
		 *     name:  'basename-of-this-file',
		 *     bytes: SIZE IN BYTES, <NUMBER>
		 * }
		 */

		function write (message) {
			if (!('path' in message)) {
				throw new Error('Missing path');
			}
			if (!('content' in message)) {
				throw new Error('Missing content');
			}

			let path = getPath(message.path);
			let fileEntry;

			return getFilePromise(path, {create: true})
			.then(f => {
				fileEntry = f;

				if ('type' in message && message.type == 'url') {
					return getBlobFromURLPromise(message.content);
				}

				let encoder;
				try {
					encoder = new TextEncoder(message.encoding || 'UTF-8');
				}
				catch (ex) {
					throw new Error(`Unknown encoding: ${message.encoding}`);
				}

				return new Blob([encoder.encode(message.content)])
			}).then(content => {
				return getFileWriterPromise(fileEntry, content).then(e => {
					e.target.truncate(e.total);

					response({
						path: fixFullPath(fileEntry.fullPath),
						name: fileEntry.name,
						lastModified: Date.now(),
						bytes: e.total
					});
				});
			}).catch(err => {
				error('Failed to write:', err);
			});
		}

		function writep (message) {
			if (!('path' in message)) {
				throw new Error('Missing path');
			}
			if (!('content' in message)) {
				throw new Error('Missing content');
			}

			let components = getPath(message.path).split('/');
			let basename = components.pop();
			let currentPath = [];
			let p = components.reduce((seq, component) => {
				currentPath.push(component);
				let path = currentPath.join('/');
				return seq.then(_ => getDirectoryPromise(path, {create:true}));
			}, Promise.resolve());

			p.then(() => {
				currentPath.push(basename);
				let writeMessage = Object.assign({}, message);
				writeMessage.command = 'write';
				return write(writeMessage);
			}).catch(err => {
				error('Failed to writep:', err);
			});

			return p;
		}

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
		 *             name:         'basename-of-this-file',,
		 *             bytes:        <NUMBER>,
		 *             path:         '/path/to/file',
		 *             is_dir:       <BOOLEAN>
		 *             is_deleted:   false,
		 *             id:           null,
		 *             lastModified: null,
		 *             created:      null,
		 *             mime_type:    'application/octet-stream'
		 *         }, ...
		 *     ]
		 * }
		 */

		function ls (message) {
			if (!('path' in message)) {
				throw new Error('Missing path');
			}

			let path = getPath(message.path);

			return getDirectoryPromise(path).then(dirEntry => {
				let reader = dirEntry.createReader();
				let entries = [];

				function readEntries () {
					reader.readEntries(subEntries => {
						if (subEntries.length) {
							entries.push.apply(entries, subEntries);
							return readEntries();
						}

						entries = entries
						.sort((a, b) => a.name.localeCompare(b.name))
						.map(entry => {
							return {
								name:         entry.name,
								bytes:        0,
								path:         fixFullPath(entry.fullPath),
								is_dir:       entry.isDirectory,
								is_deleted:   false,
								id:           null,
								lastModified: null,
								created:      null,
								mime_type:    'application/octet-stream'
							};
						});

						response({
							path: fixFullPath(dirEntry.fullPath),
							name: dirEntry.name,
							entries: entries
						});
					});
				}

				readEntries();
			}).catch(err => {
				error('Failed to ls:', err);
			});
		}

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

		function mv (message) {
			if (!('from' in message)) {
				throw new Error('Missing source path');
			}

			if (!('to' in message)) {
				throw new Error('Missing destination path');
			}

			let fromFileName = getPath(message.from);
			let toDirName = getPath(message.to);
			let toBasename = '';

			// "toDirName" has path + basename
			//
			// eg. /path/to/destination.txt
			if (/^(.*\/)([^\/]+)$/.exec(toDirName)) {
				toDirName = RegExp.$1;
				toBasename = RegExp.$2;
			}
			// "toDirName" is directory: pick up basename from source path
			//
			// eg. '/path/to/destination/'
			// eg. '/'
			// eg. ''
			else if (toDirName.substr(-1) == '/' || toDirName == '') {
				toBasename = /[^\/]+$/.exec(fromFileName)[0];
			}

			return Promise.all([
				getFilePromise(fromFileName),
				getDirectoryPromise(toDirName)
			]).then(values => {
				let fromFileEntry = values[0];
				let toDirEntry = values[1];

				fromFileEntry.moveTo(
					toDirEntry, toBasename,
					() => {
						response({
							to: toDirName + toBasename
						});
					},
					err => {
						throw new Error(`Failed to move the file\n${err.message}`);
					}
				);
			}).catch(err => {
				error('Failed to mv:', err);
			});
		}

		/*
		 * request object: {
		 *     command:  'toLogicalPath',
		 *     path:     '/absolute/path' or 'Z:\absolute\path'
		 * }
		 *
		 * response object: {
		 *     logicalPath: '/logical/path'
		 * }
		 *
		 * This command converts an absolute path on the local file system
		 * to logical path on the chrome-app's file system.
		 *
		 * homePath: "/home/akahuku/"
		 * argument: "/home/akahuku/pictures/foo.jpg"
		 *            ^^^^^^^^^^^^^ strip
		 *   result: "/pictures/foo.jpg"
		 */

		function toLogicalPath (message) {
			if (!('path' in message)) {
				throw new Error('Missing path');
			}

			if (homePath == '') {
				throw new Error('homePath is empty.');
			}

			let result = toInternalAbsolutePath(message.path);

			if (!/^([a-z]:)?\//.test(result)) {
				throw new Error(`"${result}" is not an absolute path.`);
			}

			if (result.indexOf(homePath) == 0) {
				result = '/' + result.substring(homePath.length);
			}

			response({
				logicalPath: result
			});
		}

		let commandMap = {
			read: read,
			write: write,
			writep: writep,
			ls: ls,
			mv: mv,
			toLogicalPath: toLogicalPath
		};

		try {
			if (!directoryEntry) {
				throw new Error('Missing root directory');
			}

			if (!homePath) {
				throw new Error('Missing home path');
			}

			if (!(message.command in commandMap)) {
				throw new Error(`Unknown command: "${message.command}"`);
			}

			commandMap[message.command](message);
		}
		catch (ex) {
			error(ex);
		}
	});

	return true;
}

/*
 * message event handlers
 */

chrome.runtime.onMessageExternal.addListener((messageExternal, sender, response) => {
	if (ACCEPT_IDS.indexOf(sender.id) < 0) {
		response({error: 'Forbidden'});
		return;
	}

	return API(messageExternal, response);
});

chrome.runtime.onMessage.addListener((message, sender, response) => {
	return API(message, response);
});

/*
 * unused event handlers
 */

/*
chrome.app.runtime.onRestarted.addListener(() => {
	console.log('chrome.app.runtime.onRestarted fired');
});

chrome.runtime.onStartup.addListener(() => {
	console.log('chrome.runtime.onStartup fired');
});

chrome.runtime.onInstalled.addListener(() => {
	console.log('chrome.runtime.onInstalled fired');
});

chrome.runtime.onSuspend.addListener(() => {
	console.log('chrome.runtime.onSuspend fired');
});

chrome.runtime.onConnect.addListener((port) => {
	console.log('chrome.runtime.onConnect fired');
});

chrome.runtime.onConnectExternal.addListener((port) => {
	console.log('chrome.runtime.onConnectExternal fired');
});

*/

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
