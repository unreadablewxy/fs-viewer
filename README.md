![Linux-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Linux-CI/badge.svg)
![Windows-CI](https://github.com/unreadablewxy/fs-viewer/workflows/Windows-CI/badge.svg)

# fs-viewer

Created to solve one person's image organization woes, this program is for those who wants a tagging image browser like those of booru sites. But isn't a big fan of brittle database files other viewers like to keep.

What is unique about this program?
* Tag data is attached to your files via `xattrs` or `alternate streams` so moving or editing files around won't affect your tags
* It is designed to work with giant `mono-collections` that contains thousands of files without noticable performance issues
* Supports all popular animated image & short video clip formats (it is built on electron, so everything chrome supports just works)
* Use your OS' built in thumbnailer for maximum speed, or hook up a custom thumbnailer and load thumbnails from wherever you like, even animated ones
* Extensibility, everything is written in JS & CSS, moding has a very low entry requirement, tweak it to your heart's content

<p align="center">
<img src="https://s6.gifyu.com/images/demo.gif" alt="demo" />
</p>

# xattrs & alt-streams

* The project was designed around xattrs & alt-streams because both enjoy OS level status as vessels for file metadata (see [here](http://man7.org/linux/man-pages/man7/xattr.7.html) and [here](https://docs.microsoft.com/en-us/windows/win32/fileio/file-streams) respectively)
* For Windows users
    * Alt-streams behaves like an invisible part of the file (a lot like the human appendix).
    * Seemlessly follows the file across to any NTFS drives and SMB network shares hosted on Windows machines.
    * Samba servers can map alt-streams to xattrs with [some configuration](https://www.samba.org/samba/docs/current/man-html/vfs_streams_xattr.8.html)
* For *nix users
    * xattrs are generally stored on or near inodes. Which means better data locality. This typically manifests as improved performance & less disk wear than sqlite based solutions.
    * xattrs do not survive moves to other filesystems/partitions without using archiving mode copy.
    * The fenced nature of xattrs makes them a great privacy tool for powerusers. Any data leaving a file system is automatically stripped of their meta-data. However if you don't know what `cp -a` does, then this could be a problem for you.
