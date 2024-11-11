---
layout: post
title: XStreaming开发手记-webrtc篇
subtitle: 开源移动端Xbox/Xcloud串流应用
date: 2024-11-11
author: "lijiahao"
tags: ['Xbox', 'streaming']
---

XStreaming发布四个月来，已经陆续发布十余个版本，期间也同步更新了适配windows、MacOS和steamOS的PC版本，目前已经处于一个相对稳定的迭代阶段，今天将介绍XStreaming串流核心技术webrtc在其中的应用，以及在开发过程中遇到的问题和解决方案，通过阅读本文，你除了可以了解XStreaming底层通信原理，也可以了解webrtc的实际应用。

## WebRTC

WebRTC (Web Real-Time Communication)是谷歌2010年推出的开源即时通信技术，WebRTC可以让媒体流通过P2P（peer-to-peer）的方式进行连接通信，目前广泛应用在视频直播、实时语音、实时聊天等场景中。XStreaming底层通信也是采用了WebRTC，串流画面、声音、手柄操作、振动信号都是在WebRTC协议下实现的。在介绍XStreaming的WebRTC协商前，先简单过几个WebRTC重要的概念：

- SDP: `Session Description Protocol`，会话描述协议,主要用来描述多媒体会话，用途包括会话声明、会话邀请、会话初始化等。简单的说就是两个客户端都要先自我介绍，对方要把你的介绍都记住，才能进行后续的交流。
- ICE: `Interactive Connectivity Establishment`, 用于建立对等连接的协议，如待连接端需要提供自己的通信方式，如IP、协议等。
- ICE Candidate: ICE候选项，因为待连接端可能有多个连接方式，如同时具备IPV4和IPV6连接，那么就会存在多个ICE候选项。
- STUN: `Session Traversal Utilities for NAT`。这是一个可以发现客户端公网ip和端口的服务器，并选择建立WebRTC客户端直连的最佳路径。
- TURN：`Traversal Using Relays around NAT`。由于现实网络环境可能会很复杂，如存在多层NAT，这时候STUN大概率是会失败的，TURN也是一个服务器，用于兜底STUN失败时的连接处理，TURN服务器在STUN失败时为客户端提供连接，此时客户端之前通信的所有流量都会经过TURN服务器。

WebRTC基本模型如下:

![webrtc-base](/img/xstreaming/webrtc/webrtc-base.png)

XStreaming的连接通信也基本遵循上述模型，需要注意的是：

1. XStreaming不提供TURN服务器，由于TURN会处理串流所有流量，流量的转发是需要高昂的流量费用的，因此XStreaming不具备NAT失败时使用TURN转发流量的能力。
2. 信令服务器(signaling server)用于创建阶段进行协议交换的桥梁，这个服务器可以是websocket服务器，也可以是常见的提供Restful API服务器，很多WebRTC教程都是给出信令服务器是websocket服务器的说法，这种是不正确的，理论上所有可以在WebRTC客户端之间交换信息的服务都可以称为信令服务器。在XStreaming建立连接时，信令服务器是微软提供的Azure服务器，XStreaming通过标准的HTTP Resetful API交换SDP、ICE等协议信息。

XStreaming完整的WebRTC工作流程如下：

![workflow](/img/xstreaming/webrtc/workflow.png)

因为微软信令服务器和xbox端已经是到手可用，所以XStreaming只需关注自身的通信逻辑即可，下面对关键部分进行进一步介绍。

#### SDP

SDP用于描述当前设备的进行WebRTC通信是具备什么能力。生成SDP的方法如下：

```js
const peer = new RTCPeerConnection({
	iceServers: [
		{
                urls: 'stun:stun.l.google.com:19302',
            },
	]
});
peer.createOffer({
		offerToReceiveAudio: true,
		offerToReceiveVideo: true,
}).then(offer => {
	// SDP is there
})
```
其中生成SDP时务必要声明`offerToReceiveAudio`和`offerToReceiveVideo`，让Xbox端知道当前设备可接收媒体流。

