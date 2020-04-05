# fs-viewer
Created to solve one person's image organization woes, this program is for those who wants a tagging image browser like those of "*booru" sites. But isn't a big fan of brittle database files other viewers like to keep.

What is unique about this program?
* Tag data is attached to your files via `xattrs` or `alternate streams` so moving or editing files around won't affect your tags
* It is designed to work with giant `mono-collections` that contains thousands of files without noticable performance issues
* Supports all popular animated image & short video clip formats (it is built on electron, so everything chrome supports just works)
* Use your OS' built in thumbnailer for maximum speed, or hook up a custom thumbnailer and load thumbnails from wherever you like, even animated ones
* Extensibility, everything is written in JS & CSS, moding has a very low entry requirement, tweak it to your heart's content
