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
// 往buffer运输的车辆: 
[ { carCode: 'S2-A-1',
    type: 'A',
    load: 9,
    ownerSupply: 'Supply2',
    routes: [],
    goBuffer: true,
    goBufferTime: 28.8,
    bufferName: 'Buffer1' },
  { carCode: 'S1-A-3',
    type: 'A',
    load: 9,
    ownerSupply: 'Supply2',
    routes: [],
    goBuffer: true,
    goBufferTime: 28.8,
    bufferName: 'Buffer1' } ]
// 需要去buffer的车辆: 
[ { carCode: 'S1-A-1',
    type: 'A',
    load: 9,
    ownerSupply: 'Supply1',
    routes: [ 'P8', 'P6' ],
    arrives: [ 'Supply1', 'P8', 'Buffer1', 'P8', 'P6', 'Buffer1', 'P6' ],
    perPointVolume: [ 9, 5, 4, 4 ],
    volume: 0,
    supVolume: 22,
    notEnough: 0,
    lastFinshPoint: 'P6',
    bufferNeedVolumes: [ 9, 4 ],
    waitTimes: [ 46.7, 87.5 ] },
  { carCode: 'S1-B-1',
    type: 'B',
    load: 7.2,
    ownerSupply: 'Supply1',
    routes: [ 'P2' ],
    arrives: [ 'Supply1', 'P2', 'Buffer1', 'P2' ],
    perPointVolume: [ 7.2, 1.7999999999999998 ],
    volume: 0,
    supVolume: 9,
    notEnough: 0,
    lastFinshPoint: 'P2',
    bufferNeedVolumes: [ 1.7999999999999998 ],
    waitTimes: [ 0 ] },
  { carCode: 'S1-C-1',
    type: 'C',
    load: 6.3,
    ownerSupply: 'Supply1',
    routes: [ 'P11', 'P4' ],
    arrives: [ 'Supply1', 'P11', 'Buffer1', 'P11', 'P4', 'Buffer1', 'P4' ],
    perPointVolume: [ 6.3, 4.7, 1.5999999999999996, 5.4 ],
    volume: 0,
    supVolume: 18,
    notEnough: 0,
    lastFinshPoint: 'P4',
    bufferNeedVolumes: [ 6.3, 5.4 ],
    waitTimes: [ 44.400000000000006, 78.6 ] },
  { carCode: 'S2-C-1',
    type: 'C',
    load: 6.3,
    ownerSupply: 'Supply2',
    routes: [ 'P10', 'P1' ],
    arrives: 
     [ 'Supply2',
       'P10',
       'Buffer1',
       'P10',
       'P1',
       'Buffer1',
       'P1',
       'Buffer1',
       'P1' ],
    perPointVolume: [ 6.3, 0.7000000000000002, 5.6, 6.3, 1.1000000000000005 ],
    volume: 0,
    supVolume: 20,
    notEnough: 0,
    lastFinshPoint: 'P1',
    bufferNeedVolumes: [ 6.3, 6.3, 1.1000000000000005 ],
    waitTimes: [ 0, 82.6, 61 ] },
  { carCode: 'S2-C-2',
    type: 'C',
    load: 6.3,
    ownerSupply: 'Supply2',
    routes: [ 'P5', 'P3' ],
    arrives: [ 'Supply2', 'P5', 'P3', 'Buffer1', 'P3' ],
    perPointVolume: [ 3, 3.3, 1.7000000000000002 ],
    volume: 0,
    supVolume: 8,
    notEnough: 0,
    lastFinshPoint: 'P3',
    bufferNeedVolumes: [ 1.7000000000000002 ],
    waitTimes: [ 0 ] },
  { carCode: 'S1-B-2',
    type: 'A',
    load: 7.2,
    ownerSupply: 'Supply2',
    routes: [ 'P7' ],
    arrives: [ 'Supply2', 'P7', 'Buffer1', 'P7', 'Buffer1', 'P7' ],
    perPointVolume: [ 7.2, 7.2, 1.6000000000000005 ],
    volume: 0,
    supVolume: 16,
    notEnough: 0,
    lastFinshPoint: 'P7',
    bufferNeedVolumes: [ 7.2, 1.6000000000000005 ],
    waitTimes: [ 0, 42.7 ] } ]
// 不需要去buffer的车辆: 
[ { carCode: 'S1-A-2',
    type: 'A',
    load: 9,
    ownerSupply: 'Supply1',
    routes: [ 'P9' ],
    arrives: [ 'Supply1', 'P9' ],
    perPointVolume: [ 6 ],
    volume: 3,
    supVolume: 6,
    notEnough: 0,
    lastFinshPoint: 'P9',
    bufferNeedVolumes: [] } ]
{ time: 97.2,
  points: 
   [ { pCode: 'P1', carCode: 'S2-C-1', step: 2 },
     { pCode: 'P2', carCode: 'S1-B-1', step: 1 },
     { pCode: 'P3', carCode: 'S2-C-2', step: 2 },
     { pCode: 'P4', carCode: 'S1-C-1', step: 2 },
     { pCode: 'P5', carCode: 'S2-C-2', step: 1 },
     { pCode: 'P6', carCode: 'S1-A-1', step: 2 },
     { pCode: 'P7', carCode: 'S1-B-2', step: 1 },
     { pCode: 'P8', carCode: 'S1-A-1', step: 1 },
     { pCode: 'P9', carCode: 'S1-A-2', step: 1 },
     { pCode: 'P10', carCode: 'S2-C-1', step: 1 },
     { pCode: 'P11', carCode: 'S1-C-1', step: 1 } ],
  volueDivideTime: 2.5748308877051014,
  safeIndex: 0.6142203730944,
  calcResult: 94.0109487392005 }

```