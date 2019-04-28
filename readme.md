# NSFW library - usage

In HTML, import library:

```html
<script src="https://raw.githubusercontent.com/teleranek/teleranek.github.io/master/nsfwlib.js"></script>
```
Additionally, import script for caching resources to allow faster page opening. Download
`https://raw.githubusercontent.com/teleranek/teleranek.github.io/master/nsfw_cacher.js`
And put into script
```html
<script src="nsfw_cacher.js"></script>
```

Initialize library:
```javascript
let nsfw = new NSFWLib(true);
```

For monitoring load progress:
1. Add progress bar and percent info box:
```html
<div id="status"></div>
<div id="progress">
	<div id="progressBar"></div>
</div>
```
2. Now you can set loading progress handler to indicate how much everything's loaded:
```javascript
nsfw.setLoadProgressHandler(function (perc) {
	let percentage = perc + "%";
    progress.style.width = percentage;
    document.getElementById("status").innerText = `Loading: ${percentage}`;
});
```

Initialize and predict some photo:
```javascript
nsfw._initialize().then(function() {
	var img = new Image();
	img.src = "IMAGE_URL";
	img.onload = function () {
		let is_this_nsfw = nsfw.predictSync(img);
		if (is_this_nsfw > 0.9) {
			console.log("THIS IMAGE IS NSFW!");
		}
	}
});
```
