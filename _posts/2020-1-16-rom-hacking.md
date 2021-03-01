---
layout: post
title: 关于Rom Hacking你可以了解到的一些事
subtitle: 游戏汉化技术点揭秘
date: 2020-1-16
author: "lijiahao"
tags: ['other']
---

说到`Rom Hacking`可能很多人都会觉得陌生，但相信很多人都有接触过`Rom Hacking`的产物，比如早年在GBA、NDS、PSP大放异彩的汉化游戏，就是一个典型的`Rom Hacking`的产物，游戏的汉化就是一个原汁原味的`Rom Hacking`应用，那么`Rom Hacking`到底是什么，`Rom Hacking`对汉化有什么作用，今天这篇文章将以寓教于乐的目的来揭开`Rom Hacking`的神秘面纱，来看看`Rom Hacking`里面用到哪些技术点。

> 声明：本文仅限于`Rom Hacking`的技术探索，不用于任何形式的破解及盗版传播。

<h3>0. Rom Hacking的背景及要点</h3>
早年游戏厂商对中文区域不是很重视，游戏语言版本以日语及英语居多，别的地区也有很多人有语言版本的需求，那么游戏汉化组应运而生，游戏汉化组是民间自发组织、以非盈利为目的的团体。在GBA、NDS、PSP时代民间汉化达到了高峰，巅峰时期一个月可以发布3、4款汉化游戏，汉化组集合了程序员、翻译、美工、测试等众多工种，其中处了测试外，其他工种都有`Rom Hacking`有着密切的联系，汉化一个游戏有以下几个步骤：
1. 解包：对游戏Rom进行解包，得到Rom内的各种资源文件，包括文本、图片、字库等，解包过程需要对Rom结构有充分的了解并可以通过编码的形式来提取文件；
2. 字库扩充：对字库进行扩充，加入中文字体，为接下来的翻译做好基础；
3. 翻译：对提取出来的文本、带文字图片进行翻译；
4. 润色：翻译工作完成后，需要对翻译工作进行润色，换句话说就是优化，看哪些语句可以简短一些以达到字库优化的效果；
5. 打包：就是解包的逆操作，所以在解包时要考虑能否重新把资源打包，不然后续的汉化过程也就完全没有意义。

不同的机种对应的Rom是不同的，常见的游戏Rom有类型为:`*.gba`、`*.iso`、`*.nds`、`*.cia`、`*.3ds`等，下面我们就以3DS掌机常用的`cia`文件进行简单的分析和操作，对这个cia文件进行一次`Rom Hacking`。

