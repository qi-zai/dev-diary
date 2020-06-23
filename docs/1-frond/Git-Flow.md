# git flow

## git 基础

### 合并(merge)

将一个分支的修改融入到当前分支

```sh
# 合并后没有记录
git merge fast-forward(--ff) -m '...'

# 进行 commit 压缩
–squash

# 禁用 fast-forward 模式
git merge no-fast-foward(--no-ff) -m '...'

```

### 合并冲突
```sh
git merge dev

# 出现冲突，解决后。。。

git add .
git commit -m '...'

```

### 重置(reset)

