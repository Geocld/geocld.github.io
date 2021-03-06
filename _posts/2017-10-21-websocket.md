---
layout: post
title: 浅析WebSocket协议及其实现
subtitle: "本文将介绍WebSocket协议，并使用Python说明WebSocket协议在服务器端的一些实现关键点。"
date: 2017-10-21
author: "lijiahao"
tags: [WebSocket, Python]
---

<h3>WebSocket简介</h3>

WebSocket是html5提出的协议规范，该协议旨在解决客户端和服务器端实时通信的问题，在WebSocket协议之前，客户端和服务器进行通信时，是由客户端先发起请求，服务器端接受到请求后作出响应，但是服务器端无法主动的往客户端发送信息。WebSocket本质上是基于TCP协议，先通过HTTP/HTTPS协议发起一条特殊的HTTP请求进行握手后创建一个用于交换数据的TCP连接，此后客户端和服务器端通过此TCP连接进行实时通信。

WebSocket的应用场景：多人聊天室实时通信、服务器的实时推送等。

<h3>握手过程</h3>

WebSocket协议包括握手和数据传输两部分，首先了解握手过程。一个客户端发起WebSocket请求的requests header有如下字段:

```http
GET / HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Origin: http://example.com
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

可以看到客户端发起WebSocket连接时还是先通过HTTP协议发起请求。`Upgrade`、`Connection`、`Sec-WebSocket-Key`和`Sec-WebSocket-Version`是WebSocket协议规定的特有字段：

`Upgrade`: 必须为websocket关键字；

`Connection`:必须为Upgrade关键字；

`Sec-WebSocket-Key`:由客户端选取一个16字节的随机数并经过base64编码得到的值，供服务器端使用；

`Sec-WebSocket-Version`:必为13

服务器端收到客户端的requests后即视为客户端已发起握手请求，对客户端的request header进行分析，判断本次握手是否符合规范，以下是Python在服务器端的实现:

```python
def handshake(self):
        message = self.request.recv(20480).decode().strip() # 获取request header
        upgrade = re.search('\nupgrade[\s]*:[\s]*websocket', message.lower()) # 判断Upgrade
      	# upgrade字段不合法，关闭握手请求
        if not upgrade:
            self.keep_alive = False
            return
        key = re.search('\n[sS]ec-[wW]eb[sS]ocket-[kK]ey[\s]*:[\s]*(.*)\r\n', message) # 判断是否有Sec-WebSocket-Key
        if key:
            key = key.group(1)
        else:
            logger.warning('Client tried to connect but was missing a key')
            self.keep_alive = False
            return
        response = self.make_handshake_response(key) # 做出响应
        self.handshake_done = self.request.send(response.encode()) # 握手结束
        self.valid_client = True
        self.server.new_client(self)
```

服务器端收到客户端的请求后，会做出如下响应:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

其中第一行是表示服务器端返回的状态，状态码必须为101，否则客户端会视为握手失败；`Upgrade`字段必须为websocket，`Connection`字段必须为Upgrade，`Sec-WebSocket-Accept`字段是将客户端上报的`Sec-WebSocket-Key`和一段GUID(258EAFA5-E914-47DA-95CA-C5AB0DC85B11)进行拼接，再将这个拼接的字符串做SHA-1 hash计算，然后再把得到的结果通过base64加密，最后再返回给客户端，[RFC 6455](https://tools.ietf.org/html/rfc6455#section-4.2)定义的算法如下:

```
Sec-WebSocket-Accept     = base64-value-non-empty
base64-value-non-empty = (1*base64-data [ base64-padding ]) | base64-padding
base64-data      = 4base64-character
base64-padding   = (2base64-character "==") | (3base64-character "=")
base64-character = ALPHA | DIGIT | "+" | "/"
```

Python的服务器实现如下:

```python
def make_handshake_response(self, key):
  return \
  'HTTP/1.1 101 Switching Protocols\r\n' \
  'Upgrade: websocket\r\n' \
  'Connection: Upgrade\r\n' \
  'Sec-WebSocket-Accept: %s\r\n' \
  '\r\n' % self.calculate_response_key(key)

def calculate_response_key(self, key):
  GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  hash = sha1(key.encode() + GUID.encode())
  response_key = b64encode(hash.digest()).strip()
  return response_key.decode('ASCII')
```

如果服务器端加密算法错误，客户端在进行校检的时候会直接报错。如果握手成功，则客户端侧会出发onopen事件。

<h3>数据帧格式</h3>

客户端和服务器端成功握手后即可进行双向数据传输，在了解数据传输前，先来看下Websocket协议的数据帧格式：

```
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

数据格式中定义了opcode、mask、payload length、Payload data等字段。其中要求：

1. 客户端向服务器传输的数据帧必须进行掩码处理。服务器若接收到未经过掩码处理的数据帧，则必须主动关闭连接。
2. 服务器向客户端传输的数据帧一定不能进行掩码处理。客户端若接收到经过掩码处理的数据帧，则必须主动关闭连接。

其中数据格式中比较重要的区域在前两个字节，即FIN、RSV1、RSV2、RSV3、OPCODE、MASK和payload length：

- FIN：标识是否为此信息的最后一个数据包，占1bit;
- RSV1、RSV2、RSV3:用于扩展协议，一般情况下位0，各占1bit
- OPCODE:定义数据包类型，占4字节，WebSocket中有如下数据包:
  - 0x0：标识一个中间数据包
    0x1：标识一个text类型数据包
    0x2：标识一个binary类型数据包
    0x3-7：保留
    0x8：标识一个断开连接类型数据包
    0x9：标识一个ping类型数据包
    0xA：表示一个pong类型数据包
    0xB-F：保留
