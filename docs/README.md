# Yarn 和 NPM 设置快速镜像 - 淘宝镜像

> 开发笔记


## 当前镜像

```sh
# npm
npm get registry

# yarn
yarn config get registry
```

## 设置淘宝镜像

```sh
# npm
npm config set registry https://registry.npm.taobao.org/

# yarn
yarn config set registry https://registry.npm.taobao.org/

```

## 设置官方镜像

```sh
# npm
npm config set registry https://registry.npmjs.org/

# yarn
yarn config set registry https://registry.npm.taobao.org/

```
