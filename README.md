![Linux-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Linux-CI/badge.svg)
![Windows-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Windows-CI/badge.svg)

# fs-viewer

Created to solve one person's image organization woes, this program is for those who wants a tagging image browser like those of booru sites. But isn't a big fan of brittle database files other viewers like to keep.

What is unique about this program?
* Tag data is attached to your files via `xattrs` or `alternate streams` so moving or editing files around won't affect your tags
* Have a windows tablet or Linux storage server? Tag data auto follows your files even over SMB and NFS file shares
* Designed to work with giant `mono-collections` that contains thousands of files without noticable performance issues
* Supports all popular animated image & short video clip formats (built on electron, so everything Chrome supports, "just works")
* Integrated with your OS' native thumbnailer for maximum compatibility out of the box
    * Can also hook up a custom thumbnailer and load thumbnails from wherever you like, even animated ones
* Extensibility! Built in [extensions support](./wiki/Extension-Development)

<p align="center">

https://user-images.githubusercontent.com/18103838/127987534-11962392-9b23-4a84-9976-1dbd33fc52ff.mp4

https://user-images.githubusercontent.com/18103838/127987550-c860cb41-1b51-4687-9c53-749799c34e79.mp4

</p>
