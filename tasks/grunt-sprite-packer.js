/*
 * grunt-sprite-packer
 * https://github.com/karfcz/grunt-sprite-packer
 *
 * Copyright (c) 2013 Karel Fučík
 * Licensed under the MIT license.
 */

var name = require.resolve('../lib/sprite-packer.js');
delete require.cache[name];

module.exports = function(grunt) {

	var spritePackerTask = function()
	{
		var SpritePacker = require('../lib/sprite-packer.js').SpritePacker,
			spritePacker,
			files = this.files,
			options = this.options({
				template: null,
				destCss: null,
				baseUrl: null,
				name: null,
				padding: 0,
				background: 'none',
				format: 'png32',
				quality: '100%',
				evenPixels: false,
				svg: false,
				log: grunt.log.ok
			}),
			done = this.async(),
			counter = files.length;

		var donePart = function()
		{
			counter--;
			if(counter === 0) done();
		};

		for(var i = 0, l = counter; i < l; i++)
		{
			if(files[i].src.length === 0){
				grunt.log.ok('No sprites for destination ' + files[i].dest);
				donePart();
			}
			else
			{
				spritePacker = new SpritePacker(
				{
					files: files[i].src,
					outfile: files[i].dest,
					template: options.template,
					destCss: options.destCss,
					baseUrl: options.baseUrl,
					name: options.name,
					padding: options.padding,
					evenPixels: options.evenPixels,
					format: options.format,
					quality: options.quality,
					background: options.background,
					svg: options.svg,
					log: grunt.log.ok
				});
				spritePacker.run(donePart);
			}

		}
	};

	grunt.registerMultiTask('spritepackersvg', 'Converts multiple png images into one sprite image + generates text file with coords data through a handlebars template (typically Stylus/SASS/LESS or plain CSS)', spritePackerTask);
	grunt.registerMultiTask('spritepacker', 'Converts multiple png images into one sprite image + generates text file with coords data through a handlebars template (typically Stylus/SASS/LESS or plain CSS)', spritePackerTask);
	grunt.registerMultiTask('spritePacker', 'Converts multiple png images into one sprite image + generates text file with coords data through a handlebars template (typically Stylus/SASS/LESS or plain CSS)', spritePackerTask);

};