生成的SDP是一个字符串，字符串使用`\r\n`换行，每一行都是offer的属性描述。其格式化后大概内容如下(简化版)：

```json
v=0
o=- 1182354182723121050 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS 0 1
m=audio 9 UDP/TLS/RTP/SAVPF 111 110
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:HhZ2
a=ice-pwd:PfMyC+TNcRvYAwiIVm20Hxsf
a=ice-options:trickle renomination
a=fingerprint:sha-256 90:17:E7:FF:70:CF:CA:B2:30:A3:43:4F:8F:74:57:30:E8:4E:6C:9A:43:0A:F6:1B:70:7B:31:B7:76:D3:04:EB
a=setup:active
a=mid:0
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42002a
a=ssrc:184848581 cname:DyOjhfwK6ACClJDn
m=video 9 UDP/TLS/RTP/SAVPF 102 103 104 105 106 107 108 109 127 125 116 117 118
c=IN IP4 0.0.0.0
a=sendonly
a=msid:1 bc3e36a3-7e1b-4884-b701-bc45832929af
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:102 H264/90000
a=rtcp-fb:102 goog-remb
allowed=1;packetization-mode=0;profile-level-id=42e02a
b=AS:30
a=ice-ufrag:HhZ2
a=ice-pwd:PfMyC+TNcRvYAwiIVm20Hxsf
a=ice-options:trickle renomination
a=fingerprint:sha-256 90:17:E7:FF:70:CF:CA:B2:30:A3:43:4F:8F:74:57:30:E8:4E:6C:9A:43:0A:F6:1B:70:7B:31:B7:76:D3:04:EB
a=setup:active
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
```

其中sdp比较重要的属性如下：

 - `a=ice-ufrag`: 定义了 ICE 会话的用户名片段，ICE 连接建立过程中用于身份验证的凭据
 - `a=ice-pwd:xxxx`: 定义了 ICE 会话的密码，ICE 连接建立过程中用于身份验证的凭据
 - `a=fingerprint:sha-256 ...`: 定义了使用 SHA-256 算法生成的 DTLS 证书指纹，以确保安全的媒体传输

这三项在`setLocalDescription`和`setRemoteDescription`必须一致，否则将视为无效的offer导致WebRTC通信协商失败。

- `m=video`: 接收视频媒体流的描述，格式为`m=<media> <port> <proto> <fmt>`，如： `m=video 9 UDP/TLS/RTP/SAVPF 127 39 102 104 106 108`，可以修改此处内容更改客户端媒体流解码器。
- `b=AS:30`：描述了本地可以接收媒体流的最高码率，单位`kbps`，可以通过生成本地offer后，修改当前值来调整跟服务端（xbox）的码率。
- `a=fmtp`：本地解码能力说明。其中后续的`profile-level-id=`说明支持使用哪种解码方式，常见的解码方式有以下描述:

```
profile-level-id=42002a // H.264低质量解码
profile-level-id=42e02a // H.264中质量解码
profile-level-id=4d002a // H.264高质量解码
```

#### ICE及STUN失败

在初始化`RTCPeerConnection`时传入的ice服务器可以在进入ice交换阶段查询出待连接方可用的连接地址，返回的内容大致如下：
```js
const peer = new RTCPeerConnection({
	iceServers: [
		{
                urls: 'stun:stun.l.google.com:19302',
            },
	]
});
```

ICE返回如下：
```js
[
  {
    "candidate": "a=candidate:1 1 UDP 100 192.168.100.234 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:2 1 UDP 1 fd7d:312f:9741:0:8766:716a:9d18:373d 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:3 1 UDP 1 fd7d:312f:9741::264 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:4 1 UDP 1 240e:1234:5678:3397:785a:b4f6:c639:13e8 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:5 1 UDP 1 2409:1234:5678:4497::264 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:6 1 UDP 1 2001:0:284a:b22:2c00:fa98:e4d9:2bd3 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=end-of-candidates",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  }
]
```

