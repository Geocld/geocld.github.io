---
layout: post
title: RESTful API的前后端分离实现
subtitle: "还在为充满各类模板语言的前端代码困扰吗，试试基于RESTful API的前后端分离吧！"
date: 2016-8-27
author: "lijiahao"
tags: [Python,vue.js]
---
在配合后端进行页面开发时，在非MVC时代，页面配合后端数据通常采用的是后端模板（如smarty、jinja等）+前端html进行开发，例如以下代码

![](http://pics.hitour.cc/430ed9860e7fa6921b333f0be7597052.png)

也就是采用的是前后端耦合的方式将后端数据渲染出来，这样的方式使得前端页面代码可读性差，在后端数据发生结构变化时，前端还得配合后端数据模板进行修改。使得页面的可维护性大大下降、开发效率下降，个人不是很喜欢这样的开发模式，相比之下，使用RESTful服务器为前端提供API进行页面开发是当前较为推荐的前后端分离模式。

<h4>什么是REST？</h4>
REST (REpresentational State Transfer) 是Web服务实现方案之一，近年来因其简介的设计模式而被广泛采用，如今REST已经变成了web services 和 web APIs 的标配。

REST系统有如下特点：

- 客户端-服务器：客户端与服务器隔离，服务器提供服务，客户端进行消费；
- 无状态：从客户端到服务器的每个请求都必须包含理解请求所必需的信息。也就是说，服务器不会存储客户端上一次请求的信息用来给下一次使用。
- 可缓存：服务器必须明示客户端请求能否缓存。
- 分层系统: 客户端和服务器之间的通信应该以一种标准的方式，就是中间层代替服务器做出响应的时候，客户端不需要做任何变动。
- 统一的接口: 服务器和客户端的通信方法必须是统一的。
- 按需编码: 服务器可以提供可执行代码或脚本，为客户端在它们的环境中执行。这个约束是唯一一个是可选的。

<h4>建立一个web service服务器</h4>
了解了REST系统，接下来就是通过REST`客户端-服务器`的特点建立一个web service服务器，为前端工作提供API接口。

本文使用的是Python的Flask框架进行REST服务器搭建。这个服务器实现了页面端通过API接口以GET、POST等HTTP标准方法进行请求、响应，并将结果以JSON数据的形式返回，从而实现页面应用的开发。

<h5>1.设置页面根路径</h5>
开发之前需要在服务器端设置页面的根路由，以便在打开指定页面地址时能打开对应的页面，本文以`static`目录下的`index.html`文件作为根路由显示文件：

	#设置根路由
	@app.route('/')
	def root():
		return app.send_static_file('index.html')

运行服务器，打开`http://127.0.0.1:5000/`即可看到index.html的页面内容。

<h5>2.GET API访问数据</h5>

根路由创建并且可以访问到`index.html`文件后，接下来就可以利用前端AJAX请求来获取服务器的数据了，因为本文不涉及数据库的使用和操作，所以我将服务器数据内容静态的写在`app.py`中，数据是一个tasks任务的json数据：

```python
#模拟json数据
tasks = [
    {
        'id': 1,
        'title': u'Buy groceries',
        'description': u'Milk, Cheese, Pizza, Fruit, Tylenol',
        'done': False
    },
    {
        'id': 2,
        'title': u'Learn Python',
        'description': u'Need to find a good Python tutorial on the web',
        'done': False
    }
]
```

该tasks数据有几个字段，分别是：`id`作为每个task的唯一标识符，在后续的修改操作尤其重要；`title`是task的标题；`description`是task的具体内容；`done`表示task是否已完成。

前端页面为了获取数据，可直接采用`GET`方式请求内容，这里将接口命名为`/todo/api/tasks`，请求方式为`GET`:

```python
#GET方法api
@app.route('/todo/api/tasks', methods=['GET'])
def getTasks():
	return jsonify({'tasks': tasks})
```

为了验证刚才模拟的tasks数据可以访问，在前端页面还没开发时，可以直接访问`/todo/api/tasks`查看数据：运行服务器，访问`http://127.0.0.1:5000/todo/api/tasks`可以直接查看json数据。

<h5>3.POST API数据修改数据</h5>

用户在进行页面访问时，有可能需要对当前数据库内容进行新增或者删除，此时需要开发一个POST请求的API，可接受前端AJAX参数进行进一步的数据库读取操作。首先是新增tasks任务，API接口名字为`/todo/api/addTask`，方法为`POST`：

```python
#POST方法API，添加数据项
@app.route('/todo/api/addTask', methods=['POST'])
def add_task():
	pass
```

结合tasks的数据结构，为了新增task任务，需要有以下参数进行标识：

```python
task = {
		'id' : tasks[-1]['id'] + 1,
		'title': request.json['title'],
		'description' : request.json.get('description', ""),
		'done' : False
	}
```

其中`request`就是页面AJAX的请求信息。

整合了AJAX的请求信息就可以直接插入现有的数据库中了，完整的POST新增task的代码如下：

```python
#POST方法API，添加数据项
@app.route('/todo/api/addTask', methods=['POST'])
def add_task():
	if request.json['title'] == "":
		abort(400)
	task = {
		'id' : tasks[-1]['id'] + 1,
		'title': request.json['title'],
		'description' : request.json.get('description', ""),
		'done' : False
	}
	tasks.append(task)
    #tasks变动后返回新数据到页面，状态码201
	return jsonify({'tasks': tasks}), 201
```

同理，如果需要删除tasks中的某一项，需要以task的id作为标识符，请求方式同样为`POST`:

```python
#POST方法API，删除数据项
@app.route('/todo/api/deleteTask', methods=['POST'])
def delete_task():
	task_id = request.json['id']
	for task in tasks:
		if task['id'] == task_id:
			tasks.remove(task)
			return jsonify({'tasks': tasks}), 201
```

<h5>4.404错误</h5>

如果前端访问一个不存在的接口，需要抛出404错误提示：

```python
#404
@app.errorhandler(404)
def not_found(error):
	return make_response(jsonify({'error': 'Not found'}), 404)
```

<h4>API在前端的调用与渲染</h4>

前端调用无非就是使用AJAX进行数据请求，AJAX可以使用`XMLHttpRequest`、`$ajax()`等多种方式进行请求。本文使用的是MVVM框架vue.js进行接口调用并渲染页面，接口调用使用`vue-resource`的`$http()`方法。

首先在页面加载时访问接口，并将接口返回的数据渲染到页面上：

```javascript
data: {
    tasks: []
},
compiled: function() {
	var self = this;
	//在编译后即调用API接口取得服务器端数据
	self.$http.get('/todo/api/tasks').then(function(res) {
		self.tasks = res.data.tasks;
	});
}
```

视图模型如下：

```html
<div v-for="task in tasks">
    <div>
        {{ task.id }}
        {{ task.title }}
        <button @click="deleteTask(task.id)">x</button>
    </div>

    <div>
        {{ task.description }}
    </div>
</div>

<div class="box">
	<input type="text" v-model="new_task.title"><br>
	<textarea cols="30" rows="10" v-model="new_task.description">		</textarea>
	<button @click="addTask">add</button>
</div>
```

在视图模型中我还加入了可以添加、删除数据的操作`addTask`、`deleteTask`,对应的接口调用方法如下：

```javascript
methods: {
      addTask: function() {
      	var self = this;
      	self.$http.post('/todo/api/addTask', {
      		title: self.new_task.title,
      		description: self.new_task.description
      	}).then(function(res) {
      	self.tasks = res.data.tasks;
      	});
      },
      deleteTask: function(id) {
            var self = this;
            self.$http.post('/todo/api/deleteTask', {
              id: id
            }).then(function(res) {
              self.tasks = res.data.tasks;
            });
      }
}
```

此时再打开`http://127.0.0.1:5000/`就可以看到数据渲染、添加、删除等一系列前端效果，至此一个简单的前后端分离的实践已经结束。

<h4>总结</h4>

本文通过Python的Flask框架搭建了一个可以响应GET、POST请求的RESTful服务器，为前端页面提供了相应的操作API接口，同时使用vue.js进行数据请求和渲染，展现了前端页面如何调用API接口，可以看到使用RESTful API进行前后端分离有以下优点：

1. 不再使用后端模板语言，前端页面代码可读性大大提高，维护性也大大提高；
2. 通过前后端分离，具有数据交互的页面当做SPA开发，前端工程师可以更加专注的开发高性能、用户体验良好的页面；后端工程师只需为前端提供API接口，可以将更多的精力专注与后端的工作，前后端的业务专注度也有很大的提高；
3. 如果使用MVVM框架进行页面开发，通过API数据响应可以自动更新dom，不需要开发者直接操作dom，也提高了页面的可维护性。

本文完整代码可直接到https://github.com/Geocld/RESRful-API-with-vuejs进行查看，由于本人对部分知识了解不深，在文章里也写的比较肤浅，还请各位批评指正。

（完）