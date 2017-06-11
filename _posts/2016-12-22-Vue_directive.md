---
layout: post
title: ssh连接树莓派以及使用VNC进行远程连接
subtitle: ""
date: 2017-6-11
author: "lijiahao"
tags: [Raspberry]
---

最近入手了个Raspberry 3b，用以研究服务器搭建和平时一些小玩意，这里简单记录下快速上手的一些操作。

<h3>系统安装</h3>

从Raspberry[官网](https://www.raspberrypi.org/downloads/)下载Raspbian，注意下载的时候有两个版本，一个是带图形界面的系统镜像，另一个是不带图形界面的镜像，后者比前者要小的多，按需下载，下载镜像后使用镜像烧录工具将系统镜像烧录到TF卡中，推荐使用[win32diskimager](https://sourceforge.net/projects/win32diskimager/)进行烧录，烧录ok后可直接将TF卡插入Raspberry开机即可。

<h3>ssh登录Raspberry</h3>

1. Raspberry开启ssh

最新的Raspberry默认不开启ssh，需要用户在首次使用时默认开启ssh，只要在TF卡内新建一个名为ssh的文件即可。

2.使用putty连接到Raspberry

Raspberry开机后即可使用pc在当前网段远程控制Raspberry，无需将Raspberry另外接入显示器等设备即可进行一系列操作。

使用路由器获取Raspberry当前网段ip，例如获取的ip为192.168.1.114，开打putty，输入Raspberry的ip，选择端口即可open
![](http://i.imgur.com/B44lWn3.png)

输入用户名，默认为pi，密码raspberry，即登录成功
![](http://i.imgur.com/NZ1iLkg.png)

<h3>VNC连接</h3>

ssh登录成功后即可通过命令行对Raspberry进行各种操作了，如果想对Raspberry进行一些界面操作，需要通过VNC进行连接远程操作。

1. Raspberry上安装VNC Server

首先在Raspberry上安装tightvncserver，打开命令输出终端，输入：

```
sudo apt-get install tightvncserver
```

安装完成后，增加一个桌面，输入命令：

```
vncserver :1 -geometry 800x600
```

这里会有一个输入远程操作的登录密码提示，按提示进行密码设置即可，如果密码忘记了，使用：

```
vncpasswd
```

进行密码重置

关闭VNC serve：

```
 vncserver -kill :1
```

2. 启动VNC Viwer

在需要控制的pc上安装VNC客户端，在VNC Viewr上输入Raspberry的ip+NVC端口(192.168.1.114:1)：

![](http://i.imgur.com/xe9lJJo.png)

enjoy！

（完）