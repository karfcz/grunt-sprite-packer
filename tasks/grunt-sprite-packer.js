/*
 * grunt-sprite-packer
 * https://github.com/karfcz/grunt-sprite-packer
 *
 * Copyright (c) 2013 Karel Fučíkk
 * Licensed under the MIT license.
 */

// var name = require.resolve('../lib/sprite-packer.js');
// delete require.cache[name];

module.exports = function(grunt) {

	var spritePackerTask = function()
	{
		var files = this.files;
		if(!(files instanceof Array)) files = [files];
		if(files.length && files[0].src == ''){
			grunt.log.error('No sprites');
			return;
		}

		var done = this.async();
		var counter = files.length;
		var donePart = function(){
			counter--;
			if(counter === 0) done();
		};
		var SpritePacker = require('../lib/sprite-packer.js').SpritePacker;
		var options;

		for(var i = 0, l = counter; i < l; i++)
		{
			options = {
				files: grunt.file.expand( files[i].src ),
				outfile: files[i].dest,
				templateFile: this.data.options.template || this.data.template || null,
				outCss: this.data.options.destCss || this.data.destCss || null
			};

			if(this.data.options)
			{
				options.name = this.data.options.name || null;
				options.baseUrl = this.data.options.baseUrl || null;
			}

			var spritePacker = new SpritePacker(options);
			spritePacker.run(donePart);
		}
	};

	grunt.registerMultiTask('spritepacker', 'Converts multiple png images into one sprite image + generates text file with coords data through a handlebars template (typically Stylus/SASS/LESS or plain CSS)', spritePackerTask);
	grunt.registerMultiTask('spritePacker', 'Converts multiple png images into one sprite image + generates text file with coords data through a handlebars template (typically Stylus/SASS/LESS or plain CSS)', spritePackerTask);

};
