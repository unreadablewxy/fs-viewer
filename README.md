![Linux-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Linux-CI/badge.svg)
![Windows-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Windows-CI/badge.svg)

# fs-viewer

Created to solve one person's image organization woes, this program is for those who wants a tagging image browser like those of booru sites. But isn't a big fan of brittle database files other viewers like to keep.

What is unique about this program?
* Tag data is kept separate, but securely attached, to your files. Guaranteed by your Operating System
    * Moving or editing your files won't affect your tags
    * Changing your tags won't affect your file contents or checksum
    * See [xattrs](https://man7.org/linux/man-pages/man7/xattr.7.html) or [alternate streams](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-fscc/c54dec26-1551-4d3a-a0ea-4fa40f848eb3) for those interested
* Have a Windows tablet or Linux storage server? Tag data auto follows your files even over SMB and NFS file shares
* Designed to work with giant `mono-collections` that contains thousands of files without noticable performance issues
* Supports all popular animated image & short video clip formats (built on electron, so everything Chrome supports, "just works")
* Integrated with your OS' native thumbnailer for maximum compatibility out of the box
    * Can also hook up a custom thumbnailer and load thumbnails from wherever you like, even animated ones
* Extensibility! Built in [extensions support](https://github.com/unreadablewxy/fs-viewer/wiki/Extension-Development)

<p align="center">

   https://user-images.githubusercontent.com/18103838/127989462-6ca40f90-5351-4b77-8153-1456dd2c439e.mp4

   https://user-images.githubusercontent.com/18103838/127989469-67e7d66a-7ebe-426f-a89c-247ee17a9ca3.mp4

</p>
