# 我的前端重修之路 - 目录

## 1. HTML

### 1.1 你不知道的HTML

#### 1.1.1 html语义化的重要性

- 正确的标签做正确的事情
- 页面内容结构化
- 无CSS样子时也容易阅读，便于阅读维护和理解
- 便于浏览器、搜索引擎解析。 利于爬虫标记、利于SEO

#### 1.1.2 利用image测试网速
#### 1.1.3 css远程攻击漏洞
#### 1.1.4 iframe对远程localStorage

### 1.2 语音合成

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