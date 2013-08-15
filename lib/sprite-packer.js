
var fs = require('fs');
var path = require('path');
var im = require('node-imagemagick');
var Handlebars = require('handlebars');
var packer = require('./packer-growing.js');

var SpritePacker = exports.SpritePacker = function(options)
{
	if(!options.padding) options.padding = 0;
	this.options = options;
	this.log = options.log || console.log;
	this.blocks = [];
};

SpritePacker.prototype = {

	run: function(done)
	{
		this.status = {
			convertDone: false,
			cssDone: false
		};
		this.done = done;
		this.identifyFiles();
	},

	identifyFiles: function()
	{
		var files = this.options.files;
		im.identify(files, this.identifyDone.bind(this));
	},

	identifyDone: function(err, output)
	{
		if(err) throw err;
		var lines = output.split('\n');
		var block;

		for(var i = 0; i < lines.length; i++)
		{
			block = this.processIdentifyLine(lines[i]);
			if(block) this.blocks.push(block);
		}
		this.pack();
	},

	processIdentifyLine: function(line)
	{
		var features, filePath, fileName, name, ext, dimSplit, width, height;
		features = line.split(' ');
		if(features.length > 1)
		{
			filePath = features[0].replace(/\[\d+\]$/, '');
			ext = path.extname(filePath);
			name = path.basename(filePath, ext);
			fileName = name + ext;

			dimSplit = features[2].split('x');
			width = parseInt(dimSplit[0], 10);
			height = parseInt(dimSplit[1], 10);

			if(this.options.evenPixels)
			{
				if(width % 2 !== 0) width++;
				if(height % 2 !== 0) height++;
			}

			return {
				w: width + this.options.padding * 2,
				h: height + this.options.padding * 2,
				imageWidth: width,
				imageHeight: height,
				name: name,
				ext: ext,
				fileName: fileName,
				filePath: filePath
			};
		}
		return null;
	},

	pack: function()
	{
		var sort = function(a ,b)
		{
			var maxA = Math.max(a.w, a.h), maxB = Math.max(b.w, b.h);
			if(maxA > maxB) return -1;
			if(maxA < maxB) return 1;
			return 0;
		};
		var packer = new GrowingPacker();
		this.blocks = this.blocks.sort(sort);
		packer.fit(this.blocks);

		this.convert();
		this.createCss();
	},

	convert: function()
	{
		var convertParams = ['-size', '', 'xc:none', '-strip'];
		var size = this.size = { w: 0, h: 0 };
		var block;
		var outputFile = this.options.outfile;

		for(var i = 0 ; i < this.blocks.length ; i++)
		{
			block = this.blocks[i];
			if(block.fit)
			{
				if(block.fit.x + block.w > size.w) size.w = block.fit.x + block.w;
				if(block.fit.y + block.h > size.h) size.h = block.fit.y + block.h;

				convertParams.push(block.filePath);
				convertParams.push('-geometry');
				convertParams.push('+' + (block.fit.x + this.options.padding) + '+' + (block.fit.y + this.options.padding));
				convertParams.push('-composite');
			}
		}

		convertParams[1] = size.w + 'x' + size.h;
		convertParams.push('png32:' + outputFile);
		im.convert(convertParams, this.convertDone.bind(this));
	},

	createCss: function()
	{
		var tplData = { sprites: [] }, i, block;
		for(i = 0 ; i < this.blocks.length ; i++)
		{
			block = this.blocks[i];
			if(block.fit)
			{
				tplData.sprites.push({
					name: block.name,
					ext: block.ext,
					fileName: block.fileName,
					x: block.fit.x + this.options.padding,
					y: block.fit.y + this.options.padding,
					width: block.imageWidth,
					height: block.imageHeight
				});
			}
		}

		tplData.fileName = path.basename(this.options.outfile);
		tplData.timestamp = (new Date()).getTime();

		if(this.options.name) tplData.name = this.options.name;
		else tplData.name = path.basename(this.options.outfile, path.extname(this.options.outfile));

		if(this.options.baseUrl) tplData.baseUrl = this.options.baseUrl;
		else tplData.baseUrl = null;

		tplData.width = this.size.w;
		tplData.height = this.size.h;

		var templateSource = fs.readFileSync(this.options.template, 'utf8');
		var template = Handlebars.compile(templateSource);
		var result = template(tplData);

		fs.writeFile(this.options.destCss, result, 'utf8', this.createCssDone.bind(this));
	},

	convertDone: function()
	{
		this.log('File ' + this.options.outfile + ' created.');
		this.status.convertDone = true;
		this.checkStatus();
	},

	createCssDone: function()
	{
		this.log('File ' + this.options.destCss + ' created.');
		this.status.cssDone = true;
		this.checkStatus();
	},

	checkStatus: function()
	{
		if(this.status.cssDone && this.status.convertDone && typeof this.done === 'function') this.done();
	}
};
