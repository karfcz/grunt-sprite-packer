
var fs = require('fs');
var path = require('path');
var im = require('node-imagemagick');
var Handlebars = require('handlebars');
var packer = require('./packer-growing.js');
var crypto = require('crypto');

var SpritePacker = exports.SpritePacker = function(options)
{
	if(!options.padding) options.padding = 0;
	if(!options.background) options.background = 'none';
	if(!options.format) options.format = 'png32';
	if(!options.quality) options.quality = '100%';
	if(!options.svg) options.svg = false;
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
		this.svgs = [];

		if(this.options.svg) this.identifyFilesSVG();
		else this.identifyFiles();
	},

	identifyFiles: function()
	{
		var files = this.options.files;
		im.identify(files, this.identifyDone.bind(this));
	},

	identifyFilesSVG: function()
	{
		var files = this.options.files;
		var xmldoc = require('xmldoc');
		var document;
		var that = this;

		files.forEach(function(file, i)
		{
			document = new xmldoc.XmlDocument(fs.readFileSync(file));
			var width = parseInt(document.attr.width, 10);
			var height = parseInt(document.attr.height, 10);
			var ext = path.extname(file);
			var name = path.basename(file, ext);
			var fileName = name + ext;
			that.prefixSvgIds(document, name);

			that.svgs[name] = document;
			that.blocks.push(
				{
					w: width + that.options.padding * 2,
					h: height + that.options.padding * 2,
					imageWidth: width,
					imageHeight: height,
					name: name,
					ext: ext,
					fileName: fileName,
					filePath: file
				}
			);
		});

		this.pack();
	},

	prefixSvgIds: function(document, prefix)
	{
		var prefixElement = function prefixElement(el)
		{
			for(var a in el.attr)
			{
				if(a === 'id') el.attr.id = prefix + el.attr.id;
				else if(a === 'xlink:href')
				{
					el.attr['xlink:href'] = el.attr['xlink:href'] = el.attr['xlink:href'].replace('#', '#' + prefix);
				}
				else if(el.attr[a].indexOf('url(#') !== -1)
				{
					el.attr[a] = el.attr[a].replace(/url\(#([^)]+)\)/g, 'url(#' + prefix + '$1)');
				}
			}
			el.eachChild(prefixElement);
		};
		document.eachChild(prefixElement);
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

		if(this.options.svg) this.convertSVG();
		else this.convert();
	},

	convert: function()
	{
		var convertParams = ['-size', '', 'xc:' + this.options.background, '-strip'];
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

		if('quality' in this.options)
		{
			convertParams.push('-quality');
			convertParams.push(this.options.quality);
		}
		convertParams.push(this.options.format + ':' + outputFile);
		im.convert(convertParams, this.convertDone.bind(this));
	},

	convertSVG: function()
	{
		var size = this.size = { w: 0, h: 0 };
		var block;
		var outputFile = this.options.outfile;
		var output = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="$viewBox">$out</svg>';
		var out = [];

		for(var i = 0 ; i < this.blocks.length ; i++)
		{
			block = this.blocks[i];
			if(block.fit)
			{
				if(block.fit.x + block.w > size.w) size.w = block.fit.x + block.w;
				if(block.fit.y + block.h > size.h) size.h = block.fit.y + block.h;

				this.svgs[block.name].attr.x = block.fit.x + this.options.padding;
				this.svgs[block.name].attr.y = block.fit.y + this.options.padding;
				delete this.svgs[block.name].attr.viewBox;

				out.push(this.svgs[block.name].toString());
			}
		}

		output = output.replace('$width', size.w);
		output = output.replace('$height', size.h);
		output = output.replace('$viewBox', '0 0 ' + size.w + ' ' + size.h);
		output = output.replace('$out', out.join(''));

		fs.writeFileSync(outputFile, output);
		this.convertDone();
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


		var content = fs.readFileSync(this.options.outfile);

		tplData.fileName = path.basename(this.options.outfile);
		tplData.timestamp = (new Date()).getTime();
		tplData.checksum = crypto.createHash('md5').update(content).digest('hex');

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
		this.createCss();
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
