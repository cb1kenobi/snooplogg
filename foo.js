var stream = require('stream');

class MyStream extends stream.Duplex {
	read() {
	}

	write() {
		//
	}
}

var m = new MyStream();
m.write('hi');

m.pipe(process.stdout);

// var size = 100;
// var start = 90;
// var end = 10;
// var buffer = [];
//
// for (var i = 0; i < size + 10; i++) {
// 	buffer[i%size] = 'a' + i;
// }
//
// var value = 20;
//
// if (end >= value) {
// 	var x = Math.max(end - value, 0);
// 	buffer = buffer.slice(x, x + Math.min(value, end, buffer.length));
// } else {
// 	var x = buffer.length - Math.min(buffer.length - start, value - end);
// 	buffer = buffer.slice(x).concat(buffer.slice(Math.max(end - value, 0), Math.min(value, end, buffer.length)));
// }
//
// // var x = buffer.length - Math.min(buffer.length - start, value);
// // console.log(buffer.length - x, value);
// // if (buffer.length - x <= value) {
// // 	buffer = buffer.slice(x);
// // } else {
// // 	console.log(buffer.slice(x));
// // 	//buffer = buffer.slice(Math.min(buffer.length - start, value - x)).concat(buffer.slice(x, end));
// // }
//
// console.log(buffer);
// console.log(buffer.length);
