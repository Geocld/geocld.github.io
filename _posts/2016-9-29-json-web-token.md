---
layout: post
title: JSON Web Token概述
subtitle: "本文将介绍在前后端架构环境下使用token机制防御CSRF攻击,了解JSON Web Token的构成。"
date: 2016-9-30
author: "lijiahao"
tags: [JSON]
---

<h4>概述</h4>

在前后端分离架构环境下，后端服务器以API接口的形式向前端提供服务，按照RESTful API的设计规范，后端数据API应该是无状态的（stateless），这也就意味着没有登录、注销方法，也没有session，同样的，后端API也不能依赖cookie，因为依赖cookie将不能保证每次request是由用户自己发出的，也就有CSRF的风险，因此针对某些隐秘内容的API，需要进行用户验证，目前token验证的CSRF防御机制是公认的最合适的方案。

<h4>什么是JSON Web Tokens</h4>

JSON Web Tokens（简称JWT），是一种通过以JSON作为信息媒介的认证机制，可以跨多种程序设计语言工作，适用于多种不同语言场景，它有以下两个特点：

1. JWT是自包含的、独立的：JWT可以将必要的信息包含在其自身内部，也就是说，JWT可以携带自身基本信息、载荷（通常是用户信息）和签名发送出去；
2. JWT是易传递的：由于JWT的自包含性，JWT可以使用多种方式进行传递，例如可以通过HTTP header、URL进行传递。

<h4>JWT的组成</h4>

一个JWT由三组字符串组成，每组字符串由`.`间隔，一个完整的JWT的基本模型如下：

```javascript
aaaaaaaaaa.bbbbbbbbbbb.cccccccccccc
```

这三部分依次是`header`,`payload`,`signature`，翻译过来即：头、载体、签名：