- MASK: 标识PayloadData是否经过掩码处理，占1bit。MASK如果是1，Masking-key域的数据即是掩码密钥，用于解码PayloadData。客户端发出的数据帧需要进行掩码处理，所以此位是1。
- Payload len:标识Payload Data的长度，占7bits，如果Payload Data经过扩展，那么Payload len占7bits+16bits或7bits+64bits：
  - 如果其值在0-125，则是payload的真实长度。
  - 如果值是126，则后面2个字节形成的16bits无符号整型数的值是payload的真实长度。
  - 如果值是127，则后面8个字节形成的64bits无符号整型数的值是payload的真实长度。

<h3>接收数据</h3>

服务器端接收并解析客户端的数据流程如下:

1. 读取客户端数据的前两字节内容，因为这两个字节包含了mask、opcode等信息，用于后续对数据进行解析；
2. 根据协议定义的数据帧格式，从提取的两字节内容中解析相应的fin、mask、opcode、payload length字节；
3. 从mask、fin等字节信息判断本次数据是合法数据后，解析payload length，并根据payload length值（小于125、等于126、等于127）的情况来计算出payload length的真实长度；
4. 根据payload length的真实长度解析出客户端数据。

Python的实现如下:

```python
# read_bytes方法是读取客户端数据指定字节数内容
def read_bytes(self, num):
        bytes = self.rfile.read(num)
        return map(ord, bytes)
    
def read_message(self):
        try:
            b1, b2 = self.read_bytes(2) # b1，b2分别对应客户端数据前两个字节
        except ValueError as e:
            b1, b2 = 0, 0

        # 通过&位操作获取对应的bit
        fin = b1 & 0x80 # 0x80 = 1000 0000
        opcode = b1 & 0x0f # 0x0f = 0000 1111
        masked = b2 & 0x80
        playload_len = b2 & 0x7f # 0x7f = 0111 1111

        if not b1:
            logger.info('Client closed connection.')
            self.keep_alive = False
            return
        # opcode是断开数据类型，则断开连接
        if opcode == 0x8:
            logger.info('Client asked to close connection.')
            self.keep_alive = False
            return
        # 没有掩码处理,数据不合法，断开连接
        if not masked:
            logger.error('Client must always be masked')
            self.keep_alive = False
            return
        if opcode == 0x0:
            logger.warn('Continuation frames are not supported.')
            return
        if opcode == 0x2:
            logger.warn('Binary frames are not supported.')
            return
        elif opcode == 0x1:
            opcode_handler = self.server.message_received
        elif opcode == 0x9:
            opcode_handler = self.server.ping_received
        elif opcode == 0xa:
            logger.warn('pong frames are not supported.')
            return
        else:
            logger.warn("Unknown opcode %#x." + opcode)
            self.keep_alive = False
            return

        # 解析playload_len的真实长度
        if playload_len == 126:
            playload_len = struct.unpack('>H', self.rfile.read(2))[0] # integer
        elif playload_len == 127:
            playload_len = struct.unpack('>Q', self.rfile.read(8))[0] # long

        masks = self.read_bytes(4)
        decoded = ''
        # 对message进行解码
        # print self.read_bytes(playload_len)
        for char in self.read_bytes(playload_len):
            char ^= masks[len(decoded) % 4]
            decoded += chr(char)
        opcode_handler(self, decoded)
```

<h3>发送数据</h3>

服务器端向客户端发送的数据包含一个字节数组(bytearray)和实际发送的内容，其中bytearray第一部分必须是0x81，第二部分是发送内容的长度，实现的代码如下：

```python
def send_text(self, message, opcode): 
        header = bytearray()
        playload = encode_to_UTF8(message)
        playload_len = len(playload)
        header.append(0x81)

        if playload_len <= 125:
            header.append(playload_len)

        elif playload_len > 125 and playload_len <= 65535:
            header.append(op_code.get('PLAYLOAD_LEN_EXT16'))
            header.extend(struct.pack('>H', playload_len))

        elif playload_len < 18446744073709551616:
            header.append(op_code.get('PLAYLOAD_LEN_EXT64'))
            header.extend(struct.pack('>Q', playload_len))
    
        else:
            raise Exception('Message is too big. Consider breaking it into chunks.')
            return

        self.request.send(header + playload)
```

<h3>WebSocket的浏览器响应事件</h3>

在[支持websocket的浏览器](https://caniuse.com/#search=websocket)中，可以通过`new WebSocket('ws://url')`建立WebSocket连接：

```javascript
ws = new WebSocket('ws://localhost:9001')
```

之后即可使用`onopen`，`onmessage`，`onclose`和`onerror`四个事件实现对socket进行响应:

```javascript
ws = new WebSocket('ws://localhost:9001')
ws.onopen = function () {
	console.log('ws is on open')
}
ws.onmessage = function (e) {
	console.log('ws is send' + e.data)
}
ws.onclose = function () {
	console.log('ws is close')
}
ws.onerror = function (e) {
	console.log(e)
}
```

如果客户端需要关闭WebSocket连接，直接调用`close()`即可:

```javascript
ws.close()
```

<h3>总结</h3>

本文基于[RFC 6455](https://tools.ietf.org/html/rfc6455)了解了Websocket的握手方式、数据帧格式即服务器端收发数据的原理，同时使用Python对一些关键实现点进行了讲解，根据协议使用Python实现的WebSocket服务器参见本人的github：[py-websocket](https://github.com/Geocld/py-websocket)。

（完）

参考：

[playing-with-websockets](https://pawelmhm.github.io/python/websockets/2016/01/02/playing-with-websockets.html)

[Websocket协议的学习、调研和实现](http://www.cnblogs.com/lizhenghn/p/5155933.html)