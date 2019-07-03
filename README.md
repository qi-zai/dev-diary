# 我的前端重修之路 - 目录

## 1. HTML

### 1.1 你不知道的HTML

#### 1.1.1 html语义化的重要性

- 正确的标签做正确的事情
- 页面内容结构化
- 无CSS样子时也容易阅读，便于阅读维护和理解
- 便于浏览器、搜索引擎解析。 利于爬虫标记、利于SEO

**html语义化标签包括 body, article, nav, aside, section, header, footer, hgroup, 还有 h1-h6 address等。**

**header**
> header代表“网页”或者“section”的页眉，通常包含h1-h6 元素或者 hgroup,作为整个页面或者一个内容快的标题。也可以包裹一节的目录部分，一个搜索框，一个nav，或者相关logo。

注意事项：
1. 可以是“网页”或者任意“section”的头部部分
2. 没有个数限制
3. 如果hgroup或者h1-h6自己就能工作得很好，那么就没必要用header。

**hgroup 元素**
> hgroup 元素代表“网页”或“section”的标题，当元素有多个层级时，该元素可以将h1到h6元素放在其内，譬如文章的主标题和副标题组合

注意事项：
1. 如果只需要一个h1-h6标签就不用hgroup
2. 如果有连续多个h1-h6标签就用hgroup
3. 如果有连续多个标题和其他文章数据，h1-h6标签就用hgroup包住，和其他文章元数据一起放入header标签

**footer 元素**
> footer元素代表“网页”或任意“section”的页脚，通常含有该节的一些基本信息，譬如：作者，相关文档链接，版权资料。如果footer元素包含了整个节，那么它们就代表附录，索引，提拔，许可协议，标签，类别等一些其他类似信息。

注意事项：
1. 可以是“网页”或者任意“section”的底部部分
1. 没有个数限制，除了包裹的内容不一样，其他跟header类似

**nav 元素**
> **nav 元素代表页面的导航链接区域。**</br>用于定义页面的主要导航部分。
侧边栏上目录、面包屑导航、搜索样式、或者下一篇上一篇文章我们可能会想要用到nav，但是事实上规范上说nav只能用在页面主要导航部分上。页脚区域中的链接列表，虽然指向不同网站的不同区域，譬如服务条款，版权页等，这些footer元素就能够用了。

注意事项：
1. 用于整个页面的主要导航部分，不适合就不要用nav元素了

**article 元素**
> article 代表一个在文档，页面或者网站中自成一体的内容，其目的是为了让开发者独立开发或重用。除了它的内容，article会有一个标题(通常会在header里)，一个footer页脚。

> article 内部可以嵌套article，表示评论或者其他跟文章有关联的内容。article内部还可以嵌套section

> 文章内section是独立的部分，但是它们只能算是组成整体的一部分，从属关系，article是大主体，section是构成这个大主体的一个部分。

注意事项：
1. 自身独立情况下：用article
2. 是相关内容： 用section
3. 没有语义的： 用div

**section 元素**
> section 元素代表文档中的“节”或“段”，“段”可以是指一片文章里按照主题的分段；“节”可以是指一个页面里的分组。section通常还带标题，虽然html5中section会自动给标题h1-h6降级，但是最好手动给他们降级。

注意事项：
1. 一张页面可以用section划分为简介、文章条目和联系信息。不过在文章内页，最好用article。section不是一般意义上的容器元素，如果想作为样式展示和脚本的便利，可以用div。
2. 表示文档中的节或者段。
3. acticle、nav、aside可以理解为特殊的section，如果可以用article、nav、aside就不要用section，没有实际意义的就用div

**aside元素**
> aside 元素被包含在article元素中作为主要内容的附属信息部分，其中的内容可以是与当前文章有关的相关资料，标签，名词解释等。
在article元素之外使用作为页面或站点全局的附属信息部分。最典型的是侧边栏，其中的内容可以是日志串连，其他组的导航，甚至广告，这些内容相关的页面。

注意事项：
1. aside 在 article 内表示主要内容的附属信息。
2. 在article之外侧可以做侧边栏，没有article与之对应，最好不用
3. 如果是广告，其他日志链接或者其他分类导航也可以用。

**html语义化小结**
1. HTML语义化是反对大篇幅使用无语义化的div+span+class，而鼓励使用HTML定义好的语义化标签。
2. 如需兼容低版本的IE浏览器，比如说IE8以及以下，需考虑一些HTML5标签兼容性解决方案。

#### 1.1.2 利用image测试网速
#### 1.1.3 css远程攻击漏洞
#### 1.1.4 iframe对远程localStorage

### 1.2 语音合成

```
let msg = new SpeechSynthesisUtterance("今天的温度达到了30℃");
window.speechSynthesis.speak(msg);
```

SpeechSyntehesisUtteranc

参考：https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance

SpeechSynthesis

参考：https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis

### 1.3 Audio API

**概念：**
首先要明确一个概念 HTML5 Web Audio API 并不是 HTML \<audio> 标签
> Web Audio API 提供了一个功能强大的多功能系统，用于控制Web上的音频，允许开发人员选择音频源，添加音频效果，创建音频可视化，应用空间效果（如平移）等等。 ——摘自 MDN

### 1.4 HTML文档头部与元数据

head 大部分内容是不可见的，除了 title 和 图标之外。head 中可以包含的标签有 base，title，script，style，link，meta

==**重点：meta**==

**注意：** name 是一种相对更加自由的约定，http 标准规定了一些 name 作为大家使用的共识，同时也鼓励开发者发明自己的 name 使用。

name | content | 作用
---|---|---
keywords    | 字符串        | 设置网页的关键词有利于SEO
description | 字符串        | 用一段文字描述网页，有利于SEO
generator   | 字符串        | 说明使用的编辑器
author      | 字符串        | 说明作者信息
robots      | All/Index/Nofollow/Noindex/None   | 页面可被搜索引擎搜索的情况
copyright   | 字符串        | 版权信息
application-name | 字符串   | 应用名称
viewport    | width，height，inital-scale，minimum-scale，maximum-scale，user-scalable | 决定页面的大小和缩放
referrer    | never/always/origin/default       | 跳转策略，有助于安全性


## 二. CSS
## 三. javascript
## 四. 计算机基础
## 五. 设计模式
## 数据结构和算法
## 浏览器相关
## TypeScript
## NodeJS
## 框架和类库
## 前端性能优化与工程化
## javascript图形学和H5游戏
## 前端跨端
## 网络安全
## Linux
## PHP和MariaDB
## nginx