<h3>1. Rom的解包</h3>
不同格式的Rom解包方式也是不一样的，通常来说解包有比较成熟的解包工具可以直接使用，但解包工具不成熟时扔需要自己开发解包工具。早年`*,gba`文件貌似没法解包，只能通过Rom的二进制来反推算出文本、字库的信息，后期的`.nds`可以将一个Rom拆解为多个文件，psp端的`*.iso`文件更直接，一个压缩文件，通过常用的解压工具即可对Rom进行初步解包，3DS端的`.3ds`、`.cia`Rom文件前期解包时需要通过真机运行时生成的`.xorpad`文件配合解包，也就是[这篇文章](http://www.k73.com/3ds/120261.html)提到的方法，但这种方法操作及其繁琐，几乎所有的文件都需要一个个命令行的进行操作，文件层次较深的话拆解也很麻烦，后来我找到这个更成熟的解包工具[HackingToolkit9DS](https://github.com/Asia81/HackingToolkit9DS-Deprecated-)，可直接一键对`.3ds`、`.cia`文件进行解包，同时也可以对解包文件进行打包，满足了`Rom Hacking`第一步解包和最后一步打包的条件，其实这个工具也是基于[3dstool](https://github.com/dnasdw/3dstool)来对Rom进行批量处理，9DS打开如下:
![9ds](/img/romhack/9ds.png)

根据窗口提示输入`CE`提取`.cia`文件，再输入需要解包的Rom文件名，稍等片刻，Rom所在目录下即生成提取的文件及文件夹，本文以`节奏天国 The Best+`的Rom进行实验，得到的文件大致如下：

```
├── DecryptedDownloadPlay.bin
├── DecryptedExHeader.bin
├── DecryptedExeFS.bin
├── DecryptedManual.bin
├── DecryptedRomFS.bin
├── ExtractedBanner
│   ├── banner.bcwav
│   ├── banner.cbmd
│   ├── banner.cgfx
│   └── banner9.bcmdl
├── ExtractedDownloadPlay
│   └── 0004000100155a00.cia
├── ExtractedExeFS
│   ├── banner.bin
│   ├── code.bin
│   └── icon.bin
├── ExtractedManual
│   └── Manual.bcma
├── ExtractedRomFS
│   ├── __test
│   │   ├── DefaultFragmentLight.bcenv
│   │   └── DefaultSceneEnvironmentSetting.bcenv
│   ├── builddate.txt
│   ├── cellanim
│   │   ├── rvlSort_v0.zlib
│   │   ├── rvlSword_v0.zlib
│   │   ├── rvlWatch_v0.zlib
│   │   ├── slideshow_v0.zlib
│   │   ├── test_v0.zlib
│   │   └── tutorial.zlib
│   ├── common
│   │   └── env_lut_common.zlib
│   ├── effect
│   │   ├── agbQuiz.zlib
│   │   ├── agbRabbit.zlib
│   │   ├── agbTap.zlib
│   │   ├── common.zlib
│   │   ├── ctrBear.zlib
│   │   ├── ctrBlanco.zlib
│   │   ├── ctrChameleon.zlib
│   │   ├── ctrChicken.zlib
│   │   ├── ctrDotSamurai.zlib
│   │   ├── ctrFruitbasket.zlib
│   │   ├── ctrInterpreter.zlib
│   │   ├── ctrSumou.zlib
│   │   ├── ctrTango.zlib
│   │   ├── ctrWoodCat.zlib
│   │   ├── demo_LED.zlib
│   │   ├── goat.zlib
│   │   ├── map_common_gr.zlib
│   │   ├── map_common_sk.zlib
│   │   ├── map_grLED.zlib
│   │   ├── muscleDuel.zlib
│   │   ├── ntrAirBoard.zlib
│   │   ├── ntrBoxShow.zlib
│   │   ├── ntrCameraMan.zlib
│   │   ├── ntrIdol.zlib
│   │   ├── ntrRobot.zlib
│   │   ├── ntrShooting.zlib
│   │   ├── rvlBatting.zlib
│   │   ├── rvlFlea.zlib
│   │   ├── rvlKarate.zlib
│   │   ├── rvlMuscle.zlib
│   │   ├── rvlWatch.zlib
│   │   ├── sample.zlib
│   │   ├── treasure.zlib
│   │   └── tutorial.zlib
│   ├── icon
│   │   ├── icon_cecBox_LZ.bin
│   │   ├── icon_cecMsg_LZ.bin
│   │   └── icon_extSave_LZ.bin
│   ├── layout
│   │   ├── lesson.zlib
│   │   ├── rvlRap.zlib
│   │   ├── title.zlib
│   │   ├── treasure_common.zlib
│   │   ├── treasure_play.zlib
│   │   └── tutorial.zlib
│   ├── message
│   │   ├── Sample.zlib
│   │   └── pajama.zlib
│   ├── model
│   │   ├── ctrTango_long.zlib
│   │   ├── map_gate00.zlib
│   │   ├── map_gate01.zlib
│   │   ├── map_gate02.zlib
│   │   ├── map_gate03.zlib
│   │   ├── map_gateFigure.zlib
│   │   ├── map_gr00.zlib
│   │   ├── map_gr01.zlib
│   │   ├── map_gr02.zlib
│   │   ├── map_gr03.zlib
│   │   ├── map_gr04.zlib
│   │   ├── map_gr05.zlib
│   │   ├── map_gr06grass.zlib
│   │   ├── map_grCommon.zlib
│   │   ├── map_grLED.zlib
│   │   ├── map_mapFigure.zlib
│   │   ├── map_sk00.zlib
│   │   ├── map_sk01.zlib
│   │   ├── map_sk02.zlib
│   │   ├── map_sk03cloud.zlib
│   │   ├── map_skCommon.zlib
│   │   ├── map_skTED.zlib
│   ├── shaders
│   │   ├── CellAnimShader_v00.shbin
│   │   ├── CellAnimShader_v01.shbin
│   │   ├── DefaultShader.bcsdr
│   │   ├── ParticleDefaultShader.bcsdr
│   │   ├── UserRenderCommandShader.shbin
│   │   ├── nwdemo_Common.shbin
│   │   ├── nwfont2_RectDrawerShader.shbin
│   │   ├── nwfont_TextWriterShader.shbin
│   │   ├── nwgfx_DefaultShader.shbin
│   │   ├── nwlyt_ConstColorShader.shbin
│   │   └── nwlyt_PaneShader.shbin
│   ├── sound
│   └── treasure
│       └── treasure_world_data.zlib
├── HeaderExeFS.bin
├── HeaderNCCH0.bin
├── HeaderNCCH1.bin
├── HeaderNCCH2.bin
├── LogoLZ.bin
└── PlainRGN.bin
```
可以看到，提取出来的东西要么是二进制`*.bin`文件，要么是不认识后缀的文件，先不急，我们先来简单分析下这个Rom文件结构，先从根目录看起：
`DecryptedRomFS.bin`：已经解密的`RomFS`二进制文件，也是整个提取文件内容最大的文件，可以断定，游戏相关的所有资源，包括影像、文本都在这里面，那么怎么提取呢，不用担心`HackingToolkit9DS`这个工具已经把内容提取到根目录下的`ExtractedRomFS`文件夹下了，内容如下：
![romfs](/img/romhack/romfs.png)
通过文件夹的名称可以大致推测:

`sound`:游戏的音乐存放文件，就是我们所说的BGM，进去查看，果不其然，`/sound/aac`文件夹下存放了大量可以直接播放的`.aac`文件，文件的内容当然就是游戏里各类音效和音乐了。

`icon`:游戏内使用的各类图标，进去查看发现是几个`.bin`文件，如需查看估计需要解密查看，不过汉化过程不会修改此文件。

`message`和`model`:游戏各类信息和模型，汉化所需文本极大可能在这里，但是进去发现都是清一色的`.zlib`压缩文件，看来得使用其他工具来查看才行

到此，我们基本可以断定，汉化所需的文本、字库资源，都在`romfs`下，其他提取出来的内容文件夹我们暂时可以不用管他们，现在我们还需要一个可以查看`romfs`里面形形色色的压缩文件的工具，从工具里提取我们需要的文本及字库，再进行修改，这就是最终的`Rom Hacking`。

幸运的是，目前github上已经有很成熟的3ds辅助汉化工具[Kuriimu](https://github.com/IcySon55/Kuriimu)，通过Kuriimu，你可以查看romfs内各种各样的压缩文件，并可以直接查看到对应的文本、字库，文本还可以直接进行修改保存，达到直接翻译的目的（前提是字库已经有中文），我们直接使用Kuriimu打开`/ExtractedRomFS/message/pajama,zlib`，可以看到以下内容，可以看到右侧有大量标识为本文，以`.msbt`为后缀的文件：

![romfs](/img/romhack/pajama.png)

选`common.msbt`右键通过Kuriimu自带的`kuriimu`工具打开，左侧区域是游戏内的文本，选择开打，终于看到了熟悉的日文，这下就可以在text区域内进行翻译工作了:

![romfs](/img/romhack/kurrimu.png)

因此可以断定，这个游戏的所有文本都放在`*.msbt`文件中，因此如果觉得`kuriimu`工具不好用，可以自行编写脚本先解压`*.zlib`文件再提取对应的`*.msbt`文件。

<h3>2. 字库扩展</h3>

已经提取了文本，并不是把文本改成中文然后导回Rom就可以直接显示中文，我们还需要在Rom的字库中加入中文。字库通常在`romfs`存放在一个`font`的文件夹中，不同的Rom存放`font`文件夹的位置都不相同，需要我们使用`kuriimu`仔细查找。`节奏天国 The Best+`的`font`文件夹存放在`ExtractedRomFS/layout/**.zlib`中，每个模块都有独立的一个字库，字库的后缀为`*.bffnt`，这里显示有4个字库，每个字体大小对应一个字库：

![romfs](/img/romhack/font.png)

使用`kuriimu`自带的`Kukkii`可以对字库进行查看:

![romfs](/img/romhack/kukkii.png)

Rom自带的字库包含了英文字母、日语平假名、片假名以及部分日语自带的汉字及其他标点符号，显然，这些对于汉化来说是不够用的，需要加入汉语中常用的汉字。

在正式扩展字库前，先简单介绍下字库在Rom中的工作方式。除了`bffnt`格式的字库外，还有`bcfnt`、`bcfna`、`tex`格式的字库，这些字库存储的大致都是位图文件，Rom在运行时，会根据字符去字库查找对应的字符，如在字库里找到了字符，就会在屏幕上显示出来。

其中`bcfnt`格式的字库是最常见的，[这篇文章](http://www.k73.com/3ds/120266.html)使用`Fontconverter`工具进行了详细的操作和介绍，但我们本次需要对`bffnt`字库进行操作，`Fontconverter`是不支持这个格式的，这就需要依赖于[3dstools](https://github.com/ObsidianX/3dstools)来进行操作，[3dstools](https://github.com/ObsidianX/3dstools)同时支持`bffnt`、`bcfnt`、`sarc`几种字库，使用Python进行开发，因此也是跨平台工具。事实上，使用`3dstools`提取一个`bcfnt`字库如下：

```shell
$ python ./bcfnt.py -xf FontLarge.bcfnt
Done!
```

结果会得到一个json文件和一堆png图片：

![romfs](/img/romhack/bcfnt.png)

png图片的内容就是我们刚使用`kukkii`查看的内容一致，json文件内容如下：

```json
{
  "fileType": "cfnt", 
  "fontInfo": {
    "alterCharIdx": 0, 
    "ascent": 16, 
    "defaultWidth": {
      "charWidth": 17, 
      "glyphWidth": 17, 
      "left": 0
    }, 
    "encoding": 1, 
    "fontType": 1, 
    "height": 21, 
    "lineFeed": 21, 
    "width": 17
  }, 
  "glyphMap": {
    " ": 0, 
    "!": 1
    ...
    // 内容省略
  }, 
  "glyphWidths": {
    "0": {
      "char": 5, 
      "glyph": 0, 
      "left": 5
    },
    "1": {
      "char": 15, 
      "glyph": 3, 
      "left": 6
    }, 
    ...
    // 内容省略
  }, 
  "textureInfo": {
    "glyph": {
      "baseline": 16, 
      "height": 21, 
      "width": 17
    }, 
    "sheetCount": 24, 
    "sheetInfo": {
      "colorFormat": "A4", 
      "cols": 7, 
      "height": 512, 
      "rows": 23, 
      "width": 128
    }
  }, 
  "version": 50331648
}
```

json文件记录了字库文件的字体信息，其中最重要的是`glyphMap`和`glyphWidths`这两个字段，这里记录了字库里每个字符的图位信息，这个图位信息和导出的png一一对应，这也是图位字库工作的内部工作原理。事实上，`bffnt`文件和`bcfnt`字库提取出来的json文件内容几乎是一致的，因此，扩展一个`bffnt`字库需要以下步骤：

1. 按照[这篇文章](http://www.k73.com/3ds/120266.html)最后生成一个常用汉字的bcfnt格式的字库，再使用[3dstools](https://github.com/ObsidianX/3dstools)提取bcfnt的json文件和常用汉字的png位图；
2. 使用[3dstools](https://github.com/ObsidianX/3dstools)提取待扩展的`bffnt`字库，将第一步提取的png位图和json中`glyphMap`和`glyphWidths`两个字段内容替换；
3. 重新使用[3dstools](https://github.com/ObsidianX/3dstools)打包生成新的`bffnt`字库，这样一来，新的字库就包含了常用的汉字，将这个新字库使用`Kuriimu`替换`romfs`里对应的字库，要注意不同字号的字库都要做一份，然后不要替换错了，替换错了也可能因为读取异常导致bug。

到这里，使用[HackingToolkit9DS](https://github.com/Asia81/HackingToolkit9DS-Deprecated-)对修改过的Rom进行重新打包，重新打开游戏，可以看到游戏内容已经成功汉化。

**事实上，字库扩展并不是直接粗暴的扩容就可以了，很多Rom都是基于ARM运行的，为了优化性能，Rom本身留给字库读取的空间非常小，一般字库都是在1mb以下，如果扩容的字库超过了1mb，那么在运行游戏时很可能因为读取字库时内存溢出导致黑屏，如果希望Rom能够读取更大的字库，这时候就需要使用ASM Hacking技术来进行扩容，之前很多汉化组都卡在了字库扩容上，有些游戏文本已经翻译完，但是字库问题迟迟没有解决，最后坑的情况也时有发生，可以说字库扩容是整个汉化过程难度最大的一步，关于ASM Hacking，后面我会再写一篇文章进行介绍。**

<h3>3. 结语</h3>

通过上面的实际操作，想必你已经对`Rom Hacking`有了一个初步的了解，`Rom Hacking`其实就是解析Rom的内部结构，然后对Rom进行修改，以达到Rom个性化的目的，需要说的是，不同的Rom解析过程也不一样，因此没有哪些工具是完全通用的，很多东西需要自己开发，因此民间汉化是一个非常繁琐而且累的事。随着现在各游戏厂商渐渐重视中文化，现在也出现了许多官方中文游戏，因此这几年民间汉化组也逐渐解散消失，之前网上流传关于游戏汉化的文章也渐渐销声匿迹，本篇文章也是出于好奇的目的对之前的民间汉化技术进行探索，希望能够作为一个科普文章让大家了解之前民间汉化的具体工作，也以此文致敬已经解散的或者还在矜矜业业免费服务广大玩家的民间汉化组！

(完)