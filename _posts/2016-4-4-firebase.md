---
layout: post
title: Firebase使用初探
subtitle: "使用Firebase做为web APP的实时数据平台"
date: 2016-4-4
author: "lijiahao"
tags: [JavaScript]
---
如今许多APP应用都有跨平台客户端，例如微信、evernote等，这些应用有IOS、Android和web客户端，当同一个应用同一个账户在不同的客户端同时登陆时，如果其中一个客户端发生数据变化，那么另一个客户端的数据也会同时发生变化，使用Firebase平台可将这类响应轻松实现，下面将从web端通过javascript操作Firebase来实现简单的数据响应。

本文[在线demo](http://geocld.github.io/demo/use-firebase/firebase.html)

实例[Firebase数据预览](https://geocld-f.firebaseio.com/)

<h4>什么是Firebase</h4>

Firebase是Google旗下的一款实时数据云服务平台，旨在让APP提供一个实时响应的数据服务，该平台适用在IOS、Android、web前端等各种跨平台上，对于没有数据库处理经验的开发者，只需使用自己熟悉的语言将数据放在Firebase上，再通过Firebase提供的API即可实现实时数据同步。例如在web端，两个人在不同的电脑上打开同一个页面，其中一个人在网页上进行了操作导致页面上的数据有了变化，那么这个变化会通过Firebase处理后实时的在另一个人的页面上表现出来。

<h4>引入Firebase</h4>

在web端通过javascript操作Firebase。使用Firebase十分简单，只需在HTML添加script引用即可：

	<script src='https://cdn.firebase.com/js/client/2.2.1/firebase.js'></script>

<h4>创建Firebase数据库</h4>

登陆[Firebase官网](https://www.firebase.com)即可创建自定义数据库

![](http://i.imgur.com/q7GWpUR.png)

在这里我将APP需要使用到的Firebase数据库命名为`geocld-f`，数据库的URL连接自动设置为`https://geocld-f.firebaseIO.com`，创建后进入该数据库管理界面，现在我们需要准备一些初始数据，待后续使用：

![](http://i.imgur.com/xWsGnaX.png)

在这里我创建了两个对象，同时每个对象下有3个属性值，使用Firebase导出为JSON数据如下：

	{
	  "xiaohong" : {
	    "age" : 18,
	    "name" : "xiaohong",
	    "tel" : 12345678
	  },
	  "xiaoming" : {
	    "age" : 19,
	    "name" : "xiaoming",
	    "tel" : 111111
	  }
	}

到这里就很清楚了，通过javascript操作Firebase上的数据，实际上就是操作又Firebase返回的JSON数据。

<h4>实例化Firebase</h4>

回到我们的代码端，现在开始使用Firebase，首先对Firebase进行实例化：

	var myDataRef = new Firebase('https://geocld-f.firebaseio.com/');

这里`new Firebase(URL)`中的URL就是刚才我们创建的数据库的URL地址，这里将Firebase实例化为`myDataRef`变量。

<h4>读取数据库内容</h4>

这里将从Firebase数据库读取的内容放置在一个`div`内：

	<div id='messagesDiv'></div>

接下来使用javascript读取Firebase的内容，使用`on()`方法监听数据库的变动：

	//on方法
	myDataRef.on('value', function(snapshot) {
		var message = snapshot.val();
		displayMessage(message.name, message.age, message.tel);
	});
	function displayMessage(name, age, tel) {
        $('#messagesDiv').append('<div>name:'+name+',age:'+age+',tel:'+tel+'</div>');
        $('#messagesDiv')[0].scrollTop = $('#messagesDiv')[0].scrollHeight;
      };

`on()`的具体参数为：`on(eventType, callback, [cancelCallback], [context])`，其中`eventType`的参数可以为：`value`, `child_added`, `child_changed`, `child_removed`,  `child_moved`,在使用时按需选取合适的事件触发类型，各个事件的使用可查看官方文档。这里选取的是元素添加`child_added`事件，在监听到元素添加后，在回调函数中将元素显示在页面上。

此时刷新页面，会在页面上看到从数据库获取的数据以及渲染出来的内容：

![](http://i.imgur.com/IMvu33y.png)

<h4>为数据库添加数据</h4>

现在已经可以从数据库读取并返回数据，接下来就是实现数据的写入，Firebase的数据写入可以通过`set()`方法或`push()`方法，`set()`方法会将原数据库的内容全部清除，再重新写入用户的数据，`push()`则根据对象的key值写入数据，显然`push()`更适合用在列表添加项的使用。我们的demo实现的是追加个人信息，故使用`push()`实现：

HTML：

	<div id='messagesDiv'></div>
	<input type='text' id='nameInput' placeholder='Name'>
    <input type='text' id='ageInput' placeholder='age'>
    <input type='text' id='telInput' placeholder='tel'>

javascript：

	$('#telInput').keypress(function (e) {
        if (e.keyCode == 13) {
          var name = $('#nameInput').val();
          var age = $('#ageInput').val();
          var tel = $('#telInput').val();
          //使用set方法将数据同步到database
          //myDataRef.set('User ' + name + ' says ' + text);
          //myDataRef.set({name: name, text: text});

          //push方法也是设置数据，适合用在list中
          myDataRef.push({name: name, age: age, tel: tel});

          $('#messageInput').val('');
        }
      });
	
此时在页面上进行验证：添加name=json,age=24,tel="tel1234566"的个人信息，回车，在页面上会添加到渲染的列表中，此时回到Firebase数据管理页面[https://geocld-f.firebaseio.com](https://geocld-f.firebaseio.com)，可以看到新添加的信息已经在数据库中了：

![](http://i.imgur.com/BxdjNb0.png)
![](http://i.imgur.com/NN8999Y.png)


<h4>概述</h4>

到这里，本文针对web APP开发时遇到的数据读取、写入的实现使用Firebase进行了具体的操作，可以看到Firebase为开发者提供了及其便利和友好的API，开发者通过API可以很快的搭建具有数据响应的APP。

由于本人也是刚接触Firebase，对Firebase的理解和使用也有待提高，同时本文也难免有认识不足之处，如有遗漏或错误，谨请指正。

（完）

参考：

[Firebase官方API](https://www.firebase.com/docs/web/api/)

[Firebase官方教程(javascript版本)](https://www.firebase.com/tutorial/#gettingstarted)