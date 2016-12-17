'use strict';
let _ = require('lodash')
let utils = require('./utils');
let ANutils = require('./annealAlgorithm');
let config = require('./config');
let supPoints = require('./supPoints');
let stopTime = config.stopTime;

// 配置环境数据
console.log(`---------------buffer点:${config.bufferName}------------------`);
console.log(`---------------起始退火温度:${config.annealDegree}------------------`);
console.log(`---------------退火系数:${config.annealFactor}------------------`);
console.log(`---------------迭代次数:${config.iteratorTimes}------------------`);
console.log(`---------------相同次数:${config.stopTime}------------------`);




// 路程数据需要定时给出的
let disCsvName = './distances.csv';
let safeindexesFile = './safeindexes.csv';

// 基本配置文件
let bufferName = config.bufferName;

let superLogResult = {};
let countTest = {
  a: 1
}
let allResult = {};
utils.csvToJsonTwo(safeindexesFile, function(err, joinIndexes) {
    // console.log(joinIndexes);
    let safeIndexes = utils.initPointDistance(joinIndexes);
    utils.csvToJson(disCsvName, function(err, jsonDis) {
        // 初始化距离数据
        let distances = utils.initPointDistance(jsonDis);

        // 生成随机解
        // initResult可以动态给定达到优化的过程
        let initResult = require('./initResult');


        let finalResult = {};
        let lastTimeResult = {};
        let changeDegreeCount = 0;
        let loopFlag = true;
        let annealDegree = config.annealDegree;
        // 根据初始解进行迭代
        // for (let i = 0; i < config.iteratorTimes; i++) {
        while (loopFlag) {
            // initCars,initResult,points可以动态给定达到优化的过程
            let initCars = require('./cars');

            let points = require('./points');
                // initallCars
            initCars.forEach(function(car) {
                delete car.goBuffer;
                delete car.bufferName;
                delete car.goBufferTime;
                delete car.routes;
                delete car.arrives;
                delete car.volume;
                delete car.supVolume;
                delete car.notEnough;
                delete car.lastFinshPoint;
                delete car.bufferNeedVolumes;
                delete car.waitTimes;
                delete car.perPointVolume;
            });
            // console.log(initCars);
            // 退后算法规则
            // 初始退火温度为 260
            // 1、连续达到一定n(7)次结果相同则停止
            // 2、按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
            let annealResult;
            if (finalResult.points && lastTimeResult.points) {
                changeDegreeCount++;
                // 退火算法
                if (annealResult) {
                    annealResult = ANutils.annealAlgorithm(finalResult, annealResult, initResult, annealDegree)
                } else {
                    annealResult = ANutils.annealAlgorithm(finalResult, lastTimeResult, initResult, annealDegree)
                }
                console.log(finalResult.time, lastTimeResult.time, annealResult.time);
                // finalResult = annealResult;
                // console.log(annealResult.time)

                // 停止判断
                if (stopTime <= 0) {
                    // 输出最终结果 程序将结束运行
                    loopFlag = false;
                    allResult = annealResult;
                    allResult.degree = annealDegree;
  					console.log('往buffer运输的车辆:', superLogResult.bufferCars);
  					console.log('需要去buffer的车辆:', superLogResult.fixWaitTimeForGoToBufferCars);
  					console.log('不需要去buffer的车辆:', superLogResult.noBufferCars)
  					console.log('--------------------finnal result---------------------');
  					console.log(allResult);
                    return;
                }
                // 改变退火温度
                if (loopFlag) {
                    if (changeDegreeCount >= config.iteratorTimes) {
                        annealDegree = annealDegree * config.annealFactor;
                        changeDegreeCount = 0;
                        // 如果退火一次将次数递减一下
                        stopTime--;
                        // 输出迭代次数
                        if (stopTime % 50 === 0) {
                            console.log(`迭代次数: ${stopTime}`);
                        }
                    }
                    console.log(annealResult.points)
                    initResult = utils.iterationResult(annealResult.points, initCars);
                    while (_.uniq(_.map(initResult, "carCode")).length === initCars.length) {
                        initResult = utils.iterationResult(annealResult.points, initCars);
                    }
                }
            } else {
                // 前两次不进行退火迭代
                initResult = utils.iterationResult(initResult, initCars);
            }
            // init cars route,设置各车所要走的路径
            let cars = utils.initCarsRoutes(initCars, initResult);
            // console.log(initCars, '------------')
            let pointCars = _.filter(cars, function(car) {
                return !car.goBuffer;
            });
            let bufferCars = _.filter(cars, function(car) {
                return car.goBuffer;
            });
            // 找出所有车的路径
            let goCars = utils.findWays(points, pointCars, distances);

            // 找出没有到过buffer的cars
            let noBufferCars = _.filter(goCars, function(car) {
                return car.arrives.indexOf(bufferName) === -1;
            });
            // 找出没有到过buffer的cars
            let hasGoToBufferCars = _.filter(goCars, function(car) {
                return car.arrives.indexOf(bufferName) !== -1;
            });
            // console.log(noBufferCars.length, hasGoToBufferCars.length, goCars.length, pointCars.length, bufferCars.length);
            // 获取到达buffer的routes数组，并按照升序排序
            let carBufferRoutes = utils.getBuffersByCar(hasGoToBufferCars, distances);

            // 判断是否都是从一个点运输供给给buffer点，如果是的话，需要做判断，在做getneefrombuffer是需要做一个判断，是否本点有这些量
            let isAllFromOneSupPoint = utils.isAllFromOneSupPoint(bufferCars);
            // 如果都是从同一个节点出来的则需要判断是否能满足所有的bufferneedvolume
            let canSupForBuffer = true;
            if (isAllFromOneSupPoint.flag) {
                canSupForBuffer = utils.getTotalBufferNeedVolume(carBufferRoutes, isAllFromOneSupPoint.supPointNames[0]);
            }
            // 如果不能满足到达buffer的点，进行下一次迭代
            if (canSupForBuffer) {
                // 开始计算各车到buffer的时间序列
                // buffer 点的处理
                let fixedBufferRoutes = utils.fixedBufferRoutes(carBufferRoutes, bufferCars, distances);
                // 将各个buffer的等待时间添加大 hasGoToBufferCars 对象中

                let fixWaitTimeForGoToBufferCars = utils.fixWaitTimeForGoToBufferCars(hasGoToBufferCars, fixedBufferRoutes);
                // 数据结构
                // { carCode: 'S1-A-1',
                // type: 'A',
                // load: 9,
                // ownerSupply: 'Supply1',
                // routes: [ 'P5', 'P3', 'P1' ],
                // arrives: [ 'Supply1', 'P5', 'P3', 'P1', 'Buffer1', 'P1', 'Buffer1', 'P1' ],
                // volume: 0,
                // supVolume: 21,
                // notEnough: 0,
                // lastFinshPoint: 'P1',
                // bufferNeedVolumes: [ 9, 3 ],
                // waitTimes: [ 0.29999999999999716, 0 ] }
                // 输出结果，计算出总时间, 总时间只和需要达到受灾点的时间有关。
                // console.log(_.map(fixWaitTimeForGoToBufferCars, "arrives"));

                let maxTime = Number(utils.getMaxTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances, loopFlag).toFixed(config.digital));
                // 量除于时间
                allResult.volueDivideTime = utils.calcVolumeExceptTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances);
                 // 危险性

                allResult.safeIndex = utils.calcSafeIndexes(fixWaitTimeForGoToBufferCars, noBufferCars, safeIndexes);

                // 输出结果
                /*
                { time: 153,				// 时间
                  points:
                   [ { pCode: 'P1', carCode: 'S2-A-1', step: 1 },
                     { pCode: 'P2', carCode: 'S2-A-1', step: 2 },
                     { pCode: 'P3', carCode: 'S1-A-1', step: 1 },
                     { pCode: 'P4', carCode: 'S1-A-1', step: 2 },
                     { pCode: 'P5', carCode: 'S1-B-1', step: 1 },
                     { pCode: 'P6', carCode: 'S2-C-1', step: 1 },
                     { pCode: 'P7', carCode: 'S1-C-1', step: 1 },
                     { pCode: 'P8', carCode: 'S2-C-1', step: 2 },
                     { pCode: 'P9', carCode: 'S1-A-1', step: 3 },
                     { pCode: 'P10', carCode: 'S1-A-1', step: 4 },
                     { pCode: 'P11', carCode: 'S1-A-2', step: 1 } ],
                  degree: 0.09280075974171312,  	// 退火最终温度
                  volueDivideTime: 2.3632984684240497, // 累计量除于时间
                  safeIndex: 0.5515906236750001, // 最小安全系数
                  calcResult: 150.08511090790094 } // 最终计算结果  时间 ＊ 系数 － 量比指数和 ＊ 系数 － 安全指数 ＊ 系数
                 */
                allResult.calcResult = allResult.time * config.timeIndex - allResult.volueDivideTime * config.volueDivideTimeIndex - allResult.safeIndex * config.safeIndex;

                // 退火算法赋值
                lastTimeResult.time = finalResult.time;
                finalResult.time = maxTime;

                lastTimeResult.points = finalResult.points;
                finalResult.points = initResult;

                superLogResult.bufferCars = bufferCars;
                superLogResult.fixWaitTimeForGoToBufferCars = fixWaitTimeForGoToBufferCars;
                superLogResult.noBufferCars = noBufferCars;
            }
        }
    });
});