这其实就是ICE服务器帮我们查到了Xbox主机在的内网、公网IP地址，有了这个地址，WebRTC即可进入`connectionstatechange`监听最后的连接状态是否成功：

```js
peer.addEventListener( 'connectionstatechange', () => {
		console.log('connectionstatechange:', peer.connectionState)
})
```

其中`peer.connectionState`的状态可能为：

`new`: `RTCPeerConnection` 已被创建，但尚未开始建立连接。
`connecting`: 正在尝试建立连接。
`connected`: 连接成功。
`disconnected`: 表示 ICE 代理检测到连接出现了问题，可能是由于网络问题或对等方变得不可达。
`failed`: 表示 ICE 代理无法建立连接，由于NAT状态过于复杂或其他原因导致STUN没有成功。
`closed`: `RTCPeerConnection` 已关闭，连接终止。

XStreaming会在`connectionState`为`connected`后正常进入串流状态，如进入`failed`状态则会出现常见`NAT打洞失败`：

![failed](/img/xstreaming/webrtc/failed.png)

这种情况多数出现在串流设备跟Xbox主机不在一个局域网，在最后的STUN阶段NAT失败，而且XStreaming没有提供TURN服务器作为流量转发最后连接失败，这也是XStreaming跟Xbox官方应用最大的区别，官方Xbox官方应用提供了专用的TURN服务器，在出现上述STUN失败时直接使用TURN服务器作为连接中转。

#### 媒体流接收
WebRTC连接成功后即可直接通过`onTrack`事件接收媒体流，媒体流如果之前声明了同时接收视频和音频，那么需要在前端分别处理视频和音频：

```js
webrtcClient.ontrack = (event) => {
		if(event.track.kind === 'video') { // 处理视频
			const remoteStream = event.streams[0];
			const remoteTrack = event.track;
			const videoElement = document.createElement('video');
			videoElement.srcObject = remoteStream;
			videoElement.autoplay = true;
			document.body.appendChild(videoElement);
		} else if(event.track.kind === 'audio') { // 处理音频
			const remoteStream = event.streams[0];
			const remoteTrack = event.track;

			const audioElement = document.createElement('audio');
			audioElement.srcObject = remoteStream;
			audioElement.autoplay = true;
			document.body.appendChild(audioElement);
		}
};
```

注意直接将媒体流对象赋值在`srcObject`属性，而非常见的`src`。

#### 数据通道

手柄操作、振动回调都依赖于WebRTC数据通道进行传输：
```js
// 创建数据通道
const dataChannels = peer.createDataChannel(name, config)

// 发送数据，只能发送string或arrayBuffer类型
dataChannels.send(data)

// 接收数据
dataChannels.addEventListener('message', event => {
	// console.log(event.data)
})
```

Xbox需要初始化四个数据通道，缺一不可，以下是部分代码片段：

```js
_webrtcDataChannelsConfig = {
	'input': {
		ordered: true,
		protocol: '1.0',
	},
	'chat': {
		protocol: 'chatV1',
	},
	'control': {
		protocol: 'controlV1',
	},
	'message': {
		protocol: 'messageV1',
	},
}

for(const channel in this._webrtcDataChannelsConfig){
		this._openDataChannel(channel, this._webrtcDataChannelsConfig[channel])
	}
```


local ices:

经过teredo处理后:
```json
[
  {
    "candidate": "a=candidate:1 1 UDP 2130706431 192.168.100.234 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:2 1 UDP 1 fd7d:312f:9741:0:8766:716a:9d18:373d 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:3 1 UDP 1 fd7d:312f:9741::264 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:4 1 UDP 1 2408:8256:348b:3397:785a:b4f6:c639:13e8 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:5 1 UDP 1 2408:8256:348b:3397::264 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:6 1 UDP 1 27.38.212.44 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:7 1 UDP 1 27.38.212.44 1383 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:8 1 UDP 1 2001:0:284a:b22:2c00:fa98:e4d9:2bd3 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=end-of-candidates",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  }
]
```

## 连接稳定性优化

