---
layout: post
title: sparkee-自动化monorepo管理工具
subtitle: sparkee工作原理及适用场景详解
date: 2024-7-4
author: "lijiahao"
tags: ['Xbox', 'streaming']
---

XStreaming（Xbox Streaming）是一款开源免费Xbox串流应用，旨在安卓设备上远程你的Xbox series x/s，并且支持官方云游戏，让你可以在任何地方玩上Xbox平台游戏，本文将概述该应用的开发灵感及开发过程的思考，不会涉及过多技术细节，技术细节将会在后续的章节进行分享。

## 简述串流
在介绍XStreaming之前，先来简单介绍下串流。串流就是将多媒体信息，如视频、音频信息，在服务端进行编码，经过网络传输到客户端设备，由客户端进行解码播放，日常主流视频应用播放、线上会议等都是串流的具体应用。

![30b17156ca00242605a5633022b0d94e.png](/img/xstreaming/intro/30b17156ca00242605a5633022b0d94e.png)

在游戏领域，串流就是将游戏主机的画面通过网络的形式传输到客户端，如手机、电脑等可播放设备，游戏相关的硬件运算都在主机上，客户端只是负责视频的解码和播放，因此可以实现硬件很普通的移动设备通过串流游完3A游戏。

在XStreaming中，服务端是Xbox主机或微软的云游戏服务器，客户端是移动设备，XStreaming负责登录微软云服务并提供游戏画面展示、手柄控制等游戏游完体验。

## Xbox串流生态

目前世面上可以串流Xbox的产品一共四款：

- 官方Xbox应用：支持主机局域网和广域网串流，画面动态分辨率最大支持720P，支持Android、iOS、windows客户端，但串流不支持手柄振动，不支持手柄按键映射，不支持云游戏
- xbxplay：分辨率支持1080p，有强大的手柄振动和手柄映射功能，支持Android端，但异常反馈体验很差，且软件收费闭源，不支持云游戏
- xbplay：上架于steam的PC桌面端应用，付费闭源应用
- Greenlight：开源应用，基于electron架构实现，基于原生浏览器API实现的一款纯typescript应用，支持手柄振动和云游戏，遗憾的是受限于架构实现无法在移动端运行

可以看到，目前市面上还没有一款移动端开源Xbox串流应用，闭源付费应用也存在更新缓慢，应用体验和付费达不成正比的问题。XStreaming正是集成了上述软件的优点，重点解决Xbox串流时遇到的痛点，以一个开源游戏者的身份开发的串流应用。

