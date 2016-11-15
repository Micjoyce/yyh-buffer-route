# 根据给定的解计算出路径所需要的时间

## 运行环境安装

### 安装 nodejs 

### 安装git

## 下载代码到本地中
在bash或者terminal中输入

```shell
git clone git@github.com:Micjoyce/yyh-buffer-route.git

```

安装npm包(可以切换npm源到[阿里镜像](https://npm.taobao.org/))

```shell
cd yyh-buffer-route
npm install
```

运行程序

```shell
	node index
```

在控制台查看结果，如下所示:

```javascript
{ time: 0,
  points: 
   [ { pCode: 'P1', carCode: 'S2-C-1', step: 1 },
     { pCode: 'P2', carCode: 'S1-A-2', step: 2 },
     { pCode: 'P3', carCode: 'S1-A-1', step: 1 },
     { pCode: 'P4', carCode: 'S2-C-2', step: 1 },
     { pCode: 'P5', carCode: 'S1-B-1', step: 3 },
     { pCode: 'P6', carCode: 'S1-A-2', step: 1 },
     { pCode: 'P7', carCode: 'S2-A-1', step: 1 },
     { pCode: 'P8', carCode: 'S1-B-1', step: 1 },
     { pCode: 'P9', carCode: 'S1-A-1', step: 3 },
     { pCode: 'P10', carCode: 'S1-A-1', step: 2 },
     { pCode: 'P11', carCode: 'S1-B-1', step: 2 } ],
  degree: 208 }
```