XStreaming发布初期，主机远程串流失败率较高，多发生在ICE交换结束等待直连阶段，总结有以下可能性：

1. 家庭局域网IPv6没普及，导致远程串流时，使用移动数据（IPv6环境）时，无法访问局域网内主机。
2. 家庭局域网有IPv6公网，但在解析ICE时没有优先使用IPv6地址解析。
3. 有IPv4公网，但IPv6流量无法走IPv4通道。

提升连接稳定性的关键在于提供更准确的ICE候选，因此针对上述问题做了如下优化。

### IPv6优先连接

接收STUN服务器解析的ICE数组后，对ICE数组排序，将IPV6地址解析优先级提升，但这个前提是Xbox也具备IPV6地址。

### Teredo

Teredo是一种自动隧道技术，允许IPv6设备通过IPv4网络进行通信。Teredo对可能阻止IPv6流量的NAT设备特别有用。该协议将IPv6数据包封装在IPv4 UDP数据包中，允许它们通过NAT设备，在不同网段串流时，Teredo可以起到一定改善连接的作用。

事实上，Teredo是Xbox主机的一个重要组成部分，早先微软就为Xbox主机的多人游戏提供了必要的IPv6支持，即使你的主机没有IPv6，也可以使用微软Teredo服务绕过家庭里复杂的NAT，进行可靠联机。

![teredo-base](/img/xstreaming/webrtc/teredo-base.png)

在进行WebRTC协商获取远程ICE时，微软信令服务器也给我们返回了一个Teredo地址，即开头为`2001`的IPv6地址，如下：

```json
{
    "candidate": "a=candidate:6 1 UDP 1 2001:0000:4136:e378:8000:63bf:3fff:fdd2 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
},
```

Teredo地址组成如下：

![teredo-structure](/img/xstreaming/webrtc/teredo-structure.png)

既然微软提供了Teredo直连地址，不妨在ICE里加入这个Teredo直连地址，也是可以提高连接的稳定性，但是Teredo地址只有一个IPv6地址，因此需要解析第二段十六进制标识的服务器IPv4地址（示例中的4136:e378），并加入到ICE中，以下展示代码片段：

```js
if (
	candidateAddress.length > 4 &&
	candidateAddress[4].substr(0, 4) === '2001'
) {
	const address = new Address6(candidateAddress[4]);
	const teredo = address.inspectTeredo();

	computedCandidates.push({
	  candidate:
		'a=candidate:10 1 UDP 1 ' +
		teredo.client4 +
		' 9002 typ host ',
	  messageType: 'iceCandidate',
	  sdpMLineIndex: '0',
	  sdpMid: '0',
	});
	computedCandidates.push({
	  candidate:
		'a=candidate:11 1 UDP 1 ' +
		teredo.client4 +
		' ' +
		teredo.udpPort +
		' typ host ',
	  messageType: 'iceCandidate',
	  sdpMLineIndex: '0',
	  sdpMid: '0',
	});
}
```
经过上述代码处理后，我们会多出一个ICE候选项，即解析后的IPv4连接候选项：

```json
{
    "candidate": "a=candidate:6 1 UDP 1 22.38.123.123 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
  {
    "candidate": "a=candidate:8 1 UDP 1 2001:0000:4136:e378:8000:63bf:3fff:fdd2 9002 typ host ",
    "messageType": "iceCandidate",
    "sdpMLineIndex": "0",
    "sdpMid": "0"
  },
```

经过上述在ICE处优化，目前XStreaming除了主机端没有公网NAT不通需要TURN服务器转发的场景不能连接外，其他场景连接稳定性均得到很大程度的提升。

## 总结
本文从XStreaming应用的实际使用出发，深入探讨了WebRTC在其中的具体应用。详细阐述了XStreaming的WebRTC协商流程，并从连接稳定性的角度介绍了如何进行连接优化，以提升STUN的稳定性。由于本人对WebRTC仍处于初学阶段，文中可能存在叙述或知识上的不足。若读者发现任何遗漏或错误，恳请不吝指正，感谢您的包涵与指导。

（完）
