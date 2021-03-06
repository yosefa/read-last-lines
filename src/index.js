"use strict";
const fsp = require("fs-promise");

const NEW_LINE_CHARACTERS = ["\n", "\r"];

module.exports = {

	/**
	 * Read in the last `n` lines of a file
	 * @param  {string}  file (direct or relative path to file.)
	 * @param  {int}     maxLineCount max number of lines to read in.
	 * @return {promise} new Promise, resolved with lines or rejected with error.
	 */

	read: function(input_file_path, maxLineCount) {
		const readPreviousChar = function( stat, file, currentCharacterCount) {
			return fsp.read(file, new Buffer(1), 0, 1, stat.size - 1 - currentCharacterCount)
				.then((bytesReadAndBuffer) => {
					return String.fromCharCode(bytesReadAndBuffer[1][0]);
				});
		};

		return new Promise((resolve, reject) => {
			let self = {
				stat: null,
				file: null,
			};

			fsp.exists(input_file_path)
			.then((exists) => {
				if (!exists) {
					throw new Error("file does not exist");
				}

			}).then(() => {
				let promises = [];

				// Load file Stats.
				promises.push(
					fsp.stat(input_file_path)
						.then(stat => self.stat = stat));

				// Open file for reading.
				promises.push(
					fsp.open(input_file_path, "r")
						.then(file => self.file = file));

				return promises;
			}).then((promises) => {
				return Promise.all(promises)
					.then(() => {
						let chars = 0;
						let lineCount = 0;
						let lines = "";

						const do_while_loop = function() {
							if (lines.length > self.stat.size) {
								lines = lines.substring(lines.length - self.stat.size);
							}

							if (lines.length >= self.stat.size || lineCount >= maxLineCount) {
								if (NEW_LINE_CHARACTERS.includes(lines.substring(0, 1))) {
									lines = lines.substring(1);
								}
								fsp.close(self.file);
								return resolve(lines);
							}

							readPreviousChar(self.stat, self.file, chars)
								.then((nextCharacter) => {
									lines = nextCharacter + lines;
									if (NEW_LINE_CHARACTERS.includes(nextCharacter) && lines.length > 1) {
										lineCount++;
									}
									chars++;
								})
								.then(do_while_loop);
						};
						do_while_loop();

					});
			}).catch((reason) => {
				if (self.file !== null) {
					fsp.close(self.file);
				}
				return reject(reason);
			});
		});
	},
};
