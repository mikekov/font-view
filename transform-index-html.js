module.exports = (targetOptions, indexHtml) => {
	const insert = "<svg id='insert-here'></svg>";
	const idx = indexHtml.indexOf(insert);
	// const config = `<p>Configuration: ${targetOptions.configuration}</p>`;
	if (idx > 0) {
		const fs = require('fs');
		var svg = fs.readFileSync("./temp/icons.svg", {encoding: 'utf8'});
		return `${indexHtml.slice(0, idx)} ${svg} ${indexHtml.slice(idx + insert.length)}`;
	}
	else {
		throw {error: `Cannot find "${insert}" inside index.html`};
	}
};
