---
layout: post
title: JavaScript中的数据结构——栈(Stack)
subtitle: "栈在JavaScript中的实现和原理"
date: 2015-12-28
author: "lijiahao"
tags: [JavaScript,数据结构,算法]
---

栈(stack)，也称堆栈，在计算机科学领域中，栈是一种线性数据结构，它只能在数据串列或阵列的一端进行入栈(push)和出栈(pop)操作，按照后进先出(LIFO)原理进行运作，一张图表示栈的工作如图1：

![](http://i.imgur.com/yRKp3Ez.png)

下面将使用JavaScript实现这一数据结构。

<h4>栈的操作</h4>
根据栈的工作方式，我们定义栈的两个操作：

1.`push(data)`:加入数据，也称入栈。

2.`pop()`:将最近加入的数据移除，也称出栈。

<h4>栈的具体实现</h4>
通过使用JavaScript构造函数和原型的方式实现栈的功能。每个构造函数拥有`_size`和`_storage`两个属性。

	function Stack() {
	    this._size = 0;
	    this._storage = {};
	}

`_storage`: 存储栈的数据，使用对象作为栈数据的集合；

`_size`： 栈的数据长度，当栈新增加(push)一个数据,时，size长度加1，当栈弹出(pop)一个数据，size长度减1。

有了Stack构造函数，接下来通过原型对象实现push(data)方法（因为push方法时所有栈共有方法，故使用prototype使得该方法共享）。

push(data)方法需要具备以下两个功能：

1.每次增加一个数据，我们希望增加栈的数据长度；

2.每次增加一个数据，我们希望将此数据加在栈的顶端。

具体的代码实现如下：

	Stack.prototype.push = function(data) {
	    // 增加数据长度
	    var size = this._size++;
	 
	    // 将数据加到栈的顶部
	    this._storage[size] = data;
	};

push(data)方法之后就是pop()方法，针对pop()的设计思想是：

1.通过栈的当前的长度获取栈顶数据；

2.删除第一步获得的栈顶数据；

3.栈长度size减1；

4.返回弹出栈的数据。

具体的代码实现如下：

	Stack.prototype.pop = function() {
	    var size = this._size,
	        deletedData;
	if(size) {
	    deletedData = this._storage[size];
	 
	    delete this._storage[size];
	    this.size--;
	 
	    return deletedData;
	  }
	};

故JavaScript实现栈功能的完整代码如下：

	function Stack() {
	    this._size = 0;
	    this._storage = {};
	}
	 
	Stack.prototype.push = function(data) {
	    var size = ++this._size;
	    this._storage[size] = data;
	};
	 
	Stack.prototype.pop = function() {
	    var size = this._size,
	        deletedData;
	 
	    if (size) {
	        deletedData = this._storage[size];
	 
	        delete this._storage[size];
	        this._size--;
	 
	        return deletedData;
	    }
	};

<h4>另一种实现方式</h4>
上面是通过构造函数和原型模式实现了栈的push(data)和pop()操作，实际上，JavaScript的Array已经有现成的push()和pop()方法，通过这两个现成的方法可以轻松实现数据的栈操作。

        //创建一个数组来模拟堆栈
        var a=new Array();
        console.log(a);
        //push: 在数组的末尾添加一个或更多元素，并返回新的长度
        console.log("入栈");
        a.push(1)
        console.log(a);//----->1
        a.push(2);
        console.log(a);//----->1,2
        a.push(3);
        console.log(a);//----->1,2,3
        a.push(4);
        console.log(a);//----->1,2,3,4
        console.log("出栈，后进先出");
        console.log(a);
        //pop：从数组中把最后一个元素删除，并返回这个元素的值
        a.pop();//----->4
        console.log(a);
        a.pop();//----->3
        console.log(a);
        a.pop();//----->2
        console.log(a);
        a.pop();//----->1
        console.log(a);

firebug下的运行结果如下：

![](http://i.imgur.com/zjhUJmO.jpg)

参考资料：

[Data Structures With JavaScript: Stack and Queue](http://code.tutsplus.com/articles/data-structures-with-javascript-stack-and-queue--cms-23348)




	

