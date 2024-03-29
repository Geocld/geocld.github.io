---

layout: post
title: 从零开发一个微型Git
subtitle: 通过编码实战理解Git基本原理
date: 2019-12-09
author: "lijiahao"
tags: ['git']
---

​        

Git是当今最流行的版本控制系统，git的分支切换、版本追溯等功能被大多程序员青睐，大家每天都会用git进行代码提交等工作，例如常见的`git status`、`git add`、`git commit`等操作，那么每次敲这些命令时，有没有想过这些命令的后面发生了什么？为了了解这些原理，你可以去查看git项目的[完整源码](https://github.com/git/git)，但是完整的源码实在是太多了，如果你想先从基础的原理进行了解，那么根本无从下手，那么本文将用简单易懂的方式解释常见的Git命令背后发生的事，并亲自用编码进行具体实现，从零开发一个简易的版本控制系统，让你更系统的理解Git的基本原理。

> 文本涉及的源码可以直接查看[gito](https://github.com/Geocld/gito)



本文将从以下git命令进行解释及实现，我们先带着问题再进入下文：

* `git init`: 一个项目从零初始化成git项目时到底发生了什么事；
* `git status`：查询工作区当前编辑状态，具体查询了哪些内容？当工作区某个文件有变动，那么这个命令是怎么感知到这些变动的？
* `git add`:提交代码需要进行的第一步，这里发生了什么？
* `git commit`:提交代码时紧接在git add后需要执行的动作，这里跟git add有什么区别呢？
* `git reset --hard` or `git checkout [filename]`：当前工作区有变动的文件我突然不想要了，通过此命令一键恢复，那么git是根据什么把原有最新的内容恢复呢？
* `git branch`:分支操作相关的命令，git的分支机制到底是怎么回事呢？切换分支时工作区的文件内容会根据不同的分支进行切换，这些又是怎么做到的呢？



下面本文将带着这些问题逐步揭开git的神秘面纱，并用编码方式自己动手做一个简易的版本控制系统，本文使用的是nodejs进行开发，如果理解了原理，使用任意可以进行系统文件IO操作的编程语言都可以进行开发。



<h3>初始化之谜 ——git init</h3>
一个项目要能做git相关的操作，必须经过`git init`操作，经过`git init`后，会在项目根目录生成`.git`文件夹，此文件夹是隐藏的，注意在操作系统打开”隐藏文件显示“才能看到。我们来看看`.git`文件夹下有什么：

```bash
$ cd .git && ls -F1
HEAD
branches/
config
description
hooks/
info/
objects/
refs/
```

该目录下可能还会包含其他文件，不过对于一个全新的 `git init` 版本库，这将是你看到的默认结构。每个目录、文件功能如下：

* `description`: 仅供 GitWeb 程序使用，我们无需关心；
* `config`: 包含项目特有的配置选项；
* `hooks目录`: 包含客户端或服务端的钩子脚本（hook scripts），可以在执行git命令时执行一些额外的操作，可以自定义相关比较出名的开源项目是[husky](https://github.com/typicode/husky)，如果想把git玩出个性化，强烈推荐试试这个项目；
* `info目录`：包含一个全局性排除（global exclude）文件，用以放置那些不希望被记录在 .gitignore 文件中的忽略模式（ignored patterns），打开info/exclude文件可以看到内容如下：

```
# git ls-files --others --exclude-from=.git/info/exclude
# Lines that start with '#' are comments.
# For a project mostly in C, the following would be a good set of
# exclude patterns (uncomment them if you want to use them):
# *.[oa]
# *~
.DS_Store

```

可以看到内容跟我们常见的.gitignore很像，因此可以简单理解成跟.gitignore差不多的作用即可。



剩下还有4个文件/文件夹：`HEAD`、`objects目录`、`refs目录`还有一个尚未创建的`index文件`，这几个就是git的核心组成部分。

*  `objects` 目录存储所有数据内容；

* `refs` 目录存储指向数据（分支）的提交对象的指针。Git中，一个*分支（branch）*、*远程分支（remote branch）*或一个*标签（tag）*（也称为轻量标签）仅是**指向一个实体的一个指针**，这里的实体通常是一个commit实体，其实这个 **指针**在Git中反映出来的也就是一个**文件**。

* `HEAD` 文件指向当前分支的索引，也就是上述refs内的指针引用。文件内容很简单：

  ```bash
  $ cat HEAD
  ref: refs/heads/master
  ```

* `index` 文件保存暂存区，以二进制文件形式存储。当`git add`一个文件，Git将该文件的信息添加到索引中。当`git commit`，Git仅提交索引文件中列出的文件，这个步骤后面会有详细介绍及实现。

  

这几个文件在后续还会继续重复提到，也是我们后续实现git基本功能的关键所在。

`git init`后.git目录内的关键文件状态如下：

![git-init](/img/gito/git-init.png)

接下来就是`git init`的实现，`git init`执行后发生的事其实就是生成一些`.git`的相关文件:

* 创建空目录`.git/objects/`和`.git/refs/`
* 创建符号索引文件`HEAD`

具体实现如下：

```javascript
init = function () {
    const projectDir = workSpace();
    fs.exists(`${projectDir}/.gito`, (is_exist) => {
        if (is_exist) {
            console.log('your project has been Initialized.');
        } else {
          	// 生成.git的几个核心文件即可
            shell.mkdir(`${projectDir}/.gito`, `${projectDir}/.gito/objects`, `${projectDir}/.gito/refs`, `${projectDir}/.gito/refs/heads`);
            fs.writeFile(`${projectDir}/.gito/HEAD`, 'ref: refs/heads/master', (err) => {
                if (err) {
                    log.err(err);
                }
                console.log(`Initialized empty gito repository in ${projectDir}`);
            });
        }
    });
}
```

<h3>添加新文件 ——git add</h3>
在初始化的工作区内新增一个`a.txt`的文本，内容为`hello world`,执行的git命令如下：

```bash
$ echo "hello world." >> a.txt
$ git add .
```

那么这个过程发生了什么呢？前面有提到`.git`目录下的`index`文件，在Git概念里叫做`暂存区`，`git add`操作直接与这个暂存区（index）有关联，当`git add`命令执行时，git会将当前工作区下所有文件（.gitignore内声明的文件除外）建立一份索引，索引内记录文件的名字、SHA1值，然后将此索引写入index文件内，同时在`.git/objects/`内生成对应文件的信息，在Git概念里称为blob，blob里存储了文件的内容，可以通过git内置命令`git cat-file blob [sha1]`来验证：

```bash
# .git/objects/92/7b3dd132fed9ee8e7d3d8824709717c209ee74
$ git cat-file blob 5f89c6
hello world.
```

需要注意的是Git的blob是以目录的形式存放在`.git/objects/`下面的，以SHA1前两位作为目录名，第二位之后的字符串作为blob的文件名。`git add`命令执行后的状态如下:

![git-add](/img/gito/git-add.png)

> 关于[SHA1](https://zh.wikipedia.org/wiki/SHA-1)值，在Git中，使用SHA1值来记录文件、目录，每个文件、目录的SHA1值都是唯一的，如果文件或目录有所改动，那么对应的SHA1值也会改变，这也是Git能确保文件和SHA1值一一对应的重要原因。

接下来就是`git add`的实现，首先就是索引的设计，在执行add操作时，需要遍历一遍工作区文件，这里我将结果以JSON的形式返回，这样就可以很容易的查看目录和文件之间的层级关系，例如:

```js
{ 
  '/gito/example/a.txt': { 
    metaData: { type: 'blob', length: 16, content: 'dasds hellodada\n' },
    SHA1: '927b3dd132fed9ee8e7d3d8824709717c209ee74' 
  } 
}
```

该索引以文件的绝对路径作为key，对应的值包括metaData及SHA1，metaData里包括了当前节点类型（type），内容长度（length）以及文件的内容（content）。遍历后得到的索引树，就可以在`git add`命令执行时将索引树写入index文件内，将metaData的内容写入`.git/objects/`对应的blob文件，代码片段如下：

```javascript
			readfiles(workSpace(), { // 遍历读取工作区文件, 获取索引树
                exclude: data, // 排除掉gitignore文件
                excludeDir: data,
            }, function (err, files) {
                // console.log('finished reading files:',files);
                let filesWithoutContent = parseJson(jsonToString(files));
                for (let k in filesWithoutContent) {
                    delete filesWithoutContent[k].metaData
                }
                // 1.将文件信息写入index
                writeIndex(filesWithoutContent).then(() => {
                    console.log('Index write succeeded.')
                });
                // 2.在object中生成相应的blob
                let writeBlobPromises = [];
                for (let kf in files) {
                    const filename = workSpace() + '/.gito/objects/' + files[kf].SHA1.substring(0, 2) + '/' + files[kf].SHA1.substring(2);
                    const content = compress(jsonToString(files[kf].metaData));
                    shell.mkdir(workSpace() + '/.gito/objects/' + files[kf].SHA1.substring(0, 2));
                    writeBlobPromises.push(Promise.resolve(
                        new Promise((resolve, reject) => {
                            fs.writeFile(filename, content, (err) => {
                                if(err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        })
                    ));
                }
                Promise.all(writeBlobPromises).then(() => {
                    console.log('Blob write succeeded');
                    resolve();
                });
            });
```

<h3>首次提交 ——git commit</h3>
`git commit`时，会获取当前工作区文件的状态，并通过当前工作区文件的SHA1值与暂存区内保存的状态进行比较，如果有没有添加到暂存区的文件，会抛出提示让你先`git add`:

![git-commit-err](/img/gito/git-commit-err.png)

在确保当前工作区的文件状态与暂存区的索引状态一致后，才会进行真正的commit提交：

* 创建tree实体，该tree代表当前工作区根目录（如例子中的example），设计的tree数据结构如下：

  ```js
  { 
  	type: 'tree', // 注明为tree实体
    metaData:{ 
       path: '/example',
       name: 'example',
       children: {  // tree内包含了blob实体的内容
          '/gito/example/a.txt': { 
            metaData: { type: 'blob', length: 16, content: 'dasds hellodada\n' },
            SHA1: '927b3dd132fed9ee8e7d3d8824709717c209ee74' 
          } 
        },
       size: 16,
       type: 'directory',
       SHA1: 'a75fdcad655ee70f94da8159dc1b84999e6e710f' 
    } 
  }
  ```

* 创建commit实体，指向代码仓库根目录的tree实体。

  ```js
  { 
    type: 'commit',
    tree: 'a75fdcad655ee70f94da8159dc1b84999e6e710f', // commit指向顶层tree
    time: 1575616392423,
    desc: 'first commit',
    parent: null 
  }
  ```

  commit实体和tree实体的生成与blob实体的创建相同，都是将上述数据内容写入`.git/objects/`内，以SHA1前两位为文件夹，两位后的内容为文件名。

  此时可以注意到，commit实体的内容没有记录SHA1，这是因为commit已经是`.git/objects/`保留在最外面的一个实体类型，在外部索引时直接根据commit的SHA1来定位到实体文件夹再读取对应的文件内容即可。当前分支最新commit由` .git/refs/heads/master`记录:

  ```bash
  $ cat .git/refs/heads/master 
  03df553394ddda360a45634fb1eb9c7c61b6074c
  ```

  `git commit`后的git工作区状态如下：

  ![git-commit](/img/gito/git-commit.png)

整个commit生成对应的实体即修改` .git/refs/heads/master`实现如下：

```javascript
													// 2.objects中生成commit实体即tree实体
                            const tree = directoryTree(workspace, {
                                exclude: excludeFiles
                            });
                            const shaTree = getShaTree(tree, data);
                            const fullshaTree = calcDirTreeSha(shaTree);
                            const treeContent = {
                                type: 'tree',
                                metaData: fullshaTree
                            }
                            // 2.1 objects中生成tree对象
                            const filename = workSpace() + '/.gito/objects/' + fullshaTree.SHA1.substring(0, 2) + '/' + fullshaTree.SHA1.substring(2);
                            const content = compress(jsonToString(treeContent));
                            shell.mkdir(workSpace() + '/.gito/objects/' + fullshaTree.SHA1.substring(0, 2));
                            fs.writeFile(filename, content, (err) => {
                                if(err) {
                                    log.err(err);
                                } else {
                                    // console.log('tree写入成功');
                                }
                            });

                            // 2.2 objects中生成commit对象
                            getHead().then((ref) => {
                                fs.readFile(ref.refFullPath, { encoding: 'utf8' }, (err, data) => {
                                    let commitObj = {};
                                    commitObj.type = 'commit';
                                    commitObj.tree = fullshaTree.SHA1;
                                    commitObj.time = new Date().getTime();
                                    commitObj.desc = desc;
                                    if (mergeCommitSHA) {
                                        commitObj.merges = {}
                                        commitObj.merges[mergeCommitSHA] = true;
                                    }
                                    if(err) {
                                        commitObj.parent = null;
                                    } else {
                                        commitObj.parent = data;
                                    }
                                    
                                    const commitSha = getSHA1(jsonToString(commitObj));
                                    const commitFilename = workSpace() + '/.gito/objects/' + commitSha.substring(0, 2) + '/' + commitSha.substring(2);
                                    const commitContent = compress(jsonToString(commitObj));
                                    shell.mkdir(workSpace() + '/.gito/objects/' + commitSha.substring(0, 2));
                                    fs.writeFile(commitFilename, commitContent, (err) => {
                                        if(err) {
                                            log.err(err);
                                        } else {
                                            // console.log('commit写入成功');
                                            // 3.将当前commit加入到该分支的引用，即写入/refs/heads/xxx文件
                                            fs.writeFile(ref.refFullPath, commitSha, (err) => {
                                                if(err) {
                                                    log.err(err);
                                                } else {
                                                    console.log(`[${ref.curBranch} ${commitSha.substring(0,6)}] ${desc}`);
                                                    if (modifiedFiles.length) {
                                                        console.log(`${modifiedFiles.length} files changed`);
                                                    }
                                                    if (newFiles.length) {
                                                        console.log(`${newFiles.length} files added`);
                                                    }
                                                    if (deletedFiles.length) {
                                                        console.log(`${deletedFiles.length} files deleted`);
                                                    }
                                                    resolve();
                                                }
                                            });
                                        }
                                    });
                                });
                            });
```

到这里我们已经了解了Git仓库从初始化到第一次commit的流程，接下来我们继续对仓库进行修改新增文件操作，看看Git内部会有什么变化。

<h3>添加一个修改过的文件</h3>

对之前的`a.txt`进行修改并进行`git add`操作：

```bash
$ echo "Welcome everyone." >> a.txt
$ git add .
```

此时Git内部发生了如下变化：

* 更新了暂存区索引文件(index)，将当前修改后的文件`a.txt`最新状态（包含文本内容、SHA1值）进行更新。
* 创建了新的blob实体，`a.txt`整个内容被存入一个新的blob实体。

![git-add-2](/img/gito/git-add-2.png)



如添加一个新的文件，Git也会执行类似的操作，即更新整个暂存区index，然后在创建对应的blob实体。

<h3>第二次提交</h3>

紧接着进行第二次commit操作:

```bash
$ git commit -m "second commit"
```

此时Git内部发生如下变化：

* 生成新的tree实体，tree内容包含了当前工作区目录的最新文件结构:

  ```js
  { 
    type: 'tree',
    metaData:
     { path: '/example',
       name: 'example',
       children: {  // tree内包含了最新blob实体的内容
          '/gito/example/a.txt': { 
            metaData: { type: 'blob', length: 16, content: 'dasds hellodada\n' },
            SHA1: '927b3dd132fed9ee8e7d3d8824709717c209ee74' 
          } 
        },
       size: 19,
       type: 'directory',
       SHA1: '1d785936850fad94d71c96ed7271d58c0e90ad0b' 
     } 
  }
  ```

* 生成新的commit实体，，指向当前最新的tree实体，并通过parent字段指向首次提交的commit实体，这样就形成了一个提交图谱：

  ```js
  { 
    type: 'commit',
    tree: '1d785936850fad94d71c96ed7271d58c0e90ad0b',
    time: 1575708813884,
    desc: 'second commit',
    parent: '03df553394ddda360a45634fb1eb9c7c61b6074c' // 指向首次提交的commit
  }
  ```

* 更新了分支“master”引用，即更新`.git/refs/heads/master`，指向该分支中最新的commit实体:

  ```bash
  $ cat .git/refs/heads/master
  80ca97c4f6982a282e69c86dbcc00bfb721f73f7
  ```

提交后的Git内部结构如下：

![git-commit-2](/img/gito/git-commit-2.png)

到这里我们就可以知道git几乎都是通过文本的形式来记录各个文件的状态和内容，并通过commit实体来把每一次提交联系在一次，这也是通过`git log`命令能够查看完整的git提交图谱的原理。

<h3>分支机制——Git的终极武器之谜</h3>

最后再看下Git的分支机制，Git的分支机制创建、切换效率是其他版本控制（如SVN）达不到的，这也是Git的重要特色之一，日常中也有很多使用的场景，那么Git到时是如果做到切换新建分支和切换分支达到秒切的呢。

<h4>新建分支</h4>

Git新建分支其实就只是**改变head的指向**，在`git commit`提交的流程中，始终有一个文件指向当前最新的commit，这个文件就是`.git/refs/heads/master`，其实heads这个目录就是以文件的形式存放Git分支的各个指针，我们默认的分支为master，因此`.git/refs/heads`下就默认有一个master的文件，此时在master分支上新建一个名为`dev`的分支：

```bash
$ git branch dev
A new branch named 'dev' is created.
```

此时`.git/refs/heads`下就新生成一个`dev`的文件，内容与master一样：

```bash
$ cat .git/refs/heads/dev
80ca97c4f6982a282e69c86dbcc00bfb721f73f7
```

Git的内部状态如下：

![git-branch-new](/img/gito/git-branch-new.png)

实现新建分支的代码片段如下：

```javascript
function createBranch (branchname) {
    const newBranchPath = `${workSpace()}/.gito/refs/heads/${branchname}`;
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        if (hdfiles[newBranchPath]) {
            console.log(`fatal: A branch named '${branchname}' already exists.`);
            return false;
        }
        // console.log(hdfiles)
        getHead().then(ref => {
            fs.writeFile(newBranchPath, hdfiles[ref.refFullPath].metaData.content, (err, data) => {
                if (err) {
                    log.err(err);
                }
                console.log(`A new branch named '${branchname}' is created.`);
            });
        });
        
    });
}
```



<h4>切换分支</h4>

在`.git`根目录下有一个名为`HEAD`的文件，这个文件即指向的是当前分支：

```bash
$ cat .git/HEAD
ref: refs/heads/master
```

可以看到，指向的其实还是refs文件夹下的分支文件，如果进行分支切换操作，那么其实只是改变HEAD这个文件的内容即可:

```bash
$git checkout dev
Switched to branch 'dev'
```

切换分支后的Git状态如下：

![git-branch-dev](/img/gito/git-branch-dev.png)

实现分支切换的代码如下：

```javascript
function switchBranch (branchname) {
    const branchPath = `${workSpace()}/.gito/refs/heads/${branchname}`;
    readfiles(`${workSpace()}/.gito/refs/heads`, {
        exclude: ['.DS_Store'],
    }, function (err, hdfiles) {
        if (err) {
            log.err(err);
        }
        if (!hdfiles[branchPath]) {
            log.err(`branchname '${branchname}' did not match any branch(s) known to gito.`);
        }
        getHead().then(ref => {
            if (ref.curBranch === branchname) {
                console.log(`Already on '${branchname}'`);
                return false;
            }
            fs.writeFile(`${workSpace()}/.gito/HEAD`, `ref: refs/heads/${branchname}`, (err, data) => {
                if (err) {
                    log.err(err);
                }
                // 修改HEAD同时reset至当前head指向的commit
                reset();
                console.log(`Switched to branch '${branchname}'`);
            });
        });
    });

```

<h4>分支合并</h4>

每个分支都会指向一个该分支最新的commit，每个commit都会有一个指针parent指向的上一个commit，进而每个分支都会有一个独立的由commit实体组成的`链表`结构，如需进行分支合并操作，那么只需将两个分支对应的两条`链表`下的内容合并即可。Git是怎么区分当前分支与另一个分支的修改，然后在文件没有冲突的时候进行合并，有冲突然后进行差异提示的呢？这里Git用到了[Three-way-merge](https://en.wikipedia.org/wiki/Merge_(version_control)#Three-way_merge)算法，关于`Three-way-merge`算法的介绍可以看[这篇文章](https://marsishandsome.github.io/2019/07/Three_Way_Merge)，写的很通俗易懂。`git merge`这个过程需要做以下事情：

1. 两个分支链表先找到最近的共同节点:

   ```javascript
   function getCommonNode (destList, sourceList) {
       let destListLen = getListLen(destList);
       let sourceListLen = getListLen(sourceList);
       let firstGoList = (destListLen > sourceListLen) ? destList : sourceList;
       let laterGoList = (destListLen > sourceListLen) ? sourceList : destList;
       let diff = (destListLen > sourceListLen) ? (destListLen - sourceListLen) : (sourceListLen - destListLen);
       let firstGoListHead = firstGoList;
       let laterGoListHead = laterGoList;
       if (diff) {
           for (let i = 0; i < diff; i++) {
               firstGoListHead = firstGoList.next;
           }
       }
       while (firstGoListHead && laterGoListHead && firstGoListHead.data.commit !== laterGoListHead.data.commit) {
           if (firstGoListHead.data.merges && firstGoListHead.data.merges[laterGoListHead.data.commit]) { // 有过merge记录的分支处理
               firstGoListHead = laterGoListHead;
               break;
           } else if (laterGoListHead.data.merges && laterGoListHead.data.merges[firstGoListHead.data.commit]) { // 有过merge记录的分支处理
               firstGoListHead = firstGoListHead;
               break;
           } else {
               firstGoListHead = firstGoListHead.next;
               laterGoListHead = laterGoListHead.next;
           }
       }
       return firstGoListHead;
   }
   
   const commonNode = getCommonNode(destList, sourceList);// 找到共同节点
   ```

2. 以`commonNode`节点为基础，这个节点其实就是一个具体的`commit`实体，遍历改实体下的所有`blob`实体，然后以以这个blob实体为标准进行`3-way merge`合并:

   ```javascript
   // 3.2 遍历commonBlobs，使用3-way merge
                       let conflictFiles = [];
                       for (let blobname in commonBlobs) {
                           if (destBlobs[blobname] && sourceBlobs[blobname]) {
                               const commonBlobCon = parseJson(files[commonBlobs[blobname]].content);
                               const destBlobCon = parseJson(files[destBlobs[blobname]].content);
                               const sourceBlobCon = parseJson(files[sourceBlobs[blobname]].content);
                               const result = merge(destBlobCon.content, commonBlobCon.content, sourceBlobCon.content);
                               const mergeResult = {
                                   conflict: result.conflict,
                                   result: result.result.join('')
                               }
                               console.log(mergeResult)
                               let writeFilesPromises = [];
                               let conflictWriteFilesPromise = [];
                               if (mergeResult.conflict) {
                                   conflictFiles.push(blobname);
                                   conflictWriteFilesPromise.push(Promise.resolve(
                                       new Promise((resolve, reject) => {
                                           fs.writeFile(blobname, mergeResult.result, (err) => {
                                               if(err) {
                                                   reject(err);
                                               } else {
                                                   resolve();
                                               }
                                           });
                                       })
                                   ));
                               } else {
                                   writeFilesPromises.push(Promise.resolve(
                                       new Promise((resolve, reject) => {
                                           fs.writeFile(blobname, mergeResult.result, (err) => {
                                               if(err) {
                                                   reject(err);
                                               } else {
                                                   resolve();
                                               }
                                           });
                                       })
                                   ));
                               }
                               
                               Promise.all(writeFilesPromises).then(() => {
                                   // 执行add，commit命令更新commit树
                                   add().then(() => {
                                       commit(`merge ${branchname} to ${ref.curBranch}.`, sourceheadCommit).then(() => {
                                           if (conflictFiles.length) {
                                               Promise.all(conflictWriteFilesPromise).then(() => {
                                                   conflictFiles.forEach(f => {
                                                       console.log(`CONFLICT (content): Merge conflict in ${f}`);
                                                   });
                                                   console.log(`merge failed; fix conflicts and then commit the result.`);
                                               });
                                           }
                                       });
                                   });
                               });
                           }
                       }
   ```

   合并过程基本就是`dest -> base(common) <- source`的模型结构，以链表公共节点为基础进行差异比较，这样就能知道最后哪些文件有过删改、文件具体修改的内容等关键信息。

<h3>关于Git的疑问总结</h3>

到这里，我们已经通过实战编码自己实现了Git的核心功能，因此之前对Git有疑问的地方都有了解答：

* Git是怎么记录我们的工作区内容的？版本回退或工作区状态检查是怎么做到的？

  Git通过`blob`、`tree`和`commit`实体记录工作区的文件结构、文件内容的信息，如果进行版本回退，只需找到指定版本对应的commit实体，然后在恢复该实体下对应的文件内容即可。

* Git的分支切换和合并为何如此之快?

  Git通过一个文本记录当前当前分支，当前分支又指向一个具体的commit实体，分支切换只需要改变`.git/HEAD`文件内分支的指向即可，这个内容很少，几乎是秒切；分支合并也是通过链表索引的方式进行分支合并，合并过程也是一些文件读写的操作，速度很比较快。

* `git status`检查了哪些内容？

  检查暂存区index文件与当前commit实体顶层tree实体下的文件状态。

<h3>总结</h3>

Git是一个伟大的发明，Git的原理也很符合其创始人linus开发Linux时的理念“All in file”。用文本将抽象的概念实体化而不失效率，实际上Git的工作原理要复杂的多，本文只是对基本原理进行了简单的实现，如对本文的实现具体源码感兴趣，可以直接查看我的GitHub项目[gito](https://github.com/Geocld/gito)，该项目实现了Git大部分常用功能，如深入解读，相信读者对Git的工作原理能有更深的了解。



(完)