### ITELLYOU 服务端渲染

使用umijs ssr进行服务端渲染

### 开发
需要启动 itellyou / itellyou-api 两个项目
确保 itellyou 项目下 dist 目录有 umi.server.js 存在（会自动生成，每次更改完 itellyou 项目这边需要重启重新读取这个文件）
执行命令
```
yarn start
```

### 部署
在 itellyou build 完成后，把dist目录复制到 itellyou-ssr 项目dist目录中
上传服务器后
执行命令
```
yarn prod
```