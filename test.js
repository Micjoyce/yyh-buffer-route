'use strict';

let count = 5;
while(count > 0) {
	count --;
	if (count === 3) {
		continue;
	}
	console.log(count)
}