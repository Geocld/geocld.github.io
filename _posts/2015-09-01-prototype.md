---
layout: default
layout: page
layout: post
title: JavaScript prototype的一些理解
category: JavaScript
tag: [JavaScript]
---
#JavaScript prototype的一些理解
之前JavaScript的面向对象思想接触较少，近期在面向对象的专题复习中，之前只了解原型模式、构造函数模式+原型模式可以进行面向对象编程，且通过prototype属性，可以为构造函数提供共用的函数访问，但是对prototype的设计来由、JavaScript的内部实现方式知之甚少，通过参阅《JavaScript高级程序设计》和参考各种大牛的博客文章，个人对prototype的有一些许新的理解。

###理解原型对象和prototype
每个函数都有一个prototype（原型）属性，这个属性是一个**指针**，指向一个对象，JavaScript中这个对象就是**原型对象**，原型对象的用途是包含我们需要创建对象所具备的属性和方法。

>JavaScript中，无论什么时候，只要创建了一个函数，就会根据一组特定的规则为该函数创建一个prototype属性，这个属性指向函数的原型对象。在默认情况下，所以原型对象都会自动获得一个constructor（构造函数）属性，这个属性包含一个指向prototype属于所在函数的指针。

以上是《JavaScript高级程序设计》对prototype和constructor的文字描述，简单的说，就是**函数自带prototype属性，prototype属性指向该函数的原型对象（原型对象中包含属性和方法），原型对象中有一个constructor属性，该属性又指会函数本身**。举个例子：

	function Student() {

	}
	Student.prototype.name = "xiaoming";
	Student.prototype.sayhello = function(){
		alert("hello");
	};

例子中创建一个名为Student的函数，该函数与原型对象的关系如下图：
![](http://i.imgur.com/rBCkhhy.jpg)