module.exports = {
	bufferName: "Buffer1",  // 修改buffer点的名称 Buffer1， Buffer2
	combinFlag: "-",
	annealDegree: 300,		 // 起始退火温度
	annealFactor: 0.98,    //
	iteratorTimes: 80,
	stopTime: 400,
	digital: 2,   // 不用管
	timeIndex: 1, // 时间系数
	volueDivideTimeIndex: 1, // 量／时间系数
	safeIndex: 1, // 安全系数
}
