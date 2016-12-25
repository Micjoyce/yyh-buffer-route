let _ = require('lodash')
let config = require('./config');

module.exports = {
	// 退火算法规则
	// 按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
	annealAlgorithm(finalResult, annealResult, initResult, degree) {
		if (!finalResult.time) {
			return console.log(`annealAlogrithm Error: finalResult:${finalResult}`)
		}
		if (!annealResult || !annealResult.time) {
			// return finalResult;
			return JSON.parse(JSON.stringify(finalResult));
		}
		// 如果这一次的计算结果好，则使用此次的计算结果
		let self = this;
		if (finalResult.time <= annealResult.time) {
			console.log(finalResult)
			return JSON.parse(JSON.stringify(finalResult));;
		} 
		// // 如果此次比之前的结果大，就按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
		// let powNum = -(finalResult.time - annealResult.time)/degree;
		// let chancePercent = Math.pow(Math.E, powNum);
		// let acceptFinaResult = self.acceptChance(chancePercent);
		// if (acceptFinaResult) {
		// 	return finalResult;
		// }
		return JSON.parse(JSON.stringify(annealResult));;
	},
	// 以一定的概率接受
	acceptChance(chancePercent){
		if (!chancePercent && chancePercent !== 0) {
			console.log(`acceptChance: chancePercent${chancePercent}`);
		}
		let randomNum = Math.random();
		if (chancePercent < randomNum) {
			return true;
		}
		return false;
	},
	stopDirection(timeSerie) {
		let stopTime = config.stopTime;
		if (!_.isArray(timeSerie)) {
			return console.log("stopDirection Error, timeSerie: ${timeSerie}");
		}
		if (timeSerie.length < stopTime) {
			return true;
		}
		let stop = false;
		let seire = _.takeRight(timeSerie, config.stopTime);
		let initArr = seire[0];
		for (let i = 1; i < seire.length; i++) {
			let time = seire[i];
			if (initArr === time) {
				stop = false;
			} else {
				stop = true;
			}
			if (stop === true) {
				return true;
				break;
			}
		}
		return false;
	}
}