![](https://cask.scotch.io/2014/11/json-web-token-overview1.png)

<h5>1.Header</h5>

JWT的header是一个简单js对象编码后的字符串，这个JSON对象用来描述token的类型（jwt）以及使用的hash算法，下面栗子展示一个使用HS256算法的JWT header：

```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

在经过`base64`加密后，这个对象解析成一个字符串：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

这个就是JWT第一部分。

<h5>2.Payload载体</h5>

JWT的第二部分payload是整个token的核心，这部分同样是对一个JSON对象的编码，包含一些摘要信息，有些是必须的，有些是选择性的，具体的实例如下：

```javascript
{
  "iss": "scotch.io",
  "exp": 1300819380,
  "name": "Chris Sevilleja",
  "admin": true
}
```

这个结构被称为`JWT Claims Set`，`iss`是issuer的简写，表明请求的实体，可以是发出请求的用户的信息。`exp`是expires的简写，是用来指定token的生命周期。除了例子这几个选项，更多选项参照[这里](https://tools.ietf.org/html/draft-ietf-oauth-json-web-token-19#section-4)。

Payload部分加密后得到如下字符串：

```
eyJpc3MiOiJzY290Y2guaW8iLCJleHAiOjEzMDA4MTkzODAsIm5hbWUiOiJDaHJpcyBTZXZpbGxlamEiLCJhZG1pbiI6dHJ1ZX0
```

<h5>3.Signature签名</h5>

签名由前面的`Header`、`Payload`以及秘钥组成：

```javascript
var encodedString = base64UrlEncode(header) + "." + base64UrlEncode(payload);
HMACSHA256(encodedString, 'secret');
```

这部分经过以上编码后得到如下字符串：

```
03f329983b86f7d9a9f5fef85305880101d5e302afafa20154d094b229f75773
```



至此根据JWT的三部分编码，可以得到一个完整的JWT：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzY290Y2guaW8iLCJleHAiOjEzMDA4MTkzODAsIm5hbWUiOiJDaHJpcyBTZXZpbGxlamEiLCJhZG1pbiI6dHJ1ZX0.03f329983b86f7d9a9f5fef85305880101d5e302afafa20154d094b229f75773
```

<h4>Token的使用和处理</h4>

在前后端基于RESTful API分离的框架下，如果前端需要访问某些需要进行身份验证的内容时，结合JWT验证的流程如下：

1. 前端将用户验证信息（用户名、密码）通过接口传给后端；
2. 后端对前端的验证信息进行验证，如果验证通过，开放内容权限，同时返回一个token字符串；
3. 前端将token信息存在`sessionStore`或`localStore`，在后续继续访问需要验证的接口时，在HTTP Header加入token，每次访问接口均进行用户身份验证；
4. 后端每次收到前端请求，验证token是否可用，如果可用，则允许用户访问特定接口内容，否则拒绝。

整个流程可以概括为下图：

![](https://cask.scotch.io/2014/11/tokens-new.png)

<h4>安全性</h4>

使用token进行验证，可以有效防御CSRF攻击。CSRF（Cross-site request forgery），中文名称：跨站请求伪造，是一种伪造用户身份进行恶意请求的行为，从而造成客户个人隐私泄露以及财产安全遭到威胁。具体关于CSRF攻击可以参考[浅谈CSRF攻击方式](http://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)。

CSRF 攻击之所以能够成功，是因为黑客可以完全伪造用户的请求，该请求中所有的用户验证信息都是存在于 cookie 中，因此黑客可以在不知道这些验证信息的情况下直接利用用户自己的 cookie 来通过安全验证。使用JWT机制随机产生一个token，同时将token存在浏览器本地存储而非cookie中，在每次发送请求时加上这个token，如果请求中没有 token 或者 token 内容不正确，则认为可能是 CSRF 攻击而拒绝该请求。

这里是我使用jwt进行认证的一个实例[Daocloud-node](https://github.com/Geocld/Daocloud-node)，有需要的可以根据这个例子参考具体的使用。

<h4>缺点</h4>

由于JSON Web Token的独立性，JSON Web Token可以置于请求地址中，也可以加入到HTTP头定义属性中，也就引出了JWT自身的两个缺点：

<h5>请求地址中的token容易被盗取</h5>

使用JSON Web Token验证有一个缺点是难以保证 token 本身的安全。特别是在一些论坛之类支持用户自己发表内容的网站，黑客可以在上面发布自己个人网站的地址。由于系统也会在这个地址后面加上 token，黑客可以在自己的网站上得到这个 token，并马上就可以发动 CSRF 攻击。为了避免这一点，系统可以在添加 token 的时候增加一个判断，如果这个链接是链到自己本站的，就在后面添加 token，如果是通向外网则不加。不过，即使这个 csrftoken 不以参数的形式附加在请求之中，黑客的网站也同样可以通过 Referer 来得到这个 token 值以发动 CSRF 攻击。

<h5>HTTP 头中自定义属性但是局限性太大</h5>

XMLHttpRequest 请求通常用于 Ajax 方法中对于页面局部的异步刷新，并非所有的请求都适合用这个类来发起，而且通过该类请求得到的页面不能被浏览器所记录下，从而进行前进，后退，刷新，收藏等操作，给用户带来不便。另外，对于没有进行 CSRF 防护的遗留系统来说，要采用这种方法来进行防护，要把所有请求都改为 XMLHttpRequest 请求，这样几乎是要重写整个网站，这代价无疑是不能接受的。

<h4>结语</h4>

本文介绍了JSON Web Token的组成以及编码方式，同时简单介绍了JSON Web Token在前后端分离架构下的使用处理方式，最后介绍了相对以往的session登录，token验证登录的安全性，从这几方面可以对JSON Web Token有一个大概的了解。

虽然JSON Web Token是防御CSRF的有效手段，但其依旧存在缺陷和风险，黑客还是有机会获取token并借机伪造用户的身份进行非法操作，这些需要在后续的实践中仔细思考和应对。

（完）



参考：

[CSRF 攻击的应对之道](https://www.ibm.com/developerworks/cn/web/1102_niugang_csrf/)

[谈谈CSRF攻击方式](http://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)

[The Anatomy of a JSON Web Token](https://scotch.io/tutorials/the-anatomy-of-a-json-web-token)

[The Ins and Outs of Token Based Authentication](https://scotch.io/tutorials/the-ins-and-outs-of-token-based-authentication)