## 基本原理
如果没有接触过串流开发，肯定会疑惑远程音视频是怎么实时传输到客户端的。XStreaming的串流核心技术使用的是[WebRTC](https://webrtc.org/)。

WebRTC采集和传输音视频数据的过程可以分为三步进行：

1. 实时捕获本地的音视频流
2. 实时编码音视频并在网络中向对等端传输多媒体数据
3. 对等端接受发送者的音视频，实时解码播放

在XStreaming的场景中，Xbox、云游戏服务器都已经对WebRTC的服务端做了实现，Xbox只要在设置中开启了远程游戏，Xbox即可化身为一台WebRTC服务器：

![ce98cc92ade70f58dfdd0a6a3b0ba69a.png](/img/xstreaming/intro/ce98cc92ade70f58dfdd0a6a3b0ba69a.png)

那么XStreaming只需要做的就是登录微软服务获得账号授权，处理WebRTC协议，最后可以跟主机或云游戏服务器直连即可。

![ac6444186f2a994efa680a5640b1539d.png](/img/xstreaming/intro/ac6444186f2a994efa680a5640b1539d.png)

## 架构
考虑到后续支持Android和iOS双端，以及部分可复用的开发资源，
XStreaming选用[React-native](https://reactnative.dev/)作为基础开发框架。为了便于调用WebRTC的相关原生接口，选择在webview里面做WebRTC协商。由于Xbox串流必须使用微软网络接口，为了避免Web端的跨域拦截，选择在React-native层面进行网络请求，进行微软服务器授权、串流凭证获取等操作。在原生层，主要处理串流时沉浸模式和登录签名算法逻辑，整体架构图如下：

![3f184fc9a0aa12abf97594c7c3774072.png](/img/xstreaming/intro/3f184fc9a0aa12abf97594c7c3774072.png)

XStreaming的原理和架构已经简单介绍，接下来将介绍XStreaming的主要功能。

## 分辨率支持

XStreaming支持1080P和720P的最大分辨率切换，1080P是目前已知微软服务串流的最大分辨率。切换分辨率的核心在发起串流会话请求时，API有一个`deviceInfo`的字段传递当前设备信息，设备名称如传递`android`，则最后服务端会返回720P的视频流，如传递`windows`则可以获取1080P。

```js
appInfo: {
	env: {
		...
	},
	os: {
		// name: 'android', // 720P
		name: 'windows', // 1080P
	}
}
```

![f570fb49de153b5dd2e60d8ed3f32944.png](/img/xstreaming/intro/f570fb49de153b5dd2e60d8ed3f32944.png)

## 云游戏支持
免代理支持云游戏是XStreaming区别其他移动端应用的一大特色，XStreaming的设置可以选择云游戏的默认地区，突破微软的区域限制，并且可以直接在XStreaming上串流云游戏，从目前串流的效果来看，大陆地区串流云游戏普遍有100ms甚至更高的延迟，玩回合制及战略类游戏绰绰有余，如需延迟更低的体验，可以配合主流加速器使用。

![807aa190daf07f78463c5a91c3af16cc.png](/img/xstreaming/intro/807aa190daf07f78463c5a91c3af16cc.png)

![6f82cd9c005fd1a8f7ac3c7d0c203146.png](/img/xstreaming/intro/6f82cd9c005fd1a8f7ac3c7d0c203146.png)

## 控制设备

XStreaming使用[Navigator: getGamepads](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads)获取外接有线/蓝牙手柄，因此只要手柄是标准协议，XStreaming在串流期间都可以正确识别。但不排除部分手柄缺少`Nexus`按键(西瓜键)的情况，这种情况可以使用XStreaming内置的`View` + `Menu`组合键呼出主菜单。

如果外接手柄的键位不正确，也可以在XStreaming的按键映射界面重新映射按键：

![337180fe505a475fdb015a5872ea5313.png](/img/xstreaming/intro/337180fe505a475fdb015a5872ea5313.png)

此外XStreaming也提供了虚拟按键，供没有外接手柄的场景使用：

![ccd0897379017e67a86337ebc749cd98.png](/img/xstreaming/intro/ccd0897379017e67a86337ebc749cd98.png)

## 手柄振动

手柄振动也是游戏的一个重要体验，XStreaming通过[vibrationActuator.playEffect](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect)将串流时服务端返回的振动信息转为实体手柄的具体振动，如果你的设备浏览器内核不是很低且支持标准`navigator gamepad`协议，那么可以获得一个比较完美的振动效果。如果你的浏览器内核不支持`playEffect`实现的振动：

```js
const gamepad = navigator.getGamepads()[0];

gamepad.vibrationActuator.playEffect("dual-rumble", {
  startDelay: 0, // 振动效果开始之前延迟的时间，单位为毫秒。设置为0表示立即开始振动效果
  duration: 200, // 振动效果持续的时间，单位为毫秒
  weakMagnitude: 1.0, // 弱振动的强度，范围通常在0到1之间。对应游戏手柄的右侧振动电机
  strongMagnitude: 1.0, // 强振动的强度，范围通常在0到1之间。对应游戏手柄的左侧振动电机
});
```

XStreaming还提供了一个强制使用机身振动的模式：

![7e4055acb4ee744fdb411673e94a0cb8.png](/img/xstreaming/intro/7e4055acb4ee744fdb411673e94a0cb8.png)


这种振动模式在收到服务端的振动通知后，直接使用原生的振动模式，如果你希望把机身振动转移到外接手柄上，可以在系统设置里将振动重定向到外接设备上，这样一样可以获得较为完整的串流振动效果。

## IPv6支持
XStreaming支持优先连接IPv6，如你需要在公网进行串流，开启优先IPv6连接将会大大提高握手连接的成功率。

## 总结及愿景

XStreaming的愿景是可以给大家串流Xbox时多一个选择，希望各位玩家都可以通过串流获得更好的游戏体验。 目前XStreaming还是处于早期开发阶段，不可避免的还有很多问题，为了XStreaming以后可以有更好的迭代发展，源代码已经全部开源，目前XStreaming分为三个仓库：

- [XStreaming](https://github.com/Geocld/XStreaming): XStreaming应用核心，需要React-Native和原生开发环境。
- [XStreaming-webview)](https://github.com/Geocld/XStreaming-webview): 串流界面的主要实现，纯React应用，有前端开发经验的开发者可以快速上手这个项目。
- [XStreaming-player](https://github.com/Geocld/XStreaming-player): WebRTC实现的核心，涉及WebRTC协议的具体实现，手柄控制器的信号传输等，纯typescript实现。

各位开发者如有更好的想法或更好的串流实现，或者对XStreaming有更好的建议，都可以到上述仓库提交PR或参加讨论。

(